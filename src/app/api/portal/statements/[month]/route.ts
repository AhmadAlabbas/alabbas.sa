import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/portal/db";
import {
  context,
  ensureEnabled,
  failure,
  SESSION_COOKIE,
  PortalError,
} from "@/lib/portal/http";
import { dashboardSession } from "@/lib/portal/dashboard";
import { audit } from "@/lib/portal/sessions";
import { rateLimit } from "@/lib/portal/limits";
import { statementMonths } from "@/lib/portal/dashboard-model";
import { renderSampleStatement } from "@/lib/portal/statement-pdf";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> },
) {
  try {
    ensureEnabled();
    const session = await dashboardSession(
      request.cookies.get(SESSION_COOKIE)?.value,
    );
    const { month } = await params;
    const query = z
      .strictObject({ locale: z.enum(["en", "ar"]).default("en") })
      .safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!query.success) throw new PortalError(400, "INVALID");
    if (!(statementMonths as readonly string[]).includes(month))
      throw new PortalError(404, "NOT_FOUND");
    await rateLimit("statement-download", session.userId, 6);
    const pdf = await renderSampleStatement(month, query.data.locale);
    await db().$transaction((tx) =>
      audit(tx, session.userId, "SAMPLE_STATEMENT_GENERATED", context(request)),
    );
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="alabbas-sample-${month}-${query.data.locale}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store, private",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
