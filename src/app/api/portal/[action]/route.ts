import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/portal/db";
import { decrypt, makeTotp } from "@/lib/portal/crypto";
import {
  ensureEnabled,
  failure,
  json,
  SESSION_COOKIE,
} from "@/lib/portal/http";
import { sessionFromToken } from "@/lib/portal/sessions";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    ensureEnabled();
    const { action } = await params;
    if (action !== "security" && action !== "totp-setup")
      return json({ error: "NOT_FOUND" }, 404);
    const session = await sessionFromToken(
      request.cookies.get(SESSION_COOKIE)?.value,
      action === "totp-setup" ? "CHALLENGE" : "AUTHENTICATED",
    );
    if (action === "totp-setup") {
      if (session.user.totpEnabledAt) return json({ enrollment: false });
      const secret = decrypt(
        session.user.totpSecret!,
        `totp:${session.userId}`,
      );
      const uri = makeTotp(secret, session.user.email).toString();
      return json({
        enrollment: true,
        secret,
        qrCode: await QRCode.toDataURL(uri, { margin: 2, width: 220 }),
      });
    }
    const [sessions, history, requests] = await Promise.all([
      db().session.findMany({
        where: {
          userId: session.userId,
          kind: "AUTHENTICATED",
          expiresAt: { gt: new Date() },
          lastSeenAt: { gt: new Date(Date.now() - 15 * 60 * 1000) },
        },
        select: {
          id: true,
          createdAt: true,
          lastSeenAt: true,
          userAgent: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db().auditEvent.findMany({
        where: {
          userId: session.userId,
          action: {
            in: [
              "LOGIN_SUCCESS",
              "LOGIN_FAILED",
              "LOGIN_UNVERIFIED",
              "TOTP_FAILED",
            ],
          },
        },
        select: { id: true, action: true, createdAt: true, userAgent: true },
        take: 30,
        orderBy: { createdAt: "desc" },
      }),
      db().dataRequest.findMany({
        where: { userId: session.userId },
        select: { id: true, kind: true, status: true, createdAt: true },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return json({
      account: {
        name: session.user.name,
        email: session.user.email,
        status: session.user.status,
        role: session.user.role,
        emailVerified: true,
        totpEnabled: true,
      },
      currentSessionId: session.id,
      sessions,
      history,
      requests,
    });
  } catch (error) {
    return failure(error);
  }
}
