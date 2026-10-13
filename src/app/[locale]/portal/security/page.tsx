import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { AccountSecurity } from "@/components/portal/security";
import { portalCopy } from "@/content/portal";
import { locales, type Locale } from "@/content/site";
import { notFound } from "next/navigation";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "ar" ? "أمن الحساب | العباس" : "Account security | Alabbas",
    robots: { index: false, follow: false },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const lang = locale as Locale;
  const c = portalCopy[lang];
  return (
    <>
      <PageHero label={c.portal} title={c.title} description={c.intro} />
      <section className="section">
        <div className="container portal-security-container">
          <AccountSecurity locale={lang} />
        </div>
      </section>
    </>
  );
}
