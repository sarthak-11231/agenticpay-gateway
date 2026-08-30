import Razorpay from "razorpay";
import { GuardrailEvaluation } from "./guardrail";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function createBoundedRazorpayOrder(
  evaluation: GuardrailEvaluation,
  buyerAgentId: string = "agent_buyer_01"
) {
  if (evaluation.status !== "PASSED" || !evaluation.totalAmountPaise || !evaluation.product) {
    throw new Error("Cannot issue order for a non-approved transaction.");
  }

  const receipt = `a2a_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const order = await razorpay.orders.create({
    amount: evaluation.totalAmountPaise,
    currency: "INR",
    receipt,
    notes: {
      protocol: "A2A_AGENTIC_COMMERCE_V1",
      buyerAgentId,
      sku: evaluation.product.sku,
      unitPrice: String(evaluation.evaluatedUnitPrice),
      quantity: String(evaluation.evaluatedQuantity),
      originalPrice: String(evaluation.product.price),
    },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    notes: order.notes,
  };
}