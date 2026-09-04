import { NextRequest, NextResponse } from "next/server";
import { CATALOG, getCatalog, resetInventory } from "@/lib/catalog";

export async function GET() {
  return NextResponse.json({
    success: true,
    catalog: getCatalog(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "reset") {
      const resetList = resetInventory();
      return NextResponse.json({
        success: true,
        message: "Inventory reset to initial defaults.",
        catalog: resetList,
      });
    }

    return NextResponse.json({
      success: true,
      catalog: getCatalog(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}