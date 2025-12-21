import { NextResponse } from "next/server";

export async function GET() {
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    return NextResponse.json(
      { error: "TELEGRAM_API_ID or TELEGRAM_API_HASH not set" },
      { status: 500 }
    );
  }

  return NextResponse.json({ apiId: parseInt(apiId), apiHash });
}