import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const bodySchema = z.object({
  id: z.string().min(1),
  isRead: z.boolean(),
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

  const existing = await prisma.alert.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true, isRead: true },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await prisma.alert.update({
    where: { id: existing.id },
    data: { isRead: parsed.data.isRead },
    select: { id: true, isRead: true },
  });

  await auditLog({
    userId: user.id,
    action: "alert.mark",
    entity: "Alert",
    entityId: updated.id,
    meta: { isRead: updated.isRead },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ alert: updated }, { status: 200 });
}
