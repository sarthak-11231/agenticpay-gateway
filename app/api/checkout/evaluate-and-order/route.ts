import { NextRequest, NextResponse } from "next/server";
import { evaluateOrderBoundaries } from "@/lib/guardrail";
import { createBoundedRazorpayOrder } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, proposedUnitPrice, quantity, buyerAgentId } = body;

    const evaluation = evaluateOrderBoundaries(
      productId,
      Number(proposedUnitPrice),
      Number(quantity) || 1
    );

    if (evaluation.status === "BLOCKED") {
      return NextResponse.json(
        { success: false, evaluation },
        { status: 422 }
      );
    }

    const razorpayOrder = await createBoundedRazorpayOrder(evaluation, buyerAgentId);

    return NextResponse.json({
      success: true,
      evaluation,
      razorpayOrder,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
