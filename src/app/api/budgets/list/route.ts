import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const budgets = await prisma.budget.findMany({
    where: { userId: user.id, year: now.getFullYear(), month: now.getMonth() + 1 },
    orderBy: { category: "asc" },
    select: { id: true, category: true, limitCents: true, year: true, month: true },
  });

  return NextResponse.json({ budgets }, { status: 200 });
}
