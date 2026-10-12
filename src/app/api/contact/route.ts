import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
export const runtime = "nodejs";
const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  organization: z.string().trim().max(160).optional().default(""),
  clientType: z.enum([
    "individuals",
    "institutions",
    "governments",
    "investor-relations",
    "careers",
    "general",
  ]),
  message: z.string().trim().min(20).max(5000),
  consent: z.literal(true),
  locale: z.enum(["en", "ar"]),
  website: z.string().max(500).optional().default(""),
});
// Best-effort per-instance limit. Use a shared limiter at the edge before a public launch.
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    origin !== `${request.nextUrl.protocol}//${request.headers.get("host")}` &&
    origin !== process.env.SITE_URL
  )
    return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({ error: "JSON required" }, { status: 415 });
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.until < now) attempts.delete(key);
  const limit = attempts.get(ip);
  if (limit && limit.count >= 5)
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.until - now) / 1000)),
        },
      },
    );
  if (attempts.size >= 10000 && !limit)
    return NextResponse.json({ error: "Please try later" }, { status: 429 });
  attempts.set(ip, {
    count: (limit?.count || 0) + 1,
    until: limit?.until || now + 60000,
  });
  if (Number(request.headers.get("content-length")) > 20000)
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 20000)
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid enquiry fields" },
      { status: 400 },
    );
  if (parsed.data.website) return NextResponse.json({ ok: true });
  const endpoint = process.env.CONTACT_WEBHOOK_URL;
  if (!endpoint)
    return NextResponse.json(
      { error: "Delivery unavailable" },
      { status: 503 },
    );
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") throw new Error("HTTPS required");
    const { website, ...enquiry } = parsed.data;
    void website;
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CONTACT_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.CONTACT_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(enquiry),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
      cache: "no-store",
    });
    if (!upstream.ok) throw new Error("Delivery failed");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Delivery unavailable" },
      { status: 503 },
    );
  }
}
