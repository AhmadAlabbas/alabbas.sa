import type { MetadataRoute } from "next";
import { locales, paths, siteUrl } from "@/content/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) =>
    locales.map((locale) => {
      const suffix = path ? `/${path}` : "";
      return {
        url: `${siteUrl}/${locale}${suffix}`,
        alternates: {
          languages: {
            en: `${siteUrl}/en${suffix}`,
            ar: `${siteUrl}/ar${suffix}`,
          },
        },
        changeFrequency: path.startsWith("insights")
          ? ("weekly" as const)
          : ("monthly" as const),
        priority: path ? 0.7 : 1,
      };
    }),
  );
}
