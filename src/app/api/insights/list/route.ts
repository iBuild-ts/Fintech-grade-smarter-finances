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
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 20,
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      score: true,
      isPinned: true,
      acknowledgedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ insights }, { status: 200 });
}
