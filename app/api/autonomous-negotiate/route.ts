import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { CATALOG } from "@/lib/catalog";
import { evaluateOrderBoundaries } from "@/lib/guardrail";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: NextRequest) {
  try {
    const { productId, buyerStrategy, targetBudget } = await req.json();

    const product = CATALOG.find((p) => p.id === productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Ensure starting offer makes rational sense relative to product price
    let currentOffer = targetBudget && targetBudget < product.price
      ? Number(targetBudget)
      : Math.round(product.price * 0.82);

    const dialogueRounds = [];
    let agreedPrice = null;
    let finalEvaluation = null;

    for (let round = 1; round <= 3; round++) {
      // 1. Buyer Agent Turn
      const buyerPrompt = `
You are an Autonomous AI Buyer Agent.
Strategy: ${buyerStrategy || "Aggressive Bargainer"}
Item: ${product.name} (Base Price: ₹${product.price})
Your Bid: ₹${currentOffer}
Current Round: ${round}

Generate a sharp, 1-sentence negotiation pitch to the seller.`;

      const buyerResp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buyerPrompt,
      });

      const buyerMessage =
        buyerResp.text?.trim() || `I offer ₹${currentOffer} for 1 unit of ${product.name}.`;

      dialogueRounds.push({
        role: "BUYER_AGENT",
        round,
        offeredPrice: currentOffer,
        message: buyerMessage,
      });

      // 2. Evaluate Guardrail on current offer
      const evalCheck = evaluateOrderBoundaries(product.id, currentOffer, 1, "autonomous_buyer_01");

      if (evalCheck.status === "PASSED") {
        agreedPrice = currentOffer;
        finalEvaluation = evalCheck;
        dialogueRounds.push({
          role: "MERCHANT_AGENT",
          round,
          agreed: true,
          message: `Deal approved. I accept the offer of ₹${currentOffer} for ${product.name}.`,
        });
        break;
      } else {
        // Deterministic counter-offer from Merchant
        const counterOffer = Math.max(product.floorPrice, currentOffer + 150);
        dialogueRounds.push({
          role: "MERCHANT_AGENT",
          round,
          agreed: false,
          counterOffer,
          message: `Offer of ₹${currentOffer} is below policy limits. Counter-offer is ₹${counterOffer}.`,
        });
        currentOffer = counterOffer;
      }
    }

    if (!finalEvaluation) {
      finalEvaluation = evaluateOrderBoundaries(product.id, currentOffer, 1, "autonomous_buyer_01");
    }

    return NextResponse.json({
      success: true,
      dialogueRounds,
      agreedPrice,
      finalEvaluation,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}