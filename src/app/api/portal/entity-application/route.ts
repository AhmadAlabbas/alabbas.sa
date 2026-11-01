import { NextRequest } from "next/server";
import { body, context, ensureEnabled, failure, json, SESSION_COOKIE } from "@/lib/portal/http";
import { ownEntityApplication, submitEntityApplication } from "@/lib/portal/entity-applications";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    ensureEnabled();
    if (request.nextUrl.search) return json({ error: "INVALID" }, 400);
    return json(await ownEntityApplication(request.cookies.get(SESSION_COOKIE)?.value));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    ensureEnabled();
    return json(await submitEntityApplication(
      request.cookies.get(SESSION_COOKIE)?.value,
      await body(request),
      context(request),
    ), 201);
  } catch (error) {
    return failure(error);
  }
}
