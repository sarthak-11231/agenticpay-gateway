import crypto from "crypto";
import { CATALOG, ACTIVE_POLICY, Product, MerchantPolicy } from "./catalog";

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
  cryptographicDigest?: string;
  policySnapshot: MerchantPolicy;
}

export function evaluateOrderBoundaries(
  productIdOrSku: string,
  proposedUnitPrice: number,
  quantity: number,
  buyerAgentId: string = "agent_buyer_default"
): GuardrailEvaluation {
  const auditTrail: AuditStep[] = [];
  const cleanId = (productIdOrSku || "").trim().toLowerCase();
  const product = CATALOG.find(
    (p) => p.id.toLowerCase() === cleanId || p.sku.toLowerCase() === cleanId
  );

  const policy = { ...ACTIVE_POLICY };

  // 1. SKU Existence Check
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
      policySnapshot: policy,
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
      policySnapshot: policy,
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
      policySnapshot: policy,
    };
  }

  // 4. Max Discount Percentage Check
  const discountPct = ((product.price - proposedUnitPrice) / product.price) * 100;
  const isDiscountValid = discountPct <= policy.maxDiscountPercentage;
  auditTrail.push({
    ruleId: "RULE_MAX_DISCOUNT_CEILING",
    description: `Ensure discount does not breach maximum cap (${policy.maxDiscountPercentage}%)`,
    passed: isDiscountValid,
    metadata: {
      calculatedDiscountPct: parseFloat(discountPct.toFixed(2)),
      maxAllowedPct: policy.maxDiscountPercentage,
    },
  });

  if (!isDiscountValid) {
    return {
      status: "BLOCKED",
      reason: `Discount of ${discountPct.toFixed(1)}% exceeds maximum allowable ${policy.maxDiscountPercentage}%.`,
      product,
      auditTrail,
      policySnapshot: policy,
    };
  }

  // 5. Max Order Value Risk Cap Check
  const totalAmountINR = proposedUnitPrice * quantity;
  const withinCap = totalAmountINR <= policy.maxOrderValueINR;
  auditTrail.push({
    ruleId: "RULE_MAX_ORDER_CAP",
    description: "Verify total transaction does not exceed session risk cap",
    passed: withinCap,
    metadata: { totalINR: totalAmountINR, maxCapINR: policy.maxOrderValueINR },
  });

  if (!withinCap) {
    return {
      status: "BLOCKED",
      reason: `Total ₹${totalAmountINR} exceeds safety cap of ₹${policy.maxOrderValueINR}.`,
      product,
      auditTrail,
      policySnapshot: policy,
    };
  }

  // Generate SHA-256 HMAC digest for Agent non-repudiation
  const hmacSecret = process.env.RAZORPAY_KEY_SECRET || "default_hmac_secret";
  const rawPayload = `${buyerAgentId}:${product.sku}:${proposedUnitPrice}:${quantity}:${Date.now()}`;
  const cryptographicDigest = crypto
    .createHmac("sha256", hmacSecret)
    .update(rawPayload)
    .digest("hex");

  return {
    status: "PASSED",
    reason: "Transaction approved under all bounding rules.",
    product,
    evaluatedUnitPrice: proposedUnitPrice,
    evaluatedQuantity: quantity,
    totalAmountPaise: Math.round(totalAmountINR * 100),
    auditTrail,
    cryptographicDigest,
    policySnapshot: policy,
  };
}