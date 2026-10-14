import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { ensureEnabled, PortalError } from "./http";
import {
  sessionFromToken,
  requireRole,
  audit,
  type RequestContext,
} from "./sessions";
import { rateLimit } from "./limits";
import {
  sampleAsOf,
  sampleCashCents,
  sampleHoldings,
  samplePortfolioCents,
  samplePerformance,
  sampleNotices,
  statementMonths,
  type Period,
} from "./dashboard-model";
export async function dashboardSession(token: string | undefined) {
  ensureEnabled();
  const session = await sessionFromToken(token);
  requireRole(session.user.role, ["CLIENT"]);
  if (session.user.accountType !== "INDIVIDUAL")
    throw new PortalError(403, "FORBIDDEN");
  return session;
}
async function notificationList(userId: string, createdAt: Date) {
  const profile = await db().kycProfile.findUnique({
    where: { userId },
    select: { status: true, version: true, updatedAt: true },
  });
  const status = profile?.status ?? "DRAFT";
  const notices = [
    {
      id: `kyc-${status.toLowerCase()}-${profile?.version ?? 0}`,
      kind: `KYC_${status}`,
      createdAt: (profile?.updatedAt ?? createdAt).toISOString(),
      sample: false,
    },
    ...sampleNotices,
  ];
  const reads = await db().notificationRead.findMany({
    where: { userId, notificationKey: { in: notices.map((n) => n.id) } },
    select: { notificationKey: true, readAt: true },
  });
  return {
    status,
    notices: notices.map((n) => ({
      ...n,
      readAt:
        reads.find((r) => r.notificationKey === n.id)?.readAt.toISOString() ??
        null,
    })),
  };
}
export async function ownDashboard(token: string | undefined, period: Period) {
  const session = await dashboardSession(token);
  await rateLimit("dashboard-read", session.userId, 90);
  const { status, notices } = await notificationList(
    session.userId,
    session.user.createdAt,
  );
  return {
    sample: true,
    currency: "SAR",
    asOf: sampleAsOf,
    account: { status: session.user.status, kycStatus: status },
    balances: {
      portfolioCents: samplePortfolioCents,
      cashCents: sampleCashCents,
      holdingsCents: samplePortfolioCents - sampleCashCents,
    },
    holdings: sampleHoldings,
    performance: samplePerformance(period),
    statements: statementMonths,
    notifications: notices,
  };
}
export async function markNotificationRead(
  token: string | undefined,
  input: unknown,
  ctx: RequestContext,
) {
  const session = await dashboardSession(token);
  const parsed = z
    .strictObject({ id: z.string().min(1).max(60) })
    .safeParse(input);
  if (!parsed.success) throw new PortalError(400, "INVALID");
  await rateLimit("notification-write", session.userId, 30);
  const { notices } = await notificationList(
    session.userId,
    session.user.createdAt,
  );
  if (!notices.some((n) => n.id === parsed.data.id))
    throw new PortalError(404, "NOT_FOUND");
  // Per-user unique key and SQL upsert keep repeats idempotent and preserve first-read time.
  return db().$transaction(async (tx) => {
    const id = randomUUID().replace(/-/g, "").slice(0, 30);
    await tx.$executeRaw`INSERT INTO NotificationRead (id,userId,notificationKey,readAt)
      VALUES (${id},${session.userId},${parsed.data.id},${new Date()})
      ON DUPLICATE KEY UPDATE readAt = readAt`;
    const record = await tx.notificationRead.findUniqueOrThrow({
      where: {
        userId_notificationKey: {
          userId: session.userId,
          notificationKey: parsed.data.id,
        },
      },
    });
    // MySQL's CLIENT_FOUND_ROWS may report 1 for a duplicate no-op; compare the inserted ID.
    if (record.id === id)
      await audit(tx, session.userId, "NOTIFICATION_READ", ctx);
    return { ok: true };
  });
}
