import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home } from "@/components/home";
import { ContentPage } from "@/components/pages";
import {
  articles,
  audiences,
  capabilities,
  copy,
  description,
  locales,
  paths,
  siteUrl,
  text,
  type Locale,
} from "@/content/site";
type Props = { params: Promise<{ locale: string; slug?: string[] }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    paths.map((path) => ({ locale, slug: path ? path.split("/") : [] })),
  );
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  if (!locales.includes(p.locale as Locale)) return {};
  const locale = p.locale as Locale;
  const slug = p.slug?.join("/") || "";
  const c = copy[locale];
  const titles: Record<string, string> = {
    "": locale === "en" ? "Investing for generations" : "نستثمر للأجيال",
    about: c.about,
    solutions: c.solutions,
    clients: c.clients,
    insights: c.insights,
    careers: c.careers,
    contact: c.contact,
    "legal/privacy": c.privacy,
    "legal/terms": c.terms,
    "legal/cookies": c.cookies,
    "legal/disclosures": c.disclosures,
  };
  const item = slug.startsWith("solutions/")
    ? capabilities.find((i) => i.slug === p.slug?.[1])
    : slug.startsWith("clients/")
      ? audiences.find((i) => i.slug === p.slug?.[1])
      : slug.startsWith("insights/")
        ? articles.find((i) => i.slug === p.slug?.[1])
        : undefined;
  const title = `${item ? text(item, locale) : titles[slug] || "Alabbas"} | ${locale === "en" ? "Alabbas" : "العباس"}`;
  const desc = item
    ? description(item, locale)
    : slug === "about"
      ? c.aboutText
      : slug === "contact"
        ? c.contactText
        : slug === "careers"
          ? c.careersText
          : c.heroText;
  const suffix = slug ? `/${slug}` : "";
  const url = `${siteUrl}/${locale}${suffix}`;
  return {
    metadataBase: new URL(siteUrl),
    title,
    description: desc,
    alternates: {
      canonical: url,
      languages: {
        en: `${siteUrl}/en${suffix}`,
        ar: `${siteUrl}/ar${suffix}`,
        "x-default": `${siteUrl}/en${suffix}`,
      },
    },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: "Alabbas",
      locale: locale === "en" ? "en_SA" : "ar_SA",
      alternateLocale: locale === "en" ? "ar_SA" : "en_SA",
      type: slug.startsWith("insights/") ? "article" : "website",
      images: [
        {
          url: "/assets/og.png",
          width: 1200,
          height: 630,
          alt: "Alabbas — Investing for generations",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: ["/assets/og.png"],
    },
  };
}
export default async function Page({ params }: Props) {
  const p = await params;
  const slug = p.slug?.join("/") || "";
  if (!locales.includes(p.locale as Locale) || !paths.includes(slug))
    notFound();
  const locale = p.locale as Locale;
  return slug ? (
    <ContentPage locale={locale} slug={slug} />
  ) : (
    <Home locale={locale} />
  );
}
