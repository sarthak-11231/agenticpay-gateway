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
  bundleProduct?: Product;
  evaluatedUnitPrice?: number;
  evaluatedQuantity?: number;
  totalAmountPaise?: number;
  isBundle?: boolean;
  auditTrail: AuditStep[];
  cryptographicDigest?: string;
  policySnapshot: MerchantPolicy;
}

export function evaluateOrderBoundaries(
  productIdOrSku: string,
  proposedUnitPrice: number,
  quantity: number,
  buyerAgentId: string = "agent_buyer_default",
  bundleSku?: string,
  bundlePrice?: number
): GuardrailEvaluation {
  const auditTrail: AuditStep[] = [];
  const cleanId = (productIdOrSku || "").trim().toLowerCase();
  const product = CATALOG.find(
    (p) => p.id.toLowerCase() === cleanId || p.sku.toLowerCase() === cleanId
  );

  const policy = { ...ACTIVE_POLICY };

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
  let effectiveFloor = product.floorPrice;
  let bundleProduct: Product | undefined = undefined;

  if (bundleSku) {
    bundleProduct = CATALOG.find((p) => p.sku === bundleSku);
    if (bundleProduct) {
      effectiveFloor += bundleProduct.floorPrice;
    }
  }

  const effectiveTotalProposed = (proposedUnitPrice * quantity) + (bundlePrice || 0);
  const meetsFloor = effectiveTotalProposed >= effectiveFloor;

  auditTrail.push({
    ruleId: "RULE_PRICE_FLOOR",
    description: "Verify transaction satisfies merchant floor boundaries",
    passed: meetsFloor,
    metadata: {
      proposedTotal: effectiveTotalProposed,
      minimumFloorRequired: effectiveFloor,
      isBundle: Boolean(bundleProduct),
    },
  });

  if (!meetsFloor) {
    return {
      status: "BLOCKED",
      reason: `Offered value ₹${effectiveTotalProposed} breaches merchant floor threshold of ₹${effectiveFloor}.`,
      product,
      bundleProduct,
      auditTrail,
      policySnapshot: policy,
    };
  }

  // 4. Max Discount Ceiling
  const baselineTotal = (product.price * quantity) + (bundleProduct ? bundleProduct.price : 0);
  const discountPct = ((baselineTotal - effectiveTotalProposed) / baselineTotal) * 100;
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
      bundleProduct,
      auditTrail,
      policySnapshot: policy,
    };
  }

  // 5. Max Order Cap Check
  const withinCap = effectiveTotalProposed <= policy.maxOrderValueINR;
  auditTrail.push({
    ruleId: "RULE_MAX_ORDER_CAP",
    description: "Verify total transaction does not exceed session risk cap",
    passed: withinCap,
    metadata: { totalINR: effectiveTotalProposed, maxCapINR: policy.maxOrderValueINR },
  });

  if (!withinCap) {
    return {
      status: "BLOCKED",
      reason: `Total ₹${effectiveTotalProposed} exceeds safety cap of ₹${policy.maxOrderValueINR}.`,
      product,
      bundleProduct,
      auditTrail,
      policySnapshot: policy,
    };
  }

  // Cryptographic Signature
  const hmacSecret = process.env.RAZORPAY_KEY_SECRET || "default_hmac_secret";
  const rawPayload = `${buyerAgentId}:${product.sku}:${bundleProduct ? bundleProduct.sku : "NONE"}:${effectiveTotalProposed}:${Date.now()}`;
  const cryptographicDigest = crypto
    .createHmac("sha256", hmacSecret)
    .update(rawPayload)
    .digest("hex");

  return {
    status: "PASSED",
    reason: bundleProduct
      ? "Cross-sell bundle verified and approved under merchant bounding rules."
      : "Transaction approved under all bounding rules.",
    product,
    bundleProduct,
    evaluatedUnitPrice: proposedUnitPrice,
    evaluatedQuantity: quantity,
    totalAmountPaise: Math.round(effectiveTotalProposed * 100),
    isBundle: Boolean(bundleProduct),
    auditTrail,
    cryptographicDigest,
    policySnapshot: policy,
  };
}