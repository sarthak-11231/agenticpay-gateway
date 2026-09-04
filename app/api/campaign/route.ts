import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CATALOG, ACTIVE_POLICY } from "@/lib/catalog";
import { evaluateOrderBoundaries } from "@/lib/guardrail";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const CampaignResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    campaignTitle: {
      type: Type.STRING,
      description: "Compelling flash promotion headline (e.g., 'Flash Liquidation: Anker 67W GaN Power Hub')",
    },
    targetProductId: {
      type: Type.STRING,
      description: "ID of the surplus product chosen (e.g., 'prod_005' or 'prod_004')",
    },
    suggestedDiscountPercent: {
      type: Type.NUMBER,
      description: "Proposed discount percent between 5% and 15% (strictly <= 15%)",
    },
    proposedUnitPrice: {
      type: Type.NUMBER,
      description: "Final discounted price in INR satisfying floorPrice and maxDiscount",
    },
    campaignPitch: {
      type: Type.STRING,
      description: "High-converting 2-sentence marketing pitch explaining why this deal maximizes turnover",
    },
    targetSegment: {
      type: Type.STRING,
      description: "Target buyer persona (e.g. 'Pro Developers & Desk Setup Enthusiasts')",
    },
    urgencyTag: {
      type: Type.STRING,
      description: "Urgency badge text (e.g. '⚡ Flash Deal • Next 60 Mins')",
    },
  },
  required: [
    "campaignTitle",
    "targetProductId",
    "suggestedDiscountPercent",
    "proposedUnitPrice",
    "campaignPitch",
    "urgencyTag",
  ],
};

export async function POST(req: NextRequest) {
  try {
    // Find the item with highest surplus stock or best turnover potential
    const sortedByStock = [...CATALOG].sort((a, b) => b.stock - a.stock);
    const surplusItem = sortedByStock[0] || CATALOG[4]; // Anker 67W Charger by default

    const systemInstruction = `
You are the AI Merchant Campaign Orchestrator for Aura Electronics.
Your goal is to optimize inventory turnover and unlock working capital by automatically identifying surplus inventory and launching instant bounded flash promotions.

Current Catalog:
${JSON.stringify(
  CATALOG.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    price: p.price,
    floorPrice: p.floorPrice,
    maxAllowedDiscount: `${ACTIVE_POLICY.maxDiscountPercentage}%`,
  }))
)}

Active Merchant Policy Constraints:
- Maximum Discount Ceiling: ${ACTIVE_POLICY.maxDiscountPercentage}%
- Hard Floor Prices must NEVER be breached.

Select the product with the highest inventory pressure (e.g. ${surplusItem.name}, ${surplusItem.stock} units available).
Generate an aggressive yet policy-compliant flash campaign bounded within ${ACTIVE_POLICY.maxDiscountPercentage}% discount.
`;

    const prompt = `Analyze current stock levels and orchestrate a flash promotion for the highest surplus product (${surplusItem.name}). Calculate optimal discounted price and create high-converting copy.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: CampaignResponseSchema,
      },
    });

    const campaignData = JSON.parse(response.text || "{}");
    const targetProduct =
      CATALOG.find((p) => p.id === campaignData.targetProductId) || surplusItem;

    // Deterministically enforce floor & discount ceiling
    const rawDiscountPct = Math.min(
      campaignData.suggestedDiscountPercent || 12.5,
      ACTIVE_POLICY.maxDiscountPercentage
    );
    const calculatedPrice = Math.max(
      targetProduct.floorPrice,
      Math.round(targetProduct.price * (1 - rawDiscountPct / 100))
    );

    // Validate against guardrail to obtain cryptographic signature & proof
    const guardrailCheck = evaluateOrderBoundaries(
      targetProduct.id,
      calculatedPrice,
      1,
      "agent_campaign_orchestrator"
    );

    return NextResponse.json({
      success: true,
      campaign: {
        title: campaignData.campaignTitle || `Flash Deal: ${targetProduct.name}`,
        targetProduct,
        pitch: campaignData.campaignPitch,
        discountPercent: rawDiscountPct,
        originalPrice: targetProduct.price,
        flashPrice: calculatedPrice,
        savingsINR: targetProduct.price - calculatedPrice,
        stockAvailable: targetProduct.stock,
        urgencyTag: campaignData.urgencyTag || "⚡ Limited Flash Inventory",
        targetSegment: campaignData.targetSegment || "All Verified Buyers",
      },
      guardrailCheck,
    });
  } catch (error: any) {
    console.error("Campaign orchestrator error:", error);
    // Graceful fallback with deterministic calculation if Gemini fails
    const fallbackProduct = CATALOG[4] || CATALOG[0]; // Anker 67W Charger
    const discount = 12.5;
    const flashPrice = Math.max(
      fallbackProduct.floorPrice,
      Math.round(fallbackProduct.price * (1 - discount / 100))
    );
    const guardrailCheck = evaluateOrderBoundaries(
      fallbackProduct.id,
      flashPrice,
      1,
      "agent_campaign_orchestrator"
    );

    return NextResponse.json({
      success: true,
      campaign: {
        title: `⚡ Flash Liquidation: ${fallbackProduct.name}`,
        targetProduct: fallbackProduct,
        pitch: `Surplus stock detected (${fallbackProduct.stock} units). Instant 12.5% flash discount authorized under merchant bounding rules.`,
        discountPercent: discount,
        originalPrice: fallbackProduct.price,
        flashPrice,
        savingsINR: fallbackProduct.price - flashPrice,
        stockAvailable: fallbackProduct.stock,
        urgencyTag: "⚡ Flash Promotion • Active Now",
        targetSegment: "Tech Enthusiasts & Power Users",
      },
      guardrailCheck,
    });
  }
}
