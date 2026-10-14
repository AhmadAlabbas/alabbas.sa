import { portalEnabled } from "@/lib/portal/feature";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    { enabled: portalEnabled() },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
