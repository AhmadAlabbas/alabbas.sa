"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  audiences,
  capabilities,
  copy,
  type Locale,
  text,
} from "@/content/site";
import { Arrow } from "./ui";
import { Brand } from "./brand";
export function Header({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const other = locale === "en" ? "ar" : "en";
  const switchPath = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${other}`);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const closeMenu = () => setOpen(null);
  return (
    <header
      className="site-header"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          const control = root.current?.querySelector<HTMLButtonElement>(
            `[aria-expanded="true"]`,
          );
          setOpen(null);
          control?.focus();
        }
      }}
    >
      <div className="header-inner container">
        <Link
          href={`/${locale}`}
          className="wordmark"
          aria-label={locale === "ar" ? "العباس، الرئيسية" : "Alabbas home"}
          onClick={closeMenu}
        >
          <Brand />
        </Link>
        <nav
          className="desktop-nav"
          aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}
        >
          <Link
            href={`/${locale}/about`}
            aria-current={pathname.endsWith("/about") ? "page" : undefined}
          >
            {c.about}
          </Link>
          {["solutions", "clients"].map((key) => (
            <div key={key} className="nav-group">
              <button
                type="button"
                aria-expanded={open === key}
                aria-controls={`mega-${key}`}
                onClick={() => setOpen(open === key ? null : key)}
              >
                <span>{key === "solutions" ? c.solutions : c.clients}</span>
                <svg
                  className="nav-chevron"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="m3 4.5 3 3 3-3" />
                </svg>
              </button>
              {open === key && (
                <div id={`mega-${key}`} className="mega-menu">
                  <div>
                    <p className="eyebrow">
                      {key === "solutions" ? c.investment : c.clients}
                    </p>
                    <Link
                      className="mega-overview"
                      href={`/${locale}/${key}`}
                      onClick={closeMenu}
                    >
                      {key === "solutions" ? c.solutions : c.clients}
                      <Arrow />
                    </Link>
                  </div>
                  <div className="mega-links">
                    {(key === "solutions" ? capabilities : audiences).map(
                      (item) => (
                        <Link
                          href={`/${locale}/${key}/${item.slug}`}
                          key={item.slug}
                          onClick={closeMenu}
                        >
                          {text(item, locale)}
                          <Arrow />
                        </Link>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <Link href={`/${locale}/insights`}>{c.insights}</Link>
          <Link href={`/${locale}/careers`}>{c.careers}</Link>
        </nav>
        <div className="header-actions">
          <Link
            href={switchPath}
            className="language"
            lang={other}
            hrefLang={other}
            onClick={closeMenu}
          >
            {locale === "en" ? "العربية" : "English"}
          </Link>
          <Link
            className="header-contact"
            href={`/${locale}/contact`}
            onClick={closeMenu}
          >
            {c.contact}
            <Arrow diagonal />
          </Link>
          <button
            className="mobile-toggle"
            type="button"
            aria-expanded={open === "mobile"}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(open === "mobile" ? null : "mobile")}
          >
            {open === "mobile" ? c.close : c.menu}
            <span aria-hidden="true">{open === "mobile" ? "×" : "☰"}</span>
          </button>
        </div>
      </div>
      {open === "mobile" && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label={locale === "ar" ? "قائمة الهاتف" : "Mobile navigation"}
        >
          {[
            ["about", c.about],
            ["solutions", c.solutions],
            ["clients", c.clients],
            ["insights", c.insights],
            ["careers", c.careers],
            ["contact", c.contact],
          ].map(([path, label]) => (
            <Link key={path} href={`/${locale}/${path}`} onClick={closeMenu}>
              {label}
              <Arrow />
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
