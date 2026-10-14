import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/portal/auth-form";
import { PageHero } from "@/components/ui";
import { portalCopy } from "@/content/portal";
import { locales, type Locale } from "@/content/site";
const screens = [
  "sign-in",
  "sign-up",
  "verify-email",
  "forgot-password",
  "reset-password",
  "resend-verification",
  "two-factor",
];
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; screen: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "ar" ? "بوابة العملاء | العباس" : "Client portal | Alabbas",
    robots: { index: false, follow: false },
  };
}
export default async function AuthPage({
  params,
}: {
  params: Promise<{ locale: string; screen: string }>;
}) {
  const p = await params;
  if (!locales.includes(p.locale as Locale) || !screens.includes(p.screen))
    notFound();
  const locale = p.locale as Locale;
  const c = portalCopy[locale];
  const title = (
    {
      "sign-in": c.signIn,
      "sign-up": c.signUp,
      "verify-email": c.verify,
      "forgot-password": c.forgot,
      "reset-password": c.reset,
      "resend-verification": c.resend,
      "two-factor": c.twoFactor,
    } as Record<string, string>
  )[p.screen];
  return (
    <>
      <PageHero label={c.portal} title={title} />
      <section className="section">
        <div className="container portal-form-container">
          <AuthForm
            key={`${locale}:${p.screen}`}
            locale={locale}
            screen={p.screen}
          />
        </div>
      </section>
    </>
  );
}
