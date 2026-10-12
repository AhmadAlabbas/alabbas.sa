import Link from "next/link";
import { Suspense } from "react";
import {
  articles,
  audiences,
  capabilities,
  copy,
  description,
  formatDate,
  text,
  type Locale,
} from "@/content/site";
import { editorial, legalSections } from "@/content/editorial";
import { AudienceCards, CapabilityList, CTA } from "./home";
import { InsightGrid } from "./insight-grid";
import { ContactForm } from "./contact-form";
import { Arrow, Button, Heading, PageHero } from "./ui";
export function ContentPage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const c = copy[locale];
  const ar = locale === "ar";
  if (slug === "about")
    return (
      <>
        <PageHero
          label={c.about}
          title={c.aboutTitle}
          description={c.aboutText}
        />
        <section className="section">
          <div className="container two-column">
            <Heading
              label={ar ? "الغاية" : "Our purpose"}
              title={
                ar
                  ? "إدارة رأس المال\nبرؤية ومسؤولية."
                  : "Stewarding capital.\nWith purpose."
              }
            />
            <div className="stack">
              <div>
                <h3>{c.mission}</h3>
                <p>{c.missionText}</p>
              </div>
              <div>
                <h3>{c.vision}</h3>
                <p>{c.visionText}</p>
              </div>
            </div>
          </div>
        </section>
        <section className="section muted-section">
          <div className="container">
            <Heading
              label={ar ? "قيمنا" : "Our values"}
              title={ar ? "المبادئ التي توجهنا." : "Principles that guide us."}
            />
            <div className="values-grid">
              {c.values.map((v, i) => (
                <div key={v}>
                  <span className="card-number">0{i + 1}</span>
                  <h3>{v}</h3>
                  <p>{c.valuesText[i]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <Heading
              label={ar ? "القيادة والحوكمة" : "Leadership & governance"}
              title={c.leadership}
              description={c.leadershipText}
            />
            <div className="leadership-grid">
              {[
                ar ? "الرئيس التنفيذي" : "Chief Executive Officer",
                ar ? "رئيس الاستثمار" : "Chief Investment Officer",
                ar ? "مسؤول المخاطر والامتثال" : "Head of Risk & Compliance",
              ].map((role, i) => (
                <div key={role}>
                  <div className="profile-placeholder" aria-hidden="true">
                    <span>0{i + 1}</span>
                  </div>
                  <h3>{role}</h3>
                  <p>
                    {ar
                      ? "ملف قيادي مؤقت · الاسم والسيرة بانتظار الاعتماد."
                      : "Placeholder profile · name and biography awaiting approval."}
                  </p>
                </div>
              ))}
            </div>
            <Link
              className="underlined-link"
              href={`/${locale}/legal/disclosures`}
            >
              {c.disclosures}
              <Arrow />
            </Link>
          </div>
        </section>
        <CTA locale={locale} />
      </>
    );
  if (slug === "solutions")
    return (
      <>
        <PageHero
          label={c.solutions}
          title={c.solutionTitle}
          description={c.capText}
        />
        <section className="section">
          <div className="container">
            <CapabilityList locale={locale} />
            <p className="notice">{c.eligibility}</p>
          </div>
        </section>
        <Process locale={locale} />
        <CTA locale={locale} />
      </>
    );
  if (slug.startsWith("solutions/")) {
    const a = capabilities.find((a) => a.slug === slug.split("/")[1])!;
    const real = a.slug === "real-estate";
    return (
      <>
        <PageHero
          label={c.solutions}
          title={text(a, locale)}
          description={description(a, locale)}
        />
        <section className="section">
          <div className="container two-column">
            <Heading
              label={c.approach}
              title={
                real
                  ? ar
                    ? "قيمة راسخة.\nوفهم محلي."
                    : "Grounded value.\nLocal understanding."
                  : ar
                    ? "بحث دقيق.\nوقرارات مدروسة."
                    : "Rigorous research.\nConsidered decisions."
              }
            />
            <div className="stack">
              <p>
                {real
                  ? ar
                    ? "نقيّم العقارات من منظور المنفعة واستدامة الطلب وجودة التشغيل. تبدأ الأبحاث بفهم الموقع والمستأجرين والتمويل والنفقات الرأسمالية عبر دورة حياة الأصل."
                    : "We evaluate real estate through utility, sustainable demand and operational quality. Research begins with location, tenants, financing and capital expenditure across the asset lifecycle."
                  : ar
                    ? "يبدأ التقييم بفهم دور فئة الأصول في المحفظة، ثم فحص الأسس والمخاطر والملاءمة للأهداف الاستثمارية."
                    : "Evaluation begins with the role of the asset class in a portfolio, followed by a review of fundamentals, risks and alignment with investment objectives."}{" "}
              </p>
              <p>
                {ar
                  ? "تُراجع متطلبات السيولة ومخاطر التركيز والسيناريوهات السلبية قبل أي مقترح. لا تضمن هذه العملية العوائد أو حماية رأس المال."
                  : "Liquidity requirements, concentration risks and downside scenarios are considered before a proposal. This process does not guarantee returns or protect against capital loss."}
              </p>
            </div>
          </div>
        </section>
        {real && (
          <section className="section muted-section">
            <div className="container">
              <Heading
                label={c.strategy}
                title={
                  ar
                    ? "نفهم الأصل\nبكل تفاصيله."
                    : "Understand the asset.\nIn its entirety."
                }
              />
              <div className="values-grid">
                {(ar
                  ? [
                      "الموقع والطلب",
                      "جودة الدخل",
                      "الأداء التشغيلي",
                      "هيكل رأس المال",
                    ]
                  : [
                      "Location & demand",
                      "Income quality",
                      "Operational performance",
                      "Capital structure",
                    ]
                ).map((v, i) => (
                  <div key={v}>
                    <span className="card-number">0{i + 1}</span>
                    <h3>{v}</h3>
                    <p>
                      {
                        (ar
                          ? [
                              "دراسة السوق المحلي والاستخدام واحتياجات الشاغلين.",
                              "مراجعة جودة المستأجرين وشروط الإيجار ومخاطر الشغور.",
                              "تقييم الصيانة والنفقات الرأسمالية وكفاءة الأصول.",
                              "اختبار تكلفة التمويل والقدرة على خدمة الدين.",
                            ]
                          : [
                              "Study local supply, use and occupier needs.",
                              "Review tenant quality, lease terms and vacancy risk.",
                              "Assess maintenance, capital expenditure and asset efficiency.",
                              "Test financing costs and debt service capacity.",
                            ])[i]
                      }
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
        <Process locale={locale} />
        <section className="section">
          <div className="container case-study">
            <div>
              <p className="eyebrow">{c.caseStudy}</p>
              <h2>
                {real
                  ? ar
                    ? "أصل متعدد الاستخدامات\nفي الرياض."
                    : "A mixed-use asset\nin Riyadh."
                  : ar
                    ? "تقييم فرصة\nضمن المحفظة."
                    : "Evaluating an opportunity\nwithin a portfolio."}
              </h2>
            </div>
            <div>
              <p>
                {real
                  ? ar
                    ? "سيناريو افتراضي: دراسة أصل يجمع مساحات تجارية ومكتبية. تشمل المراجعة الطلب المحلي والتراخيص وتنوع المستأجرين وتكاليف الصيانة وخطط الخروج. لم تُجرَ معاملة ولا تُعرض نتائج."
                    : "Hypothetical scenario: assessing an asset combining retail and office space. Review covers local demand, permits, tenant diversification, maintenance costs and exit options. No transaction has occurred and no results are presented."
                  : ar
                    ? "سيناريو افتراضي: مقارنة فرصة مقترحة بأهداف المحفظة واحتياجات السيولة وحدود المخاطر. يُراجع الهيكل والرسوم وظروف الخروج قبل اتخاذ أي قرار."
                    : "Hypothetical scenario: comparing a proposed opportunity with portfolio objectives, liquidity needs and risk limits. Structure, fees and exit conditions are reviewed before any decision."}{" "}
              </p>
              <small>{c.caseNote}</small>
            </div>
          </div>
        </section>
        <CTA locale={locale} />
      </>
    );
  }
  if (slug === "clients")
    return (
      <>
        <PageHero
          label={c.clients}
          title={c.clientTitle}
          description={c.serveText}
        />
        <section className="section">
          <div className="container">
            <AudienceCards locale={locale} />
          </div>
        </section>
        <CTA locale={locale} />
      </>
    );
  if (slug.startsWith("clients/")) {
    const a = audiences.find((a) => a.slug === slug.split("/")[1])!;
    const details: Record<string, string[]> = {
      individuals: ar
        ? [
            "الأهداف الشخصية والعائلية",
            "الاحتياجات للسيولة والأفق الزمني",
            "الملاءمة وتحمل المخاطر",
          ]
        : [
            "Personal and family objectives",
            "Liquidity needs and time horizon",
            "Suitability and risk tolerance",
          ],
      institutions: ar
        ? ["التفويض والالتزامات", "الرقابة والتقارير", "تخصيص الأصول والقيود"]
        : [
            "Mandate and obligations",
            "Oversight and reporting",
            "Asset allocation and constraints",
          ],
      governments: ar
        ? [
            "الأولويات الاقتصادية",
            "أطر الحوكمة والمساءلة",
            "المرونة طويلة الأجل",
          ]
        : [
            "Economic priorities",
            "Governance and accountability",
            "Long-term resilience",
          ],
    };
    return (
      <>
        <PageHero
          label={c.clients}
          title={text(a, locale)}
          description={description(a, locale)}
        />
        <section className="section">
          <div className="container two-column">
            <Heading
              label={c.approach}
              title={
                ar
                  ? "فهم مشترك.\nواتجاه واضح."
                  : "Shared understanding.\nClear direction."
              }
            />
            <div className="stack">
              {details[a.slug].map((d, i) => (
                <div className="detail-row" key={d}>
                  <span className="card-number">0{i + 1}</span>
                  <h3>{d}</h3>
                </div>
              ))}
              <p>{c.eligibility}</p>
            </div>
          </div>
        </section>
        <section className="section muted-section">
          <div className="container">
            <Heading label={c.journey} title={c.clientTitle} />
            <div className="values-grid">
              {c.clientProcess.map((p, i) => (
                <div key={p}>
                  <span className="card-number">0{i + 1}</span>
                  <h3>{p}</h3>
                  <p>{c.clientProcessText[i]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <CTA locale={locale} />
      </>
    );
  }
  if (slug === "insights")
    return (
      <>
        <PageHero
          label={c.insights}
          title={c.insightsTitle}
          description={c.latestText}
        />
        <section className="section">
          <div className="container">
            <p className="notice">
              {c.sampleArticle} · {c.articleNote}
            </p>
            <InsightGrid locale={locale} filterable />
          </div>
        </section>
        <CTA locale={locale} />
      </>
    );
  if (slug.startsWith("insights/")) {
    const a = articles.find((a) => a.slug === slug.split("/")[1])!;
    return (
      <>
        <PageHero
          label={c.sampleArticle}
          title={text(a, locale)}
          description={description(a, locale)}
        />
        <article className="article-body container">
          <div className="article-meta">
            <time dateTime={a.date}>{formatDate(a.date, locale)}</time>
            <span>
              {a.read} {c.read}
            </span>
          </div>
          <p className="notice">{c.articleNote}</p>
          {editorial[a.slug][locale].map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              <p>{s.body}</p>
            </section>
          ))}
          <p className="notice">{c.risk}</p>
          <Link className="underlined-link" href={`/${locale}/insights`}>
            {c.back}
            <Arrow />
          </Link>
        </article>
      </>
    );
  }
  if (slug === "careers")
    return (
      <>
        <PageHero
          label={c.careers}
          title={c.careersTitle}
          description={c.careersText}
        />
        <section className="section">
          <div className="container">
            <Heading
              label={c.values[2]}
              title={
                ar
                  ? "العمل بقناعة.\nوالتطور بهدف."
                  : "Work with conviction.\nGrow with purpose."
              }
            />
            <div className="values-grid">
              {c.values.map((v, i) => (
                <div key={v}>
                  <span className="card-number">0{i + 1}</span>
                  <h3>{v}</h3>
                  <p>{c.valuesText[i]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="section muted-section">
          <div className="container two-column">
            <Heading label={c.careers} title={c.roles} />
            <div className="stack">
              <h3>{c.noRoles}</h3>
              <p>{c.rolesNote}</p>
              <Button href={`/${locale}/contact?type=careers`}>
                {c.careersCTA}
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  if (slug === "contact")
    return (
      <>
        <PageHero
          label={c.contact}
          title={c.contactTitle}
          description={c.contactText}
        />
        <section className="section">
          <div className="container contact-layout">
            <div className="contact-details">
              <p className="eyebrow">{ar ? "المكتب الرئيسي" : "Head office"}</p>
              <h2>{c.office}</h2>
              <p>{c.officeNote}</p>
              <div
                className="map-placeholder"
                role="img"
                aria-label={c.mapNote}
              >
                <span className="map-cross" aria-hidden="true">
                  +
                </span>
                <span>{c.map}</span>
                <small>{c.mapNote}</small>
              </div>
              <h3>{c.investor}</h3>
              <p>{c.investorText}</p>
              <Link
                href={`/${locale}/contact?type=investor-relations`}
                className="underlined-link"
              >
                {c.investor}
                <Arrow />
              </Link>
            </div>
            <Suspense
              fallback={<p>{ar ? "جارٍ تحميل النموذج…" : "Loading form…"}</p>}
            >
              <ContactForm key={locale} locale={locale} />
            </Suspense>
          </div>
        </section>
      </>
    );
  const key = slug.split("/")[1];
  const title = (
    {
      privacy: c.privacy,
      terms: c.terms,
      cookies: c.cookies,
      disclosures: c.disclosures,
    } as Record<string, string>
  )[key];
  return (
    <>
      <PageHero label={c.legal} title={title} description={c.legalLabel} />
      <div className="article-body container">
        <p className="notice">
          {c.updated}: {formatDate("2026-10-12", locale)} · {c.legalLabel}
        </p>
        {legalSections[key][locale].map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            <p>{s.body}</p>
          </section>
        ))}
      </div>
    </>
  );
}
function Process({ locale }: { locale: Locale }) {
  const c = copy[locale];
  return (
    <section className="section trust-section">
      <div className="container">
        <Heading label={c.strategy} title={c.capTitle} />
        <div className="values-grid">
          {c.process.map((p, i) => (
            <div key={p}>
              <span className="card-number">0{i + 1}</span>
              <h3>{p}</h3>
              <p>{c.processText[i]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
