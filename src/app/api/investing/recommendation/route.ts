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
  const [txs, profile] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: from } },
      select: { amountCents: true, direction: true },
    }),
    prisma.riskProfile.findUnique({
      where: { userId: user.id },
      select: { riskTolerance: true, horizonYears: true, incomeStable: true, hasEmergencyFund: true },
    }),
  ]);

  let inflow = 0;
  let outflow = 0;
  for (const t of txs) {
    if (t.direction === "INFLOW") inflow += t.amountCents;
    else outflow += t.amountCents;
  }

  const net = inflow - outflow;
  const savingsRate = inflow > 0 ? net / inflow : 0;

  // Financial buffer score: more buffer => higher risk tolerance.
  const bufferScore = Math.max(0, Math.min(1, savingsRate));

  // Questionnaire score (0..1), defaults if unset.
  const questionnaireScore = profile?.riskTolerance ?? 0.5;

  // Combine: user preference (70%) + observed buffer (30%).
  const riskScore = Math.max(0, Math.min(1, questionnaireScore * 0.7 + bufferScore * 0.3));

  const allocation =
    riskScore >= 0.65
      ? { stocksPct: 80, bondsPct: 15, cashPct: 5 }
      : riskScore >= 0.35
        ? { stocksPct: 60, bondsPct: 30, cashPct: 10 }
        : { stocksPct: 40, bondsPct: 40, cashPct: 20 };

  const recommendation = {
    riskScore,
    inputs: {
      questionnaireScore,
      bufferScore,
      horizonYears: profile?.horizonYears ?? null,
      incomeStable: profile?.incomeStable ?? null,
      hasEmergencyFund: profile?.hasEmergencyFund ?? null,
      savingsRate,
    },
    allocation,
    notes: [
      "Local demo: allocation uses your saved risk profile plus this month’s savings rate.",
      "Not financial advice. Use a real risk questionnaire + market data for production.",
    ],
  };

  return NextResponse.json({ recommendation }, { status: 200 });
}
