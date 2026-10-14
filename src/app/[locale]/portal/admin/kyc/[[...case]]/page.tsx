import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui";
import { KycReview } from "@/components/portal/kyc-review";
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
      locale === "ar"
        ? "مراجعة الامتثال | العباس"
        : "Compliance review | Alabbas",
    robots: { index: false, follow: false },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; case?: string[] }>;
}) {
  const { locale, case: segments } = await params;
  if (
    !locales.includes(locale as Locale) ||
    (segments &&
      (segments.length !== 1 || !/^[a-zA-Z0-9]{1,30}$/.test(segments[0])))
  )
    notFound();
  const session = await currentSession();
  if (
    !["ADMIN", "COMPLIANCE_OFFICER", "RELATIONSHIP_MANAGER"].includes(
      session.user.role,
    ) ||
    (segments && session.user.role === "RELATIONSHIP_MANAGER")
  )
    notFound();
  const lang = locale as Locale,
    c = kycCopy[lang];
  return (
    <>
      <PageHero label={c.review} title={c.review} description={c.staffIntro} />
      <section className="section">
        <div className="container portal-security-container">
          <KycReview locale={lang} id={segments?.[0]} />
        </div>
      </section>
    </>
  );
}
