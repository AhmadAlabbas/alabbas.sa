import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { portalEnabled } from "@/lib/portal/feature";
import { currentSession } from "@/lib/portal/sessions";
import Link from "next/link";
import { kycCopy } from "@/content/kyc";
import { dashboardCopy } from "@/content/dashboard";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await connection();
  if (!portalEnabled()) notFound();
  const { locale } = await params;
  try {
    await currentSession();
  } catch {
    redirect(`/${locale}/auth/sign-in`);
  }
  const session = await currentSession();
  const lang = locale === "ar" ? "ar" : "en";
  const c = kycCopy[lang];
  return (
    <>
      <nav
        className="container portal-form-links portal-navigation"
        aria-label={
          lang === "ar" ? "تنقل بوابة العملاء" : "Client portal navigation"
        }
      >
        <Link href={`/${locale}/portal/security`}>{c.security}</Link>
        {session.user.role === "CLIENT" && (
          <Link href={`/${locale}/portal/dashboard`}>
            {dashboardCopy[lang].dashboard}
          </Link>
        )}
        {session.user.role === "CLIENT" ? (
          <Link href={`/${locale}/portal/kyc`}>{c.onboarding}</Link>
        ) : (
          <Link href={`/${locale}/portal/admin/kyc`}>{c.review}</Link>
        )}
      </nav>
      {children}
    </>
  );
}
