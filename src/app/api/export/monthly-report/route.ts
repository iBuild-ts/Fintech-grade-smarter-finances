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
    select: { id: true, email: true, displayName: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const from = startOfMonth(now);

  const [txs, budgets, insights, alerts, deployments] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: from } },
      select: { amountCents: true, direction: true, category: true },
    }),
    prisma.budget.findMany({
      where: { userId: user.id, year: now.getFullYear(), month: now.getMonth() + 1 },
      select: { category: true, limitCents: true },
    }),
    prisma.insight.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, type: true, title: true, score: true, createdAt: true },
    }),
    prisma.alert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, severity: true, title: true, isRead: true, createdAt: true },
    }),
    prisma.contractDeployment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, chain: true, contractName: true, address: true, createdAt: true },
    }),
  ]);

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
    .slice(0, 10)
    .map(([category, spendCents]) => ({ category, spendCents }));

  const report = {
    generatedAt: new Date().toISOString(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    },
    summary: {
      inflowCents: inflow,
      outflowCents: outflow,
      netCents: inflow - outflow,
      topCategories,
    },
    budgets,
    insights,
    alerts,
    blockchain: {
      deployments,
    },
  };

  return NextResponse.json({ report }, { status: 200 });
}
