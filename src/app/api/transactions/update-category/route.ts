import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const bodySchema = z.object({
  id: z.string().min(1),
  category: z.string().trim().min(1).max(60),
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

  const tx = await prisma.transaction.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true },
  });
  if (!tx) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await prisma.transaction.update({
    where: { id: tx.id },
    data: { category: parsed.data.category },
    select: { id: true, category: true },
  });

  await auditLog({
    userId: user.id,
    action: "transaction.update_category",
    entity: "Transaction",
    entityId: updated.id,
    meta: { category: updated.category },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ transaction: updated }, { status: 200 });
}
