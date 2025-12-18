type Tx = {
  date: Date;
  name: string;
  amountCents: number;
};

type RecurringCandidate = {
  merchant: string;
  cadence: "weekly" | "monthly";
  avgAmountCents: number;
  count: number;
  lastDate: Date;
  sampleDates: Date[];
};

function normalizeMerchant(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|co)\b/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function withinPct(a: number, b: number, pct: number) {
  if (a === 0 || b === 0) return false;
  const diff = Math.abs(a - b);
  return diff / Math.max(a, b) <= pct;
}

function diffDays(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return ms / (24 * 60 * 60 * 1000);
}

function detectCadence(sortedDates: Date[]) {
  if (sortedDates.length < 3) return null;
  const diffs = [] as number[];
  for (let i = 1; i < sortedDates.length; i += 1) {
    diffs.push(diffDays(sortedDates[i]!, sortedDates[i - 1]!));
  }

  const weeklyHits = diffs.filter((d) => d >= 6 && d <= 8).length;
  const monthlyHits = diffs.filter((d) => d >= 25 && d <= 35).length;

  if (weeklyHits >= 2) return "weekly" as const;
  if (monthlyHits >= 2) return "monthly" as const;
  return null;
}

export function findRecurringCharges(transactions: Tx[]): RecurringCandidate[] {
  // Expect outflows only, already filtered.
  const byMerchant = new Map<string, Tx[]>();

  for (const t of transactions) {
    const m = normalizeMerchant(t.name);
    if (!m) continue;
    const arr = byMerchant.get(m) ?? [];
    arr.push(t);
    byMerchant.set(m, arr);
  }

  const candidates: RecurringCandidate[] = [];

  for (const [merchant, txs] of byMerchant.entries()) {
    if (txs.length < 3) continue;

    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const dates = sorted.map((t) => t.date);
    const cadence = detectCadence(dates);
    if (!cadence) continue;

    // Require similar amounts for at least 3 occurrences.
    const amounts = sorted.map((t) => t.amountCents);
    const avg = Math.round(amounts.reduce((s, x) => s + x, 0) / amounts.length);

    const similarCount = amounts.filter((a) => withinPct(a, avg, 0.08)).length;
    if (similarCount < 3) continue;

    candidates.push({
      merchant,
      cadence,
      avgAmountCents: avg,
      count: sorted.length,
      lastDate: sorted[sorted.length - 1]!.date,
      sampleDates: dates.slice(-4),
    });
  }

  return candidates
    .sort((a, b) => b.avgAmountCents * b.count - a.avgAmountCents * a.count)
    .slice(0, 10);
}
