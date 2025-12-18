import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const category = (url.searchParams.get("category") ?? "").trim();
  const direction = (url.searchParams.get("direction") ?? "").trim().toUpperCase();
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const take = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;

  const where: {
    userId: string;
    name?: { contains: string; mode: "insensitive" };
    category?: string;
    direction?: "INFLOW" | "OUTFLOW";
  } = { userId: user.id };

  if (q) where.name = { contains: q, mode: "insensitive" };
  if (category) where.category = category;
  if (direction === "INFLOW" || direction === "OUTFLOW") where.direction = direction;

  const txs = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take,
    select: {
      id: true,
      date: true,
      name: true,
      amountCents: true,
      currency: true,
      direction: true,
      category: true,
    },
  });

  return NextResponse.json({ transactions: txs }, { status: 200 });
}
