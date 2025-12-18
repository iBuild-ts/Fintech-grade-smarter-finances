import { prisma } from "@/lib/prisma";

export async function auditLog(input: {
  userId: string;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      meta: input.meta as any,
      ip: input.ip ?? undefined,
      userAgent: input.userAgent ?? undefined,
    },
    select: { id: true },
  });
}
