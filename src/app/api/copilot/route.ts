import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
});

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

function classify(prompt: string) {
  const p = prompt.toLowerCase();
  if (/(fraud|suspicious|scam|chargeback|stolen|unknown transaction|unauthor)/.test(p)) return "fraud";
  if (/(budget|spend|spending|expense|save|cut|reduce|overspend)/.test(p)) return "budget";
  if (/(invest|allocation|portfolio|risk|etf|stocks|bonds|401k|ira)/.test(p)) return "invest";
  if (/(crypto|bitcoin|btc|eth|sol|token)/.test(p)) return "crypto";
  return "general";
}

function topSpendingLines(topCategories: Array<{ category: string; spendCents: number }>) {
  return topCategories
    .slice(0, 5)
    .map((c) => `- ${c.category}: ${money(c.spendCents)}`)
    .join("\n");
}

type TxMonth = {
  amountCents: number;
  direction: "INFLOW" | "OUTFLOW";
  category: string | null;
  date: Date;
  name: string;
};

type BudgetMonth = {
  category: string;
  limitCents: number;
};

type InsightRow = {
  type: string;
  title: string;
  content: string;
  createdAt: Date;
};

type AlertRow = {
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  content: string;
  createdAt: Date;
};

type RiskProfileRow = {
  riskTolerance: number;
  horizonYears: number;
  incomeStable: boolean;
  hasEmergencyFund: boolean;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, displayName: true, email: true },
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

  const prompt = parsed.data.prompt.trim();

  const intent = classify(prompt);
  const now = new Date();
  const from = startOfMonth(now);

  const [txsThisMonth, budgets, insights, alerts, riskProfile] = (await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: from } },
      select: { amountCents: true, direction: true, category: true, date: true, name: true },
      orderBy: { date: "desc" },
      take: 400,
    }),
    prisma.budget.findMany({
      where: { userId: user.id, year: now.getFullYear(), month: now.getMonth() + 1 },
      select: { category: true, limitCents: true },
    }),
    prisma.insight.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { type: true, title: true, content: true, createdAt: true },
    }),
    prisma.alert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { severity: true, title: true, content: true, createdAt: true },
    }),
    prisma.riskProfile.findUnique({
      where: { userId: user.id },
      select: { riskTolerance: true, horizonYears: true, incomeStable: true, hasEmergencyFund: true },
    }),
  ])) as unknown as [TxMonth[], BudgetMonth[], InsightRow[], AlertRow[], RiskProfileRow | null];

  let inflow = 0;
  let outflow = 0;
  const spendByCategory: Record<string, number> = {};
  for (const t of txsThisMonth) {
    if (t.direction === "INFLOW") inflow += t.amountCents;
    else outflow += t.amountCents;
    const cat = t.category ?? "Uncategorized";
    if (t.direction === "OUTFLOW") spendByCategory[cat] = (spendByCategory[cat] ?? 0) + t.amountCents;
  }

  const topCategories = Object.entries(spendByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, spendCents]) => ({ category, spendCents }));

  const net = inflow - outflow;
  const savingsRate = inflow > 0 ? net / inflow : 0;
  const bufferScore = Math.max(0, Math.min(1, savingsRate));
  const questionnaireScore = riskProfile?.riskTolerance ?? 0.5;
  const riskScore = Math.max(0, Math.min(1, questionnaireScore * 0.7 + bufferScore * 0.3));

  const allocation =
    riskScore >= 0.65
      ? { stocksPct: 80, bondsPct: 15, cashPct: 5 }
      : riskScore >= 0.35
        ? { stocksPct: 60, bondsPct: 30, cashPct: 10 }
        : { stocksPct: 40, bondsPct: 40, cashPct: 20 };

  const cryptoPrices = [
    { symbol: "BTC", name: "Bitcoin", priceUsd: 103245.12, change24hPct: 1.82 },
    { symbol: "ETH", name: "Ethereum", priceUsd: 5288.41, change24hPct: -0.44 },
    { symbol: "SOL", name: "Solana", priceUsd: 312.77, change24hPct: 3.13 },
  ];

  const budgetUsage = budgets
    .map((b: BudgetMonth) => {
      const used = spendByCategory[b.category] ?? 0;
      const pct = b.limitCents > 0 ? used / b.limitCents : 0;
      return { category: b.category, usedCents: used, limitCents: b.limitCents, pct };
    })
    .sort((a: { pct: number }, b: { pct: number }) => b.pct - a.pct);

  const recentOutflows = txsThisMonth
    .filter((t: TxMonth) => t.direction === "OUTFLOW")
    .slice(0, 8);
  const recentOutflowLines = recentOutflows
    .map((t: TxMonth) => {
      const d = new Date(t.date).toLocaleDateString();
      return `- ${d} · ${t.category ?? "Uncategorized"} · ${money(t.amountCents)} · ${t.name}`;
    })
    .join("\n");

  const header = `Finance Copilot (local demo) for ${user.displayName ?? user.email}`;
  const snapshot =
    `\n\nSnapshot (this month):\n` +
    `- Inflow: ${money(inflow)}\n` +
    `- Outflow: ${money(outflow)}\n` +
    `- Net: ${money(net)}\n` +
    `- Top spending:\n${topSpendingLines(topCategories) || "- (no spending yet)"}`;

  const alertsBlock =
    alerts.length === 0
      ? "\n\nLatest alerts:\n- (none)"
      :
          "\n\nLatest alerts:\n" +
          alerts
            .slice(0, 5)
            .map((a: AlertRow) => `- [${a.severity}] ${a.title}`)
            .join("\n");

  const insightsBlock =
    insights.length === 0
      ? "\n\nLatest insights:\n- (none)"
      :
          "\n\nLatest insights:\n" +
          insights
            .slice(0, 5)
            .map((i: InsightRow) => `- (${i.type}) ${i.title}`)
            .join("\n");

  let guidance = "";

  if (intent === "budget") {
    const worst = budgetUsage[0];
    const over = budgetUsage.filter((b: { pct: number }) => b.pct >= 1);
    const warn = budgetUsage.filter((b: { pct: number }) => b.pct >= 0.8 && b.pct < 1);

    guidance =
      "\n\nBudget guidance:\n" +
      (worst
        ? `- Highest budget utilization: ${worst.category} (${(worst.pct * 100).toFixed(0)}% of budget)\n`
        : "- No budgets found for this month. Seed demo data or create budgets.\n") +
      (over.length
        ? `- Over budget: ${over.map((b) => b.category).join(", ")}\n`
        : "") +
      (warn.length
        ? `- Near limit: ${warn.map((b) => b.category).join(", ")}\n`
        : "") +
      "\nSuggested actions:\n" +
      "- Pick 1 category to cut this week (start with the biggest spender).\n" +
      "- Set a weekly cap (monthly limit / 4) and track against it.\n" +
      "- Review your last 8 outflows and tag anything non-essential.\n" +
      `\nRecent outflows:\n${recentOutflowLines || "- (none)"}`;
  } else if (intent === "fraud") {
    const largeTx = txsThisMonth
      .filter((t: TxMonth) => t.direction === "OUTFLOW")
      .filter((t: TxMonth) => t.amountCents >= 1_500_00)
      .slice(0, 5);

    guidance =
      "\n\nFraud / anomaly guidance:\n" +
      "- Check whether alerts mention unusual activity (see Latest alerts).\n" +
      "- Verify large transactions and any unfamiliar merchants.\n" +
      "- If anything is unknown: lock card, change passwords, enable MFA, and contact your bank.\n" +
      (largeTx.length
        ?
            "\nRecent large transactions:\n" +
            largeTx
              .map(
                (t: TxMonth) =>
                  `- ${new Date(t.date).toLocaleDateString()} · ${money(t.amountCents)} · ${t.name}`,
              )
              .join("\n")
        : "\nRecent large transactions:\n- (none detected in this month’s data)") +
      "\n\nIf you paste the transaction name + amount + date, I can help classify it and suggest next steps.";
  } else if (intent === "invest") {
    guidance =
      "\n\nInvesting guidance (demo heuristic):\n" +
      `- Your saved risk profile: ${(questionnaireScore * 100).toFixed(0)}% tolerance` +
      (riskProfile ? `, ${riskProfile.horizonYears}y horizon` : "") +
      `\n` +
      `- This month’s savings rate implies a buffer score of ${(bufferScore * 100).toFixed(0)}%.\n` +
      `- Combined risk score: ${(riskScore * 100).toFixed(0)}%.\n` +
      `- Suggested allocation: Stocks ${allocation.stocksPct}% / Bonds ${allocation.bondsPct}% / Cash ${allocation.cashPct}%.\n` +
      "\nSuggested actions:\n" +
      (riskProfile?.hasEmergencyFund === false
        ? "- Build an emergency fund (3–6 months) before taking more investment risk.\n"
        : "") +
      "- Keep 3–6 months of expenses in cash before increasing risk.\n" +
      "- If you have high-interest debt, prioritize paying that down first.\n" +
      "- Prefer broad, low-fee index funds for MVP recommendations.";
  } else if (intent === "crypto") {
    guidance =
      "\n\nCrypto snapshot (mock prices):\n" +
      cryptoPrices
        .map((c) => `- ${c.symbol} (${c.name}): $${c.priceUsd.toFixed(2)} (${c.change24hPct >= 0 ? "+" : ""}${c.change24hPct.toFixed(2)}%)`)
        .join("\n") +
      "\n\nSuggested actions:\n" +
      "- Treat crypto as high-volatility: cap position size (e.g., 0–10% depending on risk).\n" +
      "- Use hardware wallets for long-term holdings and enable 2FA on exchanges.";
  } else {
    guidance =
      "\n\nWhat I can do next:\n" +
      "- Budget: ask “Where am I overspending?” or “What can I cut this week?”\n" +
      "- Fraud: ask “Is this transaction suspicious?” and paste details\n" +
      "- Investing: ask “What’s my suggested allocation?”\n" +
      "- Blockchain: deploy an Escrow/IOU from the Blockchain panel and I’ll track deployments";
  }

  const reply = `${header}\n\nYou asked: ${prompt}${snapshot}${alertsBlock}${insightsBlock}${guidance}`;

  return NextResponse.json({ reply }, { status: 200 });
}
