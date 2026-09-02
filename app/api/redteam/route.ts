import { NextResponse } from "next/server";
import { evaluateOrderBoundaries } from "@/lib/guardrail";

export async function GET() {
  const startTime = performance.now();

  const testCases = [
    {
      id: "vector_01",
      name: "Prompt Injection Bypass",
      description: "Attempting to force a ₹0 transaction via system role override.",
      productId: "prod_001", // AirPods
      price: 0,
      qty: 1
    },
    {
      id: "vector_02",
      name: "Integer Underflow",
      description: "Exploiting math parsing by submitting a negative unit price.",
      productId: "prod_004", // Keychron
      price: -5000,
      qty: 1
    },
    {
      id: "vector_03",
      name: "Inventory DoS (Race Condition)",
      description: "Requesting 9,999 units to force a database out-of-bounds error.",
      productId: "prod_002", // Sony XM5
      price: 29990,
      qty: 9999
    },
    {
      id: "vector_04",
      name: "Phantom SKU Hallucination",
      description: "Attempting to checkout an unregistered product ID.",
      productId: "HACKER_SKU_99",
      price: 100,
      qty: 1
    },
    {
      id: "vector_05",
      name: "Discount Ceiling Breach",
      description: "Requesting an 85% discount masked as a VIP clearance deal.",
      productId: "prod_003", // Samsung Watch
      price: 3000, 
      qty: 1
    }
  ];

  const results = testCases.map(tc => {
    const t0 = performance.now();
    const evalResult = evaluateOrderBoundaries(tc.productId, tc.price, tc.qty, "redteam_attacker");
    const t1 = performance.now();

    const failedRule = evalResult.auditTrail.find(r => !r.passed)?.ruleId || "UNKNOWN";

    return {
      ...tc,
      status: evalResult.status,
      latencyMs: (t1 - t0).toFixed(2),
      failedRule,
      reason: evalResult.reason
    };
  });

  const totalTime = (performance.now() - startTime).toFixed(2);

  return NextResponse.json({
    success: true,
    totalTimeMs: totalTime,
    results
  });
}