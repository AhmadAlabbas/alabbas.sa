import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/en/auth",
        "/ar/auth",
        "/en/portal",
        "/ar/portal",
        "/auth",
        "/portal",
        "/en/demo/portal",
        "/ar/demo/portal",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
