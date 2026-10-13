import { NextRequest } from "next/server";
import {
  ensureEnabled,
  failure,
  json,
  cookieOptions,
  CSRF_COOKIE,
} from "@/lib/portal/http";
import { randomToken } from "@/lib/portal/crypto";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  try {
    ensureEnabled();
    const token = randomToken();
    const response = json({ csrfToken: token });
    response.cookies.set(CSRF_COOKIE, token, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: 600,
    });
    void request;
    return response;
  } catch (error) {
    return failure(error);
  }
}
