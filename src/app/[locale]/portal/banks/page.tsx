import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PageHero } from "@/components/ui";
import { BankConnections } from "@/components/portal/bank-connections";
import { bankCopy } from "@/content/banks";
import { locales, type Locale } from "@/content/site";
import { SESSION_COOKIE, PortalError } from "@/lib/portal/http";
import { dashboardSession } from "@/lib/portal/dashboard";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title:
      locale === "ar"
        ? "الربط المصرفي التجريبي | العباس"
        : "Mock bank connections | Alabbas",
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
  try {
    await dashboardSession((await cookies()).get(SESSION_COOKIE)?.value);
  } catch (error) {
    if (error instanceof PortalError && error.status === 401)
      redirect(`/${locale}/auth/sign-in`);
    notFound();
  }
  const lang = locale as Locale,
    c = bankCopy[lang];
  return (
    <>
      <PageHero label={c.sample} title={c.title} description={c.intro} />
      <section className="section">
        <div className="container dashboard-container">
          <BankConnections locale={lang} />
        </div>
      </section>
    </>
  );
}
