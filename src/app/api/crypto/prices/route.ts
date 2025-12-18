import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const prices = [
    { symbol: "BTC", name: "Bitcoin", priceUsd: 103245.12, change24hPct: 1.82 },
    { symbol: "ETH", name: "Ethereum", priceUsd: 5288.41, change24hPct: -0.44 },
    { symbol: "SOL", name: "Solana", priceUsd: 312.77, change24hPct: 3.13 },
  ];

  return NextResponse.json({ prices, source: "mock" }, { status: 200 });
}
