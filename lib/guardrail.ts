import { CATALOG, Product } from "./catalog";

const MAX_DISCOUNT_PERCENTAGE = 15;
const MAX_ORDER_VALUE_INR = 50000;

export interface AuditStep {
  ruleId: string;
  description: string;
  passed: boolean;
  metadata: Record<string, unknown>;
}

export interface GuardrailEvaluation {
  status: "PASSED" | "BLOCKED";
  reason: string;
  product?: Product;
  evaluatedUnitPrice?: number;
  evaluatedQuantity?: number;
  totalAmountPaise?: number;
  auditTrail: AuditStep[];
}

export function evaluateOrderBoundaries(
  productIdOrSku: string,
  proposedUnitPrice: number,
  quantity: number
): GuardrailEvaluation {
  const auditTrail: AuditStep[] = [];
  const cleanId = (productIdOrSku || "").trim().toLowerCase();
  const product = CATALOG.find(
    (p) => p.id.toLowerCase() === cleanId || p.sku.toLowerCase() === cleanId
  );

  // 1. SKU Check
  if (!product) {
    auditTrail.push({
      ruleId: "RULE_SKU_EXISTS",
      description: "Verify product exists in active catalog",
      passed: false,
      metadata: { requestedIdentifier: productIdOrSku },
    });
    return {
      status: "BLOCKED",
      reason: `Product '${productIdOrSku}' is not recognized in catalog.`,
      auditTrail,
    };
  }

  auditTrail.push({
    ruleId: "RULE_SKU_EXISTS",
    description: "Verify product exists in active catalog",
    passed: true,
    metadata: { foundSku: product.sku, name: product.name },
  });

  // 2. Stock Check
  const hasStock = quantity > 0 && quantity <= product.stock;
  auditTrail.push({
    ruleId: "RULE_STOCK_AVAILABLE",
    description: "Verify requested inventory quantity is available",
    passed: hasStock,
    metadata: { requested: quantity, available: product.stock },
  });

  if (!hasStock) {
    return {
      status: "BLOCKED",
      reason: `Quantity ${quantity} exceeds inventory (${product.stock} units).`,
      product,
      auditTrail,
    };
  }

  // 3. Price Floor Check
  const meetsFloor = proposedUnitPrice >= product.floorPrice;
  auditTrail.push({
    ruleId: "RULE_PRICE_FLOOR",
    description: "Verify unit price satisfies merchant floor price",
    passed: meetsFloor,
    metadata: {
      proposedPrice: proposedUnitPrice,
      floorPrice: product.floorPrice,
      basePrice: product.price,
    },
  });

  if (!meetsFloor) {
    return {
      status: "BLOCKED",
      reason: `Price ₹${proposedUnitPrice} is below allowed floor price of ₹${product.floorPrice}.`,
      product,
      auditTrail,
    };
  }

  // 4. Max Discount Check
  const discountPct = ((product.price - proposedUnitPrice) / product.price) * 100;
  const isDiscountValid = discountPct <= MAX_DISCOUNT_PERCENTAGE;
  auditTrail.push({
    ruleId: "RULE_MAX_DISCOUNT_CEILING",
    description: `Ensure discount does not breach maximum cap (${MAX_DISCOUNT_PERCENTAGE}%)`,
    passed: isDiscountValid,
    metadata: {
      calculatedDiscountPct: parseFloat(discountPct.toFixed(2)),
      maxAllowedPct: MAX_DISCOUNT_PERCENTAGE,
    },
  });

  if (!isDiscountValid) {
    return {
      status: "BLOCKED",
      reason: `Discount of ${discountPct.toFixed(1)}% exceeds maximum allowable ${MAX_DISCOUNT_PERCENTAGE}%.`,
      product,
      auditTrail,
    };
  }

  // 5. Order Value Cap Check
  const totalAmountINR = proposedUnitPrice * quantity;
  const withinCap = totalAmountINR <= MAX_ORDER_VALUE_INR;
  auditTrail.push({
    ruleId: "RULE_MAX_ORDER_CAP",
    description: "Verify total transaction does not exceed session risk cap",
    passed: withinCap,
    metadata: { totalINR: totalAmountINR, maxCapINR: MAX_ORDER_VALUE_INR },
  });

  if (!withinCap) {
    return {
      status: "BLOCKED",
      reason: `Total ₹${totalAmountINR} exceeds safety cap of ₹${MAX_ORDER_VALUE_INR}.`,
      product,
      auditTrail,
    };
  }

  return {
    status: "PASSED",
    reason: "Transaction approved under all bounding rules.",
    product,
    evaluatedUnitPrice: proposedUnitPrice,
    evaluatedQuantity: quantity,
    totalAmountPaise: Math.round(totalAmountINR * 100),
    auditTrail,
  };
}