import "server-only";
import { cookies } from "next/headers";
import { Role, SessionKind, type Prisma, type User } from "@prisma/client";
import { db } from "./db";
import { randomToken, tokenHash } from "./crypto";
import { PortalError, SESSION_COOKIE } from "./http";
export const IDLE_MS = 15 * 60 * 1000;
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export type RequestContext = { networkHash: string; userAgent: string };
export async function audit(
  tx: Prisma.TransactionClient,
  userId: string | null,
  action: string,
  ctx: RequestContext,
) {
  await tx.auditEvent.create({ data: { userId, action, ...ctx } });
}
export async function issueSession(
  tx: Prisma.TransactionClient,
  user: User,
  kind: SessionKind,
  ctx: RequestContext,
) {
  const token = randomToken();
  const now = new Date();
  const session = await tx.session.create({
    data: {
      tokenHash: tokenHash(token),
      userId: user.id,
      kind,
      passwordVersion: user.passwordVersion,
      expiresAt: new Date(
        now.getTime() + (kind === "CHALLENGE" ? 5 * 60 * 1000 : ABSOLUTE_MS),
      ),
      ...ctx,
    },
  });
  return { token, session };
}
export async function sessionFromToken(
  token: string | undefined,
  kind: SessionKind = "AUTHENTICATED",
) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new PortalError(401, "SIGN_IN");
  const session = await db().session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });
  const now = Date.now();
  if (
    !session ||
    session.kind !== kind ||
    session.expiresAt.getTime() <= now ||
    session.passwordVersion !== session.user.passwordVersion ||
    session.user.status === "SUSPENDED" ||
    !session.user.emailVerifiedAt ||
    (kind === "AUTHENTICATED" &&
      (!session.user.emailVerifiedAt ||
        !session.user.totpEnabledAt ||
        session.lastSeenAt.getTime() + IDLE_MS <= now))
  )
    throw new PortalError(401, "SIGN_IN");
  if (kind === "AUTHENTICATED") {
    const changed = await db().session.updateMany({
      where: {
        id: session.id,
        kind,
        expiresAt: { gt: new Date(now) },
        lastSeenAt: { gt: new Date(now - IDLE_MS) },
        user: {
          passwordVersion: session.passwordVersion,
          status: { not: "SUSPENDED" },
          emailVerifiedAt: { not: null },
          totpEnabledAt: { not: null },
        },
      },
      data: { lastSeenAt: new Date(now) },
    });
    if (changed.count !== 1) throw new PortalError(401, "SIGN_IN");
  }
  return session;
}
export async function currentSession(kind: SessionKind = "AUTHENTICATED") {
  return sessionFromToken((await cookies()).get(SESSION_COOKIE)?.value, kind);
}
export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) throw new PortalError(403, "FORBIDDEN");
}
