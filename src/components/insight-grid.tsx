"use client";
import Link from "next/link";
import { useState } from "react";
import {
  articles,
  copy,
  description,
  formatDate,
  text,
  type Locale,
} from "@/content/site";
import { Arrow } from "./ui";
export function InsightGrid({
  locale,
  filterable = false,
}: {
  locale: Locale;
  filterable?: boolean;
}) {
  const [category, setCategory] = useState("all");
  const c = copy[locale];
  const keys = ["all", "perspectives", "research", "news"];
  const items = articles.filter(
    (a) => category === "all" || a.category === category,
  );
  return (
    <>
      {filterable && (
        <div
          className="filters"
          role="group"
          aria-label={locale === "en" ? "Filter insights" : "تصفية الرؤى"}
        >
          {keys.map((key, i) => (
            <button
              key={key}
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
            >
              {c.categories[i]}
            </button>
          ))}
        </div>
      )}
      <div
        className="insight-grid"
        aria-live={filterable ? "polite" : undefined}
      >
        {items.map((a, i) => (
          <article key={a.slug} className="insight-card">
            <Link href={`/${locale}/insights/${a.slug}`}>
              <div className={`insight-art art-${i % 3}`} aria-hidden="true">
                <div />
                <span>{`0${articles.indexOf(a) + 1}`}</span>
                <Arrow diagonal />
              </div>
              <div className="insight-meta">
                <span>{c.categories[keys.indexOf(a.category)]}</span>
                <time dateTime={a.date}>{formatDate(a.date, locale)}</time>
              </div>
              <h3>{text(a, locale)}</h3>
              <p>{description(a, locale)}</p>
              <small>
                {c.sampleArticle} · {a.read} {c.read}
              </small>
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
