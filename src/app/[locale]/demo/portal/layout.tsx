import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/content/site";
import { PortalDemoProvider } from "@/components/portal/demo-provider";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function DemoLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return (
    <PortalDemoProvider locale={locale as Locale}>
      {children}
    </PortalDemoProvider>
  );
}
