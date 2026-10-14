import { NextRequest } from "next/server";
import { portalConfig } from "@/lib/portal/config";
import { equalSecret } from "@/lib/portal/crypto";
import { ensureEnabled, failure, json } from "@/lib/portal/http";
import { runMaintenance } from "@/lib/portal/email";
import { retryBankRevocations } from "@/lib/portal/banks";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    ensureEnabled();
    const auth = request.headers.get("authorization") || "";
    if (!equalSecret(auth, `Bearer ${portalConfig().PORTAL_CRON_SECRET}`))
      return json({ error: "FORBIDDEN" }, 403);
    const [maintenance, revocations] = await Promise.all([
      runMaintenance(),
      retryBankRevocations(),
    ]);
    return json({ ...maintenance, ...revocations });
  } catch (error) {
    return failure(error);
  }
}
