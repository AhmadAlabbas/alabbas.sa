import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ensureEnabled,
  failure,
  json,
  SESSION_COOKIE,
} from "@/lib/portal/http";
import { ownDashboard } from "@/lib/portal/dashboard";
import { periods } from "@/lib/portal/dashboard-model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    ensureEnabled();
    const parsed = z
      .strictObject({ period: z.enum(periods).default("1Y") })
      .safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return json({ error: "INVALID" }, 400);
    return json(
      await ownDashboard(
        request.cookies.get(SESSION_COOKIE)?.value,
        parsed.data.period,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
