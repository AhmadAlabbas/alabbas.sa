import { NextRequest } from "next/server";
import { z } from "zod";
import {
  body,
  context,
  ensureEnabled,
  failure,
  json,
  SESSION_COOKIE,
} from "@/lib/portal/http";
import {
  bankAccounts,
  bankTransactions,
  disconnectBank,
} from "@/lib/portal/banks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string; action: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  try {
    ensureEnabled();
    const { id, action } = await params;
    if (!/^[a-zA-Z0-9]{1,30}$/.test(id)) return json({ error: "INVALID" }, 400);
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (action === "accounts") {
      if (request.nextUrl.search) return json({ error: "INVALID" }, 400);
      return json(await bankAccounts(token, id));
    }
    if (action === "transactions") {
      const parsed = z
        .strictObject({
          accountId: z.string().min(1).max(80),
          cursor: z.literal("3").optional(),
        })
        .safeParse(Object.fromEntries(request.nextUrl.searchParams));
      if (!parsed.success) return json({ error: "INVALID" }, 400);
      return json(
        await bankTransactions(
          token,
          id,
          parsed.data.accountId,
          parsed.data.cursor ?? null,
        ),
      );
    }
    return json({ error: "NOT_FOUND" }, 404);
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest, { params }: Context) {
  try {
    ensureEnabled();
    const { id, action } = await params;
    if (action !== "disconnect") return json({ error: "NOT_FOUND" }, 404);
    if (!/^[a-zA-Z0-9]{1,30}$/.test(id)) return json({ error: "INVALID" }, 400);
    const parsed = z.strictObject({}).safeParse(await body(request));
    if (!parsed.success) return json({ error: "INVALID" }, 400);
    const result = await disconnectBank(
      request.cookies.get(SESSION_COOKIE)?.value,
      id,
      context(request),
    );
    return json(result, result.providerRevoked ? 200 : 202);
  } catch (error) {
    return failure(error);
  }
}
