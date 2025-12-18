import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsvCell(v: string) {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

type TxRow = {
  date: Date;
  name: string;
  amountCents: number;
  currency: string;
  direction: "INFLOW" | "OUTFLOW";
  category: string | null;
  merchant: string | null;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return new Response("unauthorized", { status: 401 });
  }

  const txs = (await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 5000,
    select: {
      date: true,
      name: true,
      amountCents: true,
      currency: true,
      direction: true,
      category: true,
      merchant: true,
    },
  })) as unknown as TxRow[];

  const header = [
    "date",
    "name",
    "amount",
    "currency",
    "direction",
    "category",
    "merchant",
  ];

  const rows = txs.map((t: TxRow) => {
    const signed = t.direction === "INFLOW" ? t.amountCents : -t.amountCents;
    const amount = (signed / 100).toFixed(2);

    return [
      t.date.toISOString(),
      t.name,
      amount,
      t.currency,
      t.direction,
      t.category ?? "",
      t.merchant ?? "",
    ].map((c: unknown) => escapeCsvCell(String(c)));
  });

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n") + "\n";

  const filename = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"${filename}\"`,
    },
  });
}
