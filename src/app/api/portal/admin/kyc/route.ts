import { NextRequest } from "next/server";
import {
  body,
  context,
  ensureEnabled,
  failure,
  json,
  SESSION_COOKIE,
} from "@/lib/portal/http";
import { reviewDetail, reviewKyc, reviewQueue } from "@/lib/portal/kyc";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    ensureEnabled();
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const id = request.nextUrl.searchParams.get("id");
    const page = request.nextUrl.searchParams.get("page") || "0";
    if (!/^\d{1,4}$/.test(page)) return json({ error: "INVALID" }, 400);
    if (id && !/^[a-zA-Z0-9]{1,30}$/.test(id))
      return json({ error: "INVALID" }, 400);
    return json(
      id
        ? await reviewDetail(token, id, context(request))
        : await reviewQueue(token, Number(page)),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    ensureEnabled();
    return json(
      await reviewKyc(
        request.cookies.get(SESSION_COOKIE)?.value,
        await body(request),
        context(request),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
