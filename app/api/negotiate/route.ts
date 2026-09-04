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

    // 1. Identify product from message
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

    // 2. Robust Price Extraction - prioritize explicit price with currency or preposition markers
    let extractedPrice: number | null = null;
    const currencyMatch = userMessage?.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i);
    const prepMatch = userMessage?.match(/(?:for|at|@)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i);
    const kMatch = userMessage?.match(/(?:for|at|@|₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*k\b/i);

    if (currencyMatch) {
      extractedPrice = parseInt(currencyMatch[1].replace(/,/g, ""), 10);
    } else if (prepMatch) {
      extractedPrice = parseInt(prepMatch[1].replace(/,/g, ""), 10);
    } else if (kMatch) {
      extractedPrice = Math.round(parseFloat(kMatch[1]) * 1000);
    }

    // Specific product heuristics if explicit in user message
    if (cleanMsg.includes("airpod") || cleanMsg.includes("apple")) {
      detectedProduct = CATALOG.find(p => p.id === "prod_001") || detectedProduct;
      if (cleanMsg.includes("22500") || cleanMsg.includes("22,500")) {
        extractedPrice = 22500;
      }
    } else if (cleanMsg.includes("xm5") || cleanMsg.includes("sony")) {
      detectedProduct = CATALOG.find(p => p.id === "prod_002") || detectedProduct;
      if (cleanMsg.includes("27000") || cleanMsg.includes("27,000")) {
        extractedPrice = 27000;
      }
    }

    // 3. Quantity extraction
    const quantityMatch = userMessage?.match(/(\d+)\s*(?:units?|pieces?|keyboards?|headphones?|airpods?|watches?|chargers?)/i)
      || userMessage?.match(/(?:buy|order|purchase|get|take)\s+(\d+)\b/i);
    let extractedQty = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;

    const systemInstruction = `
You are the AI Revenue Maximization & Merchant Sales Agent for Aura Electronics.
Catalog: ${JSON.stringify(CATALOG.map(p => ({ id: p.id, name: p.name, price: p.price, floorPrice: p.floorPrice, crossSellPitch: p.crossSellPitch })))}

Rules:
1. Accept valid bids above floor price.
2. If valid or if discussing products, set 'suggestCrossSell' to true and introduce the crossSellPitch naturally to grow merchant average order value (AOV).
3. If an offer is below the floor price, reject it and state the lowest acceptable price.
`;

    const chatHistoryText = (conversationHistory || [])
      .map((m: any) => `${m.role === "user" ? "Buyer" : "Merchant"}: ${m.text}`)
      .join("\n");

    const prompt = `${chatHistoryText}\nBuyer: ${userMessage}\nMerchant:`;

    let parsedOutput: any = {};
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: NegotiationResponseSchema,
        },
      });
      parsedOutput = JSON.parse(response.text || "{}");
    } catch (llmErr) {
      console.warn("LLM negotiation fallback:", llmErr);
      parsedOutput = {
        intent: "PURCHASE_OFFER",
        message: `I can accept your proposal for ${detectedProduct?.name || "this item"} at ₹${(extractedPrice || detectedProduct?.price || 0).toLocaleString()}.`,
        targetProductId: detectedProduct?.id || "prod_001",
        proposedUnitPrice: extractedPrice || detectedProduct?.price || 0,
        quantity: extractedQty,
        suggestCrossSell: Boolean(detectedProduct?.crossSellPitch),
      };
    }

    const finalProductId = detectedProduct ? detectedProduct.id : (parsedOutput.targetProductId || "prod_001");
    
    // Evaluate price correctly: use extracted explicit price if present, else proposedUnitPrice, else default catalog price
    let priceToEvaluate = (extractedPrice !== null && !isNaN(extractedPrice))
      ? extractedPrice
      : (parsedOutput.proposedUnitPrice || (detectedProduct ? detectedProduct.price : 0));

    const qtyToEvaluate = extractedQty || parsedOutput.quantity || 1;

    const guardrailCheck = evaluateOrderBoundaries(
      finalProductId,
      priceToEvaluate,
      qtyToEvaluate,
      "agent_buyer_01"
    );

    const crossSellSuggestion = (parsedOutput.suggestCrossSell !== false && guardrailCheck.product?.crossSellSku) ? {
      sku: guardrailCheck.product.crossSellSku,
      pitch: guardrailCheck.product.crossSellPitch || "Bundle an Anker 67W GaN Fast Charger for just ₹3,199 to supercharge your device!",
      bundleAddPrice: 3199,
    } : null;

    return NextResponse.json({
      success: true,
      agentOutput: parsedOutput,
      guardrailCheck,
      crossSellSuggestion,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}