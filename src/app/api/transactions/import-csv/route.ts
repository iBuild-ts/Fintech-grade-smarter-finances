import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const bodySchema = z.object({
  csvText: z.string().min(1).max(5_000_000),
  currency: z.string().min(3).max(6).default("USD"),
});

function autoCategory(name: string): string {
  const n = name.toLowerCase();

  if (/(salary|payroll|paycheck|employer)/.test(n)) return "Income";
  if (/(rent|landlord|mortgage)/.test(n)) return "Rent";
  if (/(uber|lyft|taxi|metro|transit|bus|train|gas|shell|chevron|exxon)/.test(n)) return "Transport";
  if (/(whole foods|trader joe|kroger|walmart|costco|grocery|supermarket)/.test(n)) return "Groceries";
  if (/(starbucks|mcdonald|burger|pizza|restaurant|cafe|doordash|ubereats)/.test(n)) return "Dining";
  if (/(netflix|spotify|hulu|prime video|subscription)/.test(n)) return "Subscriptions";
  if (/(electric|water|utility|internet|comcast|verizon|at&t|t-mobile)/.test(n)) return "Utilities";
  if (/(pharmacy|hospital|clinic|dental|optical|health)/.test(n)) return "Healthcare";
  if (/(amazon|target|shop|store|mall|apple|best buy)/.test(n)) return "Shopping";

  return "Uncategorized";
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseAmountToCents(raw: string): number {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error("invalid_amount");
  return Math.round(n * 100);
}

function parseDate(raw: string): Date {
  const trimmed = raw.trim();
  const d = new Date(trimmed);
  if (!Number.isFinite(d.getTime())) throw new Error("invalid_date");
  return d;
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

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

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const lines = parsed.data.csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return NextResponse.json({ error: "csv_too_small" }, { status: 400 });
  }

  const header = parseCsvLine(lines[0]!);
  const headerMap = new Map<string, number>();
  header.forEach((h, idx) => headerMap.set(normalizeHeader(h), idx));

  const dateIdx =
    headerMap.get("date") ??
    headerMap.get("transaction date") ??
    headerMap.get("posted date") ??
    headerMap.get("time") ??
    -1;

  const nameIdx =
    headerMap.get("name") ??
    headerMap.get("description") ??
    headerMap.get("merchant") ??
    headerMap.get("payee") ??
    -1;

  const amountIdx = headerMap.get("amount") ?? headerMap.get("amount (usd)") ?? -1;

  const categoryIdx = headerMap.get("category") ?? -1;

  if (dateIdx < 0 || nameIdx < 0 || amountIdx < 0) {
    return NextResponse.json(
      {
        error: "missing_required_columns",
        required: ["date", "name/description", "amount"],
        found: header,
      },
      { status: 400 },
    );
  }

  const currency = parsed.data.currency.toUpperCase();

  const txs: {
    userId: string;
    date: Date;
    name: string;
    amountCents: number;
    currency: string;
    direction: "INFLOW" | "OUTFLOW";
    category?: string | null;
    isPending: boolean;
    providerRef: string;
  }[] = [];

  let categorized = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvLine(lines[i]!);
    const rawDate = row[dateIdx] ?? "";
    const rawName = row[nameIdx] ?? "";
    const rawAmount = row[amountIdx] ?? "";

    if (!rawDate || !rawName || !rawAmount) continue;

    let amountCents = parseAmountToCents(rawAmount);
    const direction: "INFLOW" | "OUTFLOW" = amountCents >= 0 ? "INFLOW" : "OUTFLOW";
    amountCents = Math.abs(amountCents);

    const date = parseDate(rawDate);
    const name = rawName.trim();
    let category = categoryIdx >= 0 ? (row[categoryIdx] ?? null)?.trim() || null : null;
    if (!category) {
      category = autoCategory(name);
      categorized += 1;
    }

    const providerRef = `csv_${date.toISOString()}_${name}_${rawAmount}`.slice(0, 190);

    txs.push({
      userId: user.id,
      date,
      name,
      amountCents,
      currency,
      direction,
      category,
      isPending: false,
      providerRef,
    });
  }

  if (txs.length === 0) {
    return NextResponse.json({ error: "no_rows_parsed" }, { status: 400 });
  }

  const created = await prisma.transaction.createMany({
    data: txs,
  });

  const now = new Date();
  const from = startOfMonth(now);

  const [budgets, monthOutflows] = await Promise.all([
    prisma.budget.findMany({
      where: { userId: user.id, year: now.getFullYear(), month: now.getMonth() + 1 },
      select: { category: true, limitCents: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: from }, direction: "OUTFLOW" },
      select: { category: true, amountCents: true },
    }),
  ]);

  const spend: Record<string, number> = {};
  for (const t of monthOutflows) {
    const cat = t.category ?? "Uncategorized";
    spend[cat] = (spend[cat] ?? 0) + t.amountCents;
  }

  let insightsCreated = 0;
  let alertsCreated = 0;

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
      insightsCreated += 1;

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
      alertsCreated += 1;
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
      insightsCreated += 1;

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
      alertsCreated += 1;
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

  const large = (recent as Array<{ amountCents: number }>).filter((t) => t.amountCents >= 1_500_00).length;
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
    insightsCreated += 1;

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
    alertsCreated += 1;
  }

  await auditLog({
    userId: user.id,
    action: "transactions.import_csv",
    entity: "Transaction",
    meta: {
      rowsParsed: txs.length,
      inserted: created.count,
      categorized,
      insightsCreated,
      alertsCreated,
      currency,
    },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json(
    {
      ok: true,
      rowsParsed: txs.length,
      inserted: created.count,
      categorized,
      insightsCreated,
      alertsCreated,
    },
    { status: 200 },
  );
}
