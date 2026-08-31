import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_POLICY, updatePolicy } from "@/lib/catalog";

export async function GET() {
  return NextResponse.json({ policy: ACTIVE_POLICY });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = updatePolicy(body);
    return NextResponse.json({ success: true, policy: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}