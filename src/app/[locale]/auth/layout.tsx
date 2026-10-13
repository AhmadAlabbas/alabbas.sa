import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { portalEnabled } from "@/lib/portal/feature";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  if (!portalEnabled()) notFound();
  return children;
}
