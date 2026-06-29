import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Background scraping disabled. Use Actualiser in each section.",
    },
    { status: 410 },
  );
}
