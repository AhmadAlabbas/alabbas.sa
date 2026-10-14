import { NextRequest } from "next/server";
import {
  body,
  context,
  ensureEnabled,
  failure,
  json,
  SESSION_COOKIE,
} from "@/lib/portal/http";
import { markNotificationRead } from "@/lib/portal/dashboard";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    ensureEnabled();
    return json(
      await markNotificationRead(
        request.cookies.get(SESSION_COOKIE)?.value,
        await body(request),
        context(request),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
