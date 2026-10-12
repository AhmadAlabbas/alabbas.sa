import Image from "next/image";
import Link from "next/link";
import {
  audiences,
  capabilities,
  copy,
  description,
  text,
  type Locale,
} from "@/content/site";
import { Arrow, Button, Heading } from "./ui";
import { Stats } from "./stats";
import { InsightGrid } from "./insight-grid";
export function CTA({ locale }: { locale: Locale }) {
  const c = copy[locale];
  return (
    <section className="cta-section">
      <div className="container cta-inner">
        <div>
          <p className="eyebrow">{c.contact}</p>
          <h2>{c.cta}</h2>
          <p>{c.ctaText}</p>
        </div>
        <Button href={`/${locale}/contact`}>{c.contact}</Button>
      </div>
    </section>
  );
}
export function AudienceCards({ locale }: { locale: Locale }) {
  const c = copy[locale];
  return (
    <div className="audience-grid">
      {audiences.map((a, i) => (
        <Link
          className="audience-card"
          key={a.slug}
          href={`/${locale}/clients/${a.slug}`}
        >
          <span className="card-number">0{i + 1}</span>
          <div className={`audience-symbol symbol-${i}`} aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <h3>{text(a, locale)}</h3>
          <p>{description(a, locale)}</p>
          <span className="card-link">
            {c.discover}
            <Arrow />
          </span>
        </Link>
      ))}
    </div>
  );
}
export function CapabilityList({ locale }: { locale: Locale }) {
  return (
    <div className="capability-list">
      {capabilities.map((a) => (
        <Link
          href={`/${locale}/solutions/${a.slug}`}
          className="capability-row"
          key={a.slug}
        >
          <span className="card-number">{a.number}</span>
          <h3>{text(a, locale)}</h3>
          <p>{description(a, locale)}</p>
          <Arrow diagonal />
        </Link>
      ))}
    </div>
  );
}
export function Home({ locale }: { locale: Locale }) {
  const c = copy[locale];
  return (
    <>
      <section className="home-hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow gold">{c.eyebrow}</p>
            <h1>
              {c.hero[0]}
              <br />
              <span>{c.hero[1]}</span>
            </h1>
            <p className="hero-description">{c.heroText}</p>
            <div className="hero-actions">
              <Button href={`/${locale}/solutions`}>{c.solutions}</Button>
              <Link className="hero-contact" href={`/${locale}/contact`}>
                {c.contact}
                <Arrow />
              </Link>
            </div>
            <div className="hero-bottom">
              <span>
                {locale === "en"
                  ? "CONVICTION. DISCIPLINE. PERSPECTIVE."
                  : "قناعة. انضباط. رؤية."}
              </span>
              <span aria-hidden="true">↓</span>
            </div>
          </div>
          <div className="hero-art">
            <Image
              src="/assets/architecture.svg"
              alt={
                locale === "en"
                  ? "Abstract architectural study of intersecting towers"
                  : "دراسة معمارية تجريدية لأبراج متقاطعة"
              }
              width={1200}
              height={1400}
              loading="eager"
              fetchPriority="high"
              decoding="sync"
              unoptimized
            />
            <div className="art-label">
              <span>01 /</span>
              <span>
                {locale === "en" ? "THE LONG VIEW" : "الرؤية البعيدة"}
              </span>
            </div>
          </div>
        </div>
      </section>
      <Stats locale={locale} />
      <section className="section philosophy">
        <div className="container two-column">
          <Heading label={c.about} title={c.philosophy} />
          <div className="philosophy-copy">
            <p>{c.philosophyText}</p>
            <Link className="underlined-link" href={`/${locale}/about`}>
              {c.about}
              <Arrow />
            </Link>
          </div>
        </div>
      </section>
      <section className="section serve-section">
        <div className="container">
          <Heading
            label={c.clients}
            title={c.serveTitle}
            description={c.serveText}
          />
          <AudienceCards locale={locale} />
        </div>
      </section>
      <section className="section capabilities-section">
        <div className="container">
          <div className="section-top">
            <Heading
              label={c.investment}
              title={c.capTitle}
              description={c.capText}
            />
            <Link className="underlined-link" href={`/${locale}/solutions`}>
              {c.solutions}
              <Arrow />
            </Link>
          </div>
          <CapabilityList locale={locale} />
        </div>
      </section>
      <section className="section insights-section">
        <div className="container">
          <div className="section-top">
            <Heading
              label={c.insights}
              title={c.latest}
              description={c.latestText}
            />
            <Link className="underlined-link" href={`/${locale}/insights`}>
              {c.all}
              <Arrow />
            </Link>
          </div>
          <InsightGrid locale={locale} />
        </div>
      </section>
      <section className="section trust-section">
        <div className="container two-column">
          <Heading
            label={
              locale === "en"
                ? "Stewardship & responsibility"
                : "الإدارة والمسؤولية"
            }
            title={c.trust}
            description={c.trustText}
          />
          <div className="trust-list">
            {c.trustItems.map((item, i) => (
              <div key={item}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{item}</h3>
                  <p>{c.trustDescriptions[i]}</p>
                </div>
              </div>
            ))}
            <Link
              className="underlined-link"
              href={`/${locale}/legal/disclosures`}
            >
              {c.disclosures}
              <Arrow />
            </Link>
          </div>
        </div>
      </section>
      <CTA locale={locale} />
    </>
  );
}
