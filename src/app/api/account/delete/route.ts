import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const bodySchema = z.object({
  confirm: z.literal("DELETE"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Log first (will be removed as part of deletion, but provides trace if deletion fails mid-way).
  await auditLog({
    userId: user.id,
    action: "account.delete_requested",
    entity: "User",
    entityId: user.id,
    meta: { email: user.email },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  await prisma.$transaction([
    prisma.contractDeployment.deleteMany({ where: { userId: user.id } }),
    prisma.wallet.deleteMany({ where: { userId: user.id } }),
    prisma.externalAccount.deleteMany({ where: { userId: user.id } }),
    prisma.plaidItem.deleteMany({ where: { userId: user.id } }),
    prisma.transaction.deleteMany({ where: { userId: user.id } }),
    prisma.budget.deleteMany({ where: { userId: user.id } }),
    prisma.insight.deleteMany({ where: { userId: user.id } }),
    prisma.alert.deleteMany({ where: { userId: user.id } }),
    prisma.auditLog.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  return NextResponse.json({ ok: true }, { status: 200 });
}
