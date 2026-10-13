import { NextRequest } from "next/server";
import {
  body,
  context,
  ensureEnabled,
  failure,
  json,
  SESSION_COOKIE,
} from "@/lib/portal/http";
import { ownKyc, saveKyc } from "@/lib/portal/kyc";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    ensureEnabled();
    return json(await ownKyc(request.cookies.get(SESSION_COOKIE)?.value));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    ensureEnabled();
    return json(
      await saveKyc(
        request.cookies.get(SESSION_COOKIE)?.value,
        await body(request),
        false,
        context(request),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
