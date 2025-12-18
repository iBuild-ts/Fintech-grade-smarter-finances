import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function POST() {
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

  const [budgets, txs] = await Promise.all([
    prisma.budget.findMany({
      where: { userId: user.id, year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
      select: { category: true, limitCents: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: from }, direction: "OUTFLOW" },
      select: { category: true, amountCents: true },
    }),
  ]);

  const spend: Record<string, number> = {};
  for (const t of txs) {
    const cat = t.category ?? "Uncategorized";
    spend[cat] = (spend[cat] ?? 0) + t.amountCents;
  }

  const created: string[] = [];

  for (const b of budgets) {
    const used = spend[b.category] ?? 0;
    const pct = b.limitCents > 0 ? used / b.limitCents : 0;

    if (pct >= 1) {
      const ins = await prisma.insight.create({
        data: {
          userId: user.id,
          type: "BUDGET",
          title: `Budget exceeded: ${b.category}`,
          content: `You’ve spent $${(used / 100).toFixed(2)} on ${b.category} which is above your $${(
            b.limitCents / 100
          ).toFixed(2)} budget.`,
          score: Math.min(1, pct),
          meta: { category: b.category, usedCents: used, limitCents: b.limitCents },
        },
        select: { id: true },
      });
      created.push(ins.id);

      await prisma.alert.create({
        data: {
          userId: user.id,
          severity: "HIGH",
          title: `Budget exceeded: ${b.category}`,
          content: `You’re over budget for ${b.category}. Review spending and adjust your plan.`,
          meta: { category: b.category, usedCents: used, limitCents: b.limitCents, insightId: ins.id },
        },
        select: { id: true },
      });
    } else if (pct >= 0.8) {
      const ins = await prisma.insight.create({
        data: {
          userId: user.id,
          type: "BUDGET",
          title: `Budget warning: ${b.category}`,
          content: `You’ve used ${(pct * 100).toFixed(0)}% of your ${b.category} budget.`,
          score: pct,
          meta: { category: b.category, usedCents: used, limitCents: b.limitCents },
        },
        select: { id: true },
      });
      created.push(ins.id);

      await prisma.alert.create({
        data: {
          userId: user.id,
          severity: "MEDIUM",
          title: `Budget warning: ${b.category}`,
          content: `You’ve used ${(pct * 100).toFixed(0)}% of your ${b.category} budget.`,
          meta: { category: b.category, usedCents: used, limitCents: b.limitCents, insightId: ins.id },
        },
        select: { id: true },
      });
    }
  }

  const recent = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      direction: "OUTFLOW",
      date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { amountCents: true },
  });

  const large = (recent as Array<{ amountCents: number }>).filter(
    (t) => t.amountCents >= 1_500_00,
  ).length;
  if (large >= 2) {
    const ins = await prisma.insight.create({
      data: {
        userId: user.id,
        type: "FRAUD",
        title: "Unusual large purchases detected",
        content:
          "You’ve had multiple large transactions (>$1,500) in the last 7 days. If this wasn’t expected, review your recent activity.",
        score: Math.min(1, large / 5),
        meta: { last7DaysLargeTxCount: large },
      },
      select: { id: true },
    });
    created.push(ins.id);

    await prisma.alert.create({
      data: {
        userId: user.id,
        severity: "HIGH",
        title: "Potential fraud: unusual large purchases",
        content:
          "We detected multiple large purchases in the last 7 days. If you don’t recognize them, review your recent transactions.",
        meta: { last7DaysLargeTxCount: large, insightId: ins.id },
      },
      select: { id: true },
    });
  }

  return NextResponse.json({ ok: true, insightsCreated: created.length, insightIds: created }, { status: 200 });
}
