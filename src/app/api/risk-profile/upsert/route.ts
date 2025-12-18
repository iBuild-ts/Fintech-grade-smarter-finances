import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const bodySchema = z.object({
  // 0..1
  riskTolerance: z.number().min(0).max(1),
  horizonYears: z.number().int().min(1).max(60),
  incomeStable: z.boolean(),
  hasEmergencyFund: z.boolean(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await prisma.riskProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: { ...parsed.data },
    select: {
      riskTolerance: true,
      horizonYears: true,
      incomeStable: true,
      hasEmergencyFund: true,
      updatedAt: true,
    },
  });

  await auditLog({
    userId: user.id,
    action: "risk_profile.upsert",
    entity: "RiskProfile",
    meta: profile,
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ profile }, { status: 200 });
}
