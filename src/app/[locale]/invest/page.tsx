import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvestmentSandbox } from "@/components/investment-sandbox";
import "./investment.css";

export const metadata: Metadata = {
  title: "Investment experience preview | ALABBAS",
  description: "A safe, fictional investment platform preview. No real securities or accounts.",
  robots: { index: false, follow: false },
};
export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}
export default async function InvestmentPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") notFound();
  return <InvestmentSandbox locale={locale} />;
}
