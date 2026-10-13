import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui";
import { KycForm } from "@/components/portal/kyc-form";
import { locales, type Locale } from "@/content/site";
import { kycCopy } from "@/content/kyc";
import { currentSession } from "@/lib/portal/sessions";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title:
      locale === "ar" ? "اعرف عميلك | العباس" : "Know your client | Alabbas",
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
  const session = await currentSession();
  if (
    session.user.role !== "CLIENT" ||
    session.user.accountType !== "INDIVIDUAL"
  )
    notFound();
  const lang = locale as Locale,
    c = kycCopy[lang];
  return (
    <>
      <PageHero label={c.onboarding} title={c.title} description={c.intro} />
      <section className="section">
        <div className="container portal-security-container">
          <KycForm locale={lang} />
        </div>
      </section>
    </>
  );
}
