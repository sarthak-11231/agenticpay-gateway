import { NextRequest, NextResponse } from "next/server";
import { deductStock, CATALOG } from "@/lib/catalog";

export async function POST(req: NextRequest) {
  try {
    const { productId, quantity } = await req.json();
    const success = deductStock(productId, Number(quantity) || 1);
    
    return NextResponse.json({
      success,
      catalog: CATALOG,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}