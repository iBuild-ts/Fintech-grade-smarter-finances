import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function GET() {
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

  const from = startOfMonth();
  const txs = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: from } },
    select: { amountCents: true, direction: true, category: true },
  });

  let inflow = 0;
  let outflow = 0;
  const byCategory: Record<string, number> = {};

  for (const t of txs) {
    if (t.direction === "INFLOW") inflow += t.amountCents;
    else outflow += t.amountCents;

    const cat = t.category ?? "Uncategorized";
    byCategory[cat] = (byCategory[cat] ?? 0) + (t.direction === "OUTFLOW" ? t.amountCents : 0);
  }

  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, spendCents]) => ({ category, spendCents }));

  return NextResponse.json(
    {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      inflowCents: inflow,
      outflowCents: outflow,
      netCents: inflow - outflow,
      topCategories,
    },
    { status: 200 },
  );
}
