import { NextRequest } from "next/server";
import {
  body,
  context,
  ensureEnabled,
  failure,
  json,
  SESSION_COOKIE,
} from "@/lib/portal/http";
import { connectBank, listBankConnections } from "@/lib/portal/banks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    ensureEnabled();
    if (request.nextUrl.search) return json({ error: "INVALID" }, 400);
    return json(
      await listBankConnections(request.cookies.get(SESSION_COOKIE)?.value),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    ensureEnabled();
    return json(
      await connectBank(
        request.cookies.get(SESSION_COOKIE)?.value,
        await body(request),
        context(request),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
