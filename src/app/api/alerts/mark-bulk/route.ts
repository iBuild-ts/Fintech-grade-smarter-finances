import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
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

  const result = await prisma.alert.updateMany({
    where: { userId: user.id, id: { in: parsed.data.ids } },
    data: { isRead: parsed.data.isRead },
  });

  await auditLog({
    userId: user.id,
    action: "alert.mark_bulk",
    entity: "Alert",
    meta: { isRead: parsed.data.isRead, count: result.count },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, updated: result.count }, { status: 200 });
}
