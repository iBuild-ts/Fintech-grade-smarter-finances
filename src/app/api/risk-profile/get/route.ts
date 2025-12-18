import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await prisma.riskProfile.findUnique({
    where: { userId: user.id },
    select: {
      riskTolerance: true,
      horizonYears: true,
      incomeStable: true,
      hasEmergencyFund: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ profile }, { status: 200 });
}
