import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findRecurringCharges } from "@/lib/recurring";
import { auditLog } from "@/lib/audit";

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

  const txs = await prisma.transaction.findMany({
    where: { userId: user.id, direction: "OUTFLOW" },
    select: { date: true, name: true, amountCents: true },
    orderBy: { date: "desc" },
    take: 800,
  });

  const candidates = findRecurringCharges(txs);

  let insightsCreated = 0;
  let alertsCreated = 0;

  for (const c of candidates) {
    const title = `Recurring charge detected: ${c.merchant}`;
    const content = `We detected a likely ${c.cadence} recurring charge of about $${(
      c.avgAmountCents / 100
    ).toFixed(2)} (${c.count} occurrences). Review and cancel if unused.`;

    await prisma.insight.create({
      data: {
        userId: user.id,
        type: "GENERAL",
        title,
        content,
        score: c.cadence === "monthly" ? 0.7 : 0.6,
        meta: {
          recurring: true,
          merchant: c.merchant,
          cadence: c.cadence,
          avgAmountCents: c.avgAmountCents,
          count: c.count,
          lastDate: c.lastDate.toISOString(),
        },
      },
      select: { id: true },
    });
    insightsCreated += 1;

    // Mark as LOW unless it's expensive.
    const severity = c.avgAmountCents >= 50_00 ? "MEDIUM" : "LOW";

    await prisma.alert.create({
      data: {
        userId: user.id,
        severity,
        title,
        content,
        meta: {
          recurring: true,
          merchant: c.merchant,
          cadence: c.cadence,
          avgAmountCents: c.avgAmountCents,
          count: c.count,
        },
      },
      select: { id: true },
    });
    alertsCreated += 1;
  }

  await auditLog({
    userId: user.id,
    action: "subscriptions.detect",
    entity: "Insight",
    meta: { detectedCount: candidates.length, insightsCreated, alertsCreated },
    ip: null,
    userAgent: null,
  });

  return NextResponse.json(
    {
      ok: true,
      detected: candidates,
      insightsCreated,
      alertsCreated,
    },
    { status: 200 },
  );
}
