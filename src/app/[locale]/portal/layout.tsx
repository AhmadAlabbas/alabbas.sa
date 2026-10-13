import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { portalEnabled } from "@/lib/portal/feature";
import { currentSession } from "@/lib/portal/sessions";
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
  return children;
}
