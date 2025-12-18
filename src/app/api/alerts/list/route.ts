import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const severity = (url.searchParams.get("severity") ?? "").trim().toUpperCase();
  const read = (url.searchParams.get("read") ?? "").trim().toLowerCase();
  const resolved = (url.searchParams.get("resolved") ?? "unresolved").trim().toLowerCase();
  const limitRaw = Number(url.searchParams.get("limit") ?? "20");
  const take = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 20;

  const where: {
    userId: string;
    OR?: Array<{ title?: { contains: string; mode: "insensitive" }; content?: { contains: string; mode: "insensitive" } }>;
    severity?: "LOW" | "MEDIUM" | "HIGH";
    isRead?: boolean;
    resolvedAt?: Date | null | { not: null };
  } = { userId: user.id };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }

  if (severity === "LOW" || severity === "MEDIUM" || severity === "HIGH") {
    where.severity = severity;
  }

  if (read === "read") where.isRead = true;
  if (read === "unread") where.isRead = false;

  if (resolved === "resolved") where.resolvedAt = { not: null };
  if (resolved === "unresolved") where.resolvedAt = null;

  const alerts = await prisma.alert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      severity: true,
      title: true,
      content: true,
      isRead: true,
      createdAt: true,
      resolvedAt: true,
    },
  });

  return NextResponse.json({ alerts }, { status: 200 });
}
