import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const bodySchema = z.object({
  category: z.string().min(1).max(80),
  limitDollars: z.number().positive(),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const year = parsed.data.year ?? now.getFullYear();
  const month = parsed.data.month ?? now.getMonth() + 1;

  const limitCents = Math.round(parsed.data.limitDollars * 100);

  const budget = await prisma.budget.upsert({
    where: {
      userId_year_month_category: { userId: user.id, year, month, category: parsed.data.category },
    },
    create: { userId: user.id, year, month, category: parsed.data.category, limitCents },
    update: { limitCents },
    select: { id: true, category: true, limitCents: true, year: true, month: true },
  });

  await auditLog({
    userId: user.id,
    action: "budgets.upsert",
    entity: "Budget",
    entityId: budget.id,
    meta: { category: budget.category, limitCents: budget.limitCents, year: budget.year, month: budget.month },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ budget }, { status: 200 });
}
