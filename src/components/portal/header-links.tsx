"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/content/site";
import { portalCopy } from "@/content/portal";
export function PortalHeaderLinks({ locale }: { locale: Locale }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/client-access", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((data) => setEnabled(data.enabled === true))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (!enabled) return null;
  const c = portalCopy[locale];
  return (
    <div className="portal-header-links">
      <Link href={`/${locale}/auth/sign-in`}>{c.signIn}</Link>
      <Link href={`/${locale}/auth/sign-up`}>{c.signUp}</Link>
    </div>
  );
}
