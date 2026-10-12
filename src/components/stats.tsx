"use client";
import { useEffect, useRef, useState } from "react";
import { copy, type Locale } from "@/content/site";
export function Stats({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(1);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (time: number) => {
          const p = Math.min((time - start) / 1100, 1);
          setProgress(1 - Math.pow(1 - p, 3));
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  const nums = [10, 20, 250, 40];
  const format = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA");
  return (
    <section className="stats-section">
      <div className="container">
        <div className="stats-note">
          <p className="eyebrow">{c.figures}</p>
          <small>{c.sample}</small>
        </div>
        <div className="stats-grid" ref={ref}>
          {nums.map((n, i) => (
            <div key={n}>
              <div className="stat" aria-hidden="true">
                {i === 0 && (
                  <span className="stat-currency">
                    {locale === "en" ? "SAR" : "ر.س"}
                  </span>
                )}
                {format.format(Math.round(n * progress))}
                {i === 0 ? (locale === "en" ? "bn" : " مليار") : "+"}
              </div>
              <span className="sr-only">
                {i === 0
                  ? locale === "en"
                    ? "SAR 10 billion"
                    : "١٠ مليارات ريال سعودي"
                  : `${format.format(n)}+`}
              </span>
              <p>{c.stats[i]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
