import { NextRequest } from "next/server";
import {
  authActions,
  performAuth,
  type AuthAction,
} from "@/lib/portal/service";
import {
  body,
  context,
  cookieOptions,
  ensureEnabled,
  failure,
  json,
  SESSION_COOKIE,
} from "@/lib/portal/http";
export const runtime = "nodejs";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    ensureEnabled();
    const { action } = await params;
    if (!authActions.includes(action)) return json({ error: "NOT_FOUND" }, 404);
    const data = await body(request);
    const result = await performAuth(
      action as AuthAction,
      data,
      request.cookies.get(SESSION_COOKIE)?.value,
      context(request),
    );
    const { sessionToken, sessionSeconds, clearSession, ...safe } =
      result as typeof result & {
        sessionToken?: string;
        sessionSeconds?: number;
        clearSession?: boolean;
      };
    const response = json(safe);
    if (sessionToken)
      response.cookies.set(SESSION_COOKIE, sessionToken, {
        ...cookieOptions,
        maxAge: sessionSeconds,
      });
    if (clearSession)
      response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return failure(error);
  }
}
