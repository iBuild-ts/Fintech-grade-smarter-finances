import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TrendPoint = {
  date: string;
  inflowCents: number;
  outflowCents: number;
  netCents: number;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.max(7, Math.min(120, Number(url.searchParams.get("days") ?? "30")));

  const today = startOfDay(new Date());
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));

  const txs = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: from } },
    select: { date: true, amountCents: true, direction: true },
    orderBy: { date: "asc" },
  });

  const byDay: Record<string, TrendPoint> = {};
  for (let i = 0; i < days; i += 1) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay[key] = { date: key, inflowCents: 0, outflowCents: 0, netCents: 0 };
  }

  for (const t of txs) {
    const key = startOfDay(new Date(t.date)).toISOString().slice(0, 10);
    const p = byDay[key];
    if (!p) continue;
    if (t.direction === "INFLOW") p.inflowCents += t.amountCents;
    else p.outflowCents += t.amountCents;
  }

  for (const p of Object.values(byDay)) {
    p.netCents = p.inflowCents - p.outflowCents;
  }

  const points = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({ points, days }, { status: 200 });
}
