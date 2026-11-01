import type { Metadata } from "next";
import { EntityApplicationForm } from "@/components/portal/entity-application-form";
import { locales, type Locale } from "@/content/site";
import { notFound } from "next/navigation";
export const metadata: Metadata = {
  title: "Institutional onboarding | ALABBAS",
  robots: { index: false, follow: false },
};
export default async function EntityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return <EntityApplicationForm locale={locale as Locale} />;
}
