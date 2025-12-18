import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

  const insights = await prisma.insight.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, content: true, createdAt: true, meta: true, type: true },
  });

  const recurring = insights
    .filter((i: { meta: unknown }) => {
      const meta = i.meta as { recurring?: boolean } | null;
      return Boolean(meta?.recurring);
    })
    .slice(0, 10);

  return NextResponse.json({ subscriptions: recurring }, { status: 200 });
}
