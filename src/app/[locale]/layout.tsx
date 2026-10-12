import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Consent } from "@/components/consent";
import { copy, locales, siteUrl, type Locale } from "@/content/site";
import "../globals.css";
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: language } = await params;
  if (!locales.includes(language as Locale)) notFound();
  const locale = language as Locale;
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Alabbas",
    url: siteUrl,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Riyadh",
      addressCountry: "SA",
    },
  };
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <head>
        {[400, 500, 600].map((weight) => (
          <link
            key={weight}
            rel="preload"
            href={`/fonts/${locale === "ar" ? "arabic" : "inter"}-${weight}.woff2`}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body>
        <a className="skip-link" href="#main">
          {copy[locale].skip}
        </a>
        <Header locale={locale} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer locale={locale} />
        <Consent locale={locale} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organization).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
