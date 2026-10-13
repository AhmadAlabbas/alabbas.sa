import { NextRequest } from "next/server";
import {
  body,
  context,
  ensureEnabled,
  failure,
  json,
  SESSION_COOKIE,
} from "@/lib/portal/http";
import { saveKyc } from "@/lib/portal/kyc";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    ensureEnabled();
    return json(
      await saveKyc(
        request.cookies.get(SESSION_COOKIE)?.value,
        await body(request),
        true,
        context(request),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
