import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { portalEnabled } from "@/lib/portal/feature";
import { siteUrl } from "@/content/site";
export function proxy(request: NextRequest) {
  if (!portalEnabled())
    return new NextResponse("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  const nonce = randomBytes(16).toString("base64");
  const organization = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Alabbas",
    url: siteUrl,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Riyadh",
      addressCountry: "SA",
    },
  }).replace(/</g, "\\u003c");
  const schemaHash = createHash("sha256").update(organization).digest("base64");
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'sha256-${schemaHash}'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`;
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export const config = {
  matcher: [
    "/en/auth/:path*",
    "/ar/auth/:path*",
    "/en/portal/:path*",
    "/ar/portal/:path*",
    "/auth/:path*",
    "/portal/:path*",
    "/api/auth/:path*",
    "/api/portal/:path*",
  ],
};
