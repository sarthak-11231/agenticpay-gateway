import { NextResponse } from "next/server";
import { CATALOG } from "@/lib/catalog";

export async function GET() {
  return NextResponse.json({
    protocol: "ACP_v1.0",
    merchant: "Aura Electronics Demo",
    currency: "INR",
    items: CATALOG.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: p.price,
      inStock: p.stock > 0,
      availableUnits: p.stock,
      description: p.description,
    })),
  });
}