import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultDemoBudgets, generateDemoTransactions } from "@/lib/demo";
import { auditLog } from "@/lib/audit";

const bodySchema = z
  .object({
    days: z.number().int().min(7).max(365).default(60),
    count: z.number().int().min(10).max(2000).default(250),
    replace: z.boolean().default(false),
  })
  .default({ days: 60, count: 250, replace: false });

export async function POST(req: Request) {
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

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { days, count, replace } = parsed.data;

  if (replace) {
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.budget.deleteMany({ where: { userId: user.id } });
    await prisma.insight.deleteMany({ where: { userId: user.id } });
    await prisma.alert.deleteMany({ where: { userId: user.id } });
  }

  const txs = generateDemoTransactions({ days, count });

  const created = await prisma.transaction.createMany({
    data: txs.map((t) => ({ ...t, userId: user.id })),
  });

  const budgets = defaultDemoBudgets();
  for (const b of budgets) {
    await prisma.budget.upsert({
      where: {
        userId_year_month_category: {
          userId: user.id,
          year: b.year,
          month: b.month,
          category: b.category,
        },
      },
      create: { ...b, userId: user.id },
      update: { limitCents: b.limitCents },
    });
  }

  await auditLog({
    userId: user.id,
    action: "demo.seed",
    entity: "Transaction",
    meta: { days, count, replace, transactionsInserted: created.count, budgetsUpserted: budgets.length },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json(
    {
      ok: true,
      transactionsInserted: created.count,
      budgetsUpserted: budgets.length,
    },
    { status: 200 },
  );
}
