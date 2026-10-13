import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/content/site";
import { portalCopy } from "@/content/portal";
import { AuthForm } from "@/components/portal/auth-form";
import { AccountSecurity } from "@/components/portal/security";
import { PageHero } from "@/components/ui";
export const dynamicParams = false;
const screens = [
  "sign-in",
  "sign-up",
  "two-factor",
  "verify-email",
  "forgot-password",
  "reset-password",
  "resend-verification",
  "security",
];
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    [[], ...screens.map((screen) => [screen])].map((screen) => ({
      locale,
      screen,
    })),
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "ar"
        ? "عرض بوابة العملاء التجريبي | العباس"
        : "Client portal demo | Alabbas",
    robots: { index: false, follow: false },
  };
}
export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string; screen?: string[] }>;
}) {
  const { locale, screen } = await params;
  if (!locales.includes(locale as Locale) || (screen && screen.length > 1))
    notFound();
  const view = screen?.[0] || "sign-in";
  if (!screens.includes(view)) notFound();
  const lang = locale as Locale;
  const c = portalCopy[lang];
  const titles: Record<string, string> = {
    "sign-in": c.signIn,
    "sign-up": c.signUp,
    "two-factor": c.twoFactor,
    "verify-email": c.verify,
    "forgot-password": c.forgot,
    "reset-password": c.reset,
    "resend-verification": c.resend,
    security: c.security,
  };
  return (
    <>
      <PageHero
        label={
          lang === "ar" ? "عرض بوابة العملاء التجريبي" : "Client portal demo"
        }
        title={titles[view]}
      />
      <section className="section">
        <div
          className={`container ${view === "security" ? "portal-security-container" : "portal-form-container"}`}
        >
          {view === "security" ? (
            <AccountSecurity key={lang} locale={lang} />
          ) : (
            <AuthForm key={`${lang}:${view}`} locale={lang} screen={view} />
          )}
        </div>
      </section>
    </>
  );
}
