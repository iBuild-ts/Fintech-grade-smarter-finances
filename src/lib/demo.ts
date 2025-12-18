const categories = [
  "Groceries",
  "Rent",
  "Dining",
  "Transport",
  "Entertainment",
  "Utilities",
  "Shopping",
  "Healthcare",
  "Subscriptions",
];

const merchants = [
  "Whole Foods",
  "Trader Joe's",
  "Uber",
  "Lyft",
  "Netflix",
  "Amazon",
  "Apple",
  "Shell",
  "Starbucks",
  "Target",
  "Walmart",
  "Costco",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

type TransactionDirection = "INFLOW" | "OUTFLOW";

export function generateDemoTransactions(opts: {
  days: number;
  count: number;
  currency?: string;
}):
  | {
      date: Date;
      name: string;
      amountCents: number;
      currency: string;
      direction: TransactionDirection;
      category: string;
      merchant: string;
      isPending: boolean;
      providerRef: string;
    }[]
  | [] {
  const currency = opts.currency ?? "USD";
  const now = new Date();

  const out: {
    date: Date;
    name: string;
    amountCents: number;
    currency: string;
    direction: TransactionDirection;
    category: string;
    merchant: string;
    isPending: boolean;
    providerRef: string;
  }[] = [];

  for (let i = 0; i < opts.count; i += 1) {
    const dayOffset = Math.floor(Math.random() * opts.days);
    const date = new Date(now);
    date.setDate(now.getDate() - dayOffset);

    const direction: TransactionDirection = Math.random() < 0.12 ? "INFLOW" : "OUTFLOW";
    const category = direction === "INFLOW" ? "Income" : pick(categories);
    const merchant = direction === "INFLOW" ? "Employer" : pick(merchants);

    const amountCents =
      direction === "INFLOW"
        ? 100_00 * (20 + Math.floor(Math.random() * 35))
        : 100 * (500 + Math.floor(Math.random() * 25_000));

    const name = direction === "INFLOW" ? "Payroll" : `${merchant} - ${category}`;

    out.push({
      date,
      name,
      amountCents,
      currency,
      direction,
      category,
      merchant,
      isPending: Math.random() < 0.03,
      providerRef: `demo_${date.getTime()}_${i}`,
    });
  }

  return out;
}

export function defaultDemoBudgets(now = new Date()): { year: number; month: number; category: string; limitCents: number }[] {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return [
    { year, month, category: "Groceries", limitCents: 600_00 },
    { year, month, category: "Dining", limitCents: 250_00 },
    { year, month, category: "Entertainment", limitCents: 180_00 },
    { year, month, category: "Shopping", limitCents: 300_00 },
    { year, month, category: "Transport", limitCents: 160_00 },
    { year, month, category: "Subscriptions", limitCents: 80_00 },
  ];
}
