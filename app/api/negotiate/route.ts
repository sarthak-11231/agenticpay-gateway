import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CATALOG } from "@/lib/catalog";
import { evaluateOrderBoundaries } from "@/lib/guardrail";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const NegotiationResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      description: "PURCHASE_OFFER, INQUIRY, or REJECTION",
    },
    message: {
      type: Type.STRING,
      description: "Response message from the merchant agent to the buyer",
    },
    targetProductId: {
      type: Type.STRING,
      description: "ID of product discussed (prod_001 to prod_005)",
    },
    proposedUnitPrice: {
      type: Type.NUMBER,
      description: "Buyer's proposed unit price in INR",
    },
    quantity: {
      type: Type.INTEGER,
      description: "The quantity requested by buyer",
    },
    suggestCrossSell: {
      type: Type.BOOLEAN,
      description: "True if the agent should suggest an upsell/cross-sell accessory",
    },
    buyerOfferViolatesBounds: {
      type: Type.BOOLEAN,
      description: "True if the buyer's offer was below policy",
    }
  },
  required: ["intent", "message", "targetProductId"],
};

export async function POST(req: NextRequest) {
  try {
    const { userMessage, conversationHistory } = await req.json();
    const cleanMsg = (userMessage || "").toLowerCase();
    const priceMatch = userMessage?.match(/(?:₹|rs\.?|inr)?\s*(\d{2,6})/i);
    const quantityMatch = userMessage?.match(/(\d+)\s*(?:units?|pieces?|keyboards?|headphones?|airpods?)/i);

    let extractedPrice = priceMatch ? parseInt(priceMatch[1], 10) : null;
    let extractedQty = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;

    let detectedProduct = CATALOG.find(p => 
      cleanMsg.includes("airpod") || cleanMsg.includes("apple")
    ) || CATALOG.find(p =>
      cleanMsg.includes("sony") || cleanMsg.includes("xm5")
    ) || CATALOG.find(p =>
      cleanMsg.includes("watch") || cleanMsg.includes("samsung")
    ) || CATALOG.find(p =>
      cleanMsg.includes("keyboard") || cleanMsg.includes("keychron")
    ) || CATALOG.find(p =>
      cleanMsg.includes("charger") || cleanMsg.includes("anker")
    );

    const systemInstruction = `
You are the AI Revenue Maximization & Merchant Sales Agent for Aura Electronics.
Catalog: ${JSON.stringify(CATALOG.map(p => ({ id: p.id, name: p.name, price: p.price, floorPrice: p.floorPrice, crossSellPitch: p.crossSellPitch })))}

Rules:
1. Accept valid bids above floor price.
2. If valid, set 'suggestCrossSell' to true and introduce the crossSellPitch naturally to grow merchant average order value (AOV).
3. If an offer is below the floor price, reject it and state the lowest acceptable price.
`;

    const chatHistoryText = (conversationHistory || [])
      .map((m: any) => `${m.role === "user" ? "Buyer" : "Merchant"}: ${m.text}`)
      .join("\n");

    const prompt = `${chatHistoryText}\nBuyer: ${userMessage}\nMerchant:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: NegotiationResponseSchema,
      },
    });

    const parsedOutput = JSON.parse(response.text || "{}");
    const finalProductId = detectedProduct ? detectedProduct.id : (parsedOutput.targetProductId || "prod_001");
    
    let priceToEvaluate = parsedOutput.buyerOfferViolatesBounds && extractedPrice
      ? extractedPrice 
      : (extractedPrice || parsedOutput.proposedUnitPrice || 0);

    const qtyToEvaluate = extractedQty || parsedOutput.quantity || 1;

    const guardrailCheck = evaluateOrderBoundaries(
      finalProductId,
      priceToEvaluate,
      qtyToEvaluate,
      "agent_buyer_01"
    );

    return NextResponse.json({
      success: true,
      agentOutput: parsedOutput,
      guardrailCheck,
      crossSellSuggestion: parsedOutput.suggestCrossSell && guardrailCheck.product?.crossSellSku ? {
        sku: guardrailCheck.product.crossSellSku,
        pitch: guardrailCheck.product.crossSellPitch,
        bundleAddPrice: 3199,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}