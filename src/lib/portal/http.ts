import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { portalEnabled } from "./feature";
import { portalConfig } from "./config";
import { equalSecret, privateHash } from "./crypto";
export const SESSION_COOKIE = "__Host-alabbas-session";
export const CSRF_COOKIE = "__Host-alabbas-csrf";
export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
};
export class PortalError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export function ensureEnabled() {
  if (!portalEnabled()) throw new PortalError(404, "NOT_FOUND");
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
export function failure(error: unknown) {
  if (error instanceof PortalError)
    return json({ error: error.code }, error.status);
  return json({ error: "UNAVAILABLE" }, 503);
}
export function context(request: NextRequest) {
  const config = portalConfig();
  const header = config.PORTAL_TRUSTED_IP_HEADER;
  const network = header
    ? request.headers.get(header)?.split(",")[0]?.trim() || "unknown"
    : "shared-untrusted-network";
  return {
    networkHash: privateHash(`network:${network}`),
    userAgent: (request.headers.get("user-agent") || "Unknown browser").slice(
      0,
      180,
    ),
  };
}
export async function body(request: NextRequest) {
  ensureEnabled();
  const origin = request.headers.get("origin");
  if (origin !== portalConfig().SITE_URL) throw new PortalError(403, "CSRF");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new PortalError(415, "JSON_REQUIRED");
  const csrf = request.headers.get("x-csrf-token") || "";
  const cookie = request.cookies.get(CSRF_COOKIE)?.value || "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(csrf) || !equalSecret(csrf, cookie))
    throw new PortalError(403, "CSRF");
  if (Number(request.headers.get("content-length")) > 8192)
    throw new PortalError(413, "TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new PortalError(400, "INVALID");
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new PortalError(413, "TOO_LARGE");
    }
    parts.push(item.value);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } catch {
    throw new PortalError(400, "INVALID");
  }
}
