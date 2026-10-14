"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { capabilities, copy, type Locale } from "@/content/site";
import { dashboardCopy } from "@/content/dashboard";
import { periods, type Period } from "@/lib/portal/dashboard-model";
import type { ownDashboard } from "@/lib/portal/dashboard";
import { kycRequest } from "./kyc-request";
type DashboardData = Awaited<ReturnType<typeof ownDashboard>>;
const money = (cents: number, locale: Locale) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    currencyDisplay: "code",
  }).format(cents / 100);
const date = (value: string, locale: Locale, month = false) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    calendar: "gregory",
    timeZone: "Asia/Riyadh",
    ...(month
      ? ({ month: "long", year: "numeric" } as const)
      : ({ day: "numeric", month: "short", year: "numeric" } as const)),
  }).format(new Date(value));
function PerformanceChart({
  performance,
  locale,
  onPeriod,
}: {
  performance: DashboardData["performance"];
  locale: Locale;
  onPeriod: (p: Period) => void;
}) {
  const c = dashboardCopy[locale],
    id = useId();
  const [selected, setSelected] = useState(performance.points.length - 1);
  const points = performance.points,
    min = Math.min(...points.map((p) => p.valueCents)),
    max = Math.max(...points.map((p) => p.valueCents));
  const position = (i: number) => ({
    x: 55 + (i / (points.length - 1)) * 640,
    y: 220 - ((points[i].valueCents - min) / (max - min || 1)) * 175,
  });
  const line = points
    .map((_, i) => {
      const p = position(i);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");
  const chosen = points[selected],
    marker = position(selected);
  return (
    <section className="dashboard-section" aria-labelledby={`${id}-heading`}>
      <div className="dashboard-section-heading">
        <h2 id={`${id}-heading`}>{c.performance}</h2>
        <div className="dashboard-periods" role="group" aria-label={c.period}>
          {periods.map((p) => (
            <button
              key={p}
              className="button button-secondary"
              aria-pressed={performance.period === p}
              onClick={() => onPeriod(p)}
            >
              {p === "1M"
                ? locale === "ar"
                  ? "شهر"
                  : "1 month"
                : p === "3M"
                  ? locale === "ar"
                    ? "٣ أشهر"
                    : "3 months"
                  : locale === "ar"
                    ? "سنة"
                    : "1 year"}
            </button>
          ))}
        </div>
      </div>
      <p className="form-note">{c.chartHelp}</p>
      <p className="dashboard-change">
        {c.valueChange}:{" "}
        <bdi>
          {money(performance.changeCents, locale)} (
          {new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
            maximumFractionDigits: 2,
            signDisplay: "exceptZero",
          }).format(performance.changePercent)}
          %)
        </bdi>
      </p>
      <svg
        className="dashboard-chart"
        viewBox="0 0 720 260"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 720;
          setSelected(
            Math.max(
              0,
              Math.min(
                points.length - 1,
                Math.round(((x - 55) / 640) * (points.length - 1)),
              ),
            ),
          );
        }}
      >
        <title id={`${id}-title`}>{c.performance}</title>
        <desc id={`${id}-description`}>
          {c.chartHelp} {c.table}
        </desc>
        {[45, 132.5, 220].map((y, i) => (
          <g key={y}>
            <line x1="55" x2="695" y1={y} y2={y} className="chart-grid" />
            <text x="50" y={y + 4} textAnchor="end" direction="ltr">
              {Math.round((max - ((max - min) * i) / 2) / 100000)}k
            </text>
          </g>
        ))}
        <polygon points={`55,220 ${line} 695,220`} className="chart-area" />
        <polyline points={line} className="chart-line" />
        <line
          x1={marker.x}
          x2={marker.x}
          y1="40"
          y2="220"
          className="chart-marker"
        />
        <circle cx={marker.x} cy={marker.y} r="5" className="chart-dot" />
        <text x="55" y="249" textAnchor="start" direction="ltr">
          {points[0].date}
        </text>
        <text x="695" y="249" textAnchor="end" direction="ltr">
          {points[points.length - 1].date}
        </text>
      </svg>
      <label className="dashboard-explorer" htmlFor={`${id}-slider`}>
        {c.selectDate}
        <input
          id={`${id}-slider`}
          type="range"
          min="0"
          max={points.length - 1}
          value={selected}
          dir="ltr"
          onChange={(e) => setSelected(Number(e.target.value))}
          aria-valuetext={`${date(chosen.date, locale)}: ${money(chosen.valueCents, locale)}`}
        />
      </label>
      <output className="dashboard-chart-value" htmlFor={`${id}-slider`}>
        {date(chosen.date, locale)} ·{" "}
        <bdi>{money(chosen.valueCents, locale)}</bdi>
      </output>
      <details className="dashboard-data">
        <summary>{c.table}</summary>
        <div
          className="dashboard-table-scroll"
          tabIndex={0}
          role="region"
          aria-label={c.performance}
        >
          <table>
            <caption>
              {c.performance} · {c.sample}
            </caption>
            <thead>
              <tr>
                <th scope="col">{c.date}</th>
                <th scope="col">{c.value}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date}>
                  <th scope="row">{date(p.date, locale)}</th>
                  <td>
                    <bdi>{money(p.valueCents, locale)}</bdi>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
export function ClientDashboard({ locale }: { locale: Locale }) {
  const c = dashboardCopy[locale],
    router = useRouter();
  const [period, setPeriod] = useState<Period>("1Y"),
    [data, setData] = useState<DashboardData | null>(null),
    [notice, setNotice] = useState(""),
    [reload, setReload] = useState(0),
    [pending, setPending] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/portal/dashboard?period=${period}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        if (r.status === 401) {
          router.replace(`/${locale}/auth/sign-in`);
          return;
        }
        if (!r.ok) throw new Error();
        const result = await r.json();
        if (!controller.signal.aborted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setNotice(c.error);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [period, reload, locale, router, c.error]);
  async function read(id: string) {
    if (pending) return;
    setPending(id);
    setNotice("");
    try {
      const r = await kycRequest("/api/portal/notifications/read", { id });
      if (!r.ok) throw new Error();
      setReload((v) => v + 1);
      setNotice(c.marked);
    } catch {
      setNotice(c.error);
    } finally {
      setPending(null);
    }
  }
  async function download(month: string) {
    if (pending) return;
    setPending(month);
    setNotice("");
    try {
      const r = await fetch(
        `/api/portal/statements/${month}?locale=${locale}`,
        { cache: "no-store" },
      );
      if (r.status === 401) {
        router.replace(`/${locale}/auth/sign-in`);
        return;
      }
      if (
        !r.ok ||
        !r.headers.get("content-type")?.startsWith("application/pdf")
      )
        throw new Error();
      const url = URL.createObjectURL(await r.blob()),
        link = document.createElement("a");
      link.href = url;
      link.download = `alabbas-sample-${month}-${locale}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setNotice(c.statementFailed);
    } finally {
      setPending(null);
    }
  }
  if (!data)
    return (
      <div role="status">
        <p>{loading ? c.loading : notice}</p>
        {!loading && (
          <button
            className="button"
            onClick={() => {
              setNotice("");
              setLoading(true);
              setReload((v) => v + 1);
            }}
          >
            {c.retry}
          </button>
        )}
      </div>
    );
  return (
    <div className="portal-dashboard">
      <aside className="dashboard-sample">
        <strong className="eyebrow">{c.sample}</strong>
        <p>{c.sampleHelp}</p>
        <small>
          {c.asOf}: {date(data.asOf, locale)}
        </small>
      </aside>
      <section className="dashboard-account">
        <div>
          <h2>{c.account}</h2>
          <p>{c.accountStatus[data.account.status]}</p>
        </div>
        <div>
          <h2>{c.kyc}</h2>
          <p>{c.kycStatus[data.account.kycStatus]}</p>
        </div>
        <Link className="underlined-link" href={`/${locale}/portal/kyc`}>
          {c.onboarding}
        </Link>
      </section>
      <section className="dashboard-balances" aria-label={c.portfolio}>
        {(
          [
            [c.portfolio, data.balances.portfolioCents],
            [c.holdingsValue, data.balances.holdingsCents],
            [c.cash, data.balances.cashCents],
          ] as const
        ).map(([label, value]) => (
          <article key={label}>
            <h2>{label}</h2>
            <p>
              <bdi>{money(value, locale)}</bdi>
            </p>
            <small>{c.sample}</small>
          </article>
        ))}
      </section>
      <PerformanceChart
        key={data.performance.period}
        performance={data.performance}
        locale={locale}
        onPeriod={setPeriod}
      />
      <section className="dashboard-section">
        <h2>{c.holdings}</h2>
        <div
          className="dashboard-table-scroll"
          tabIndex={0}
          role="region"
          aria-label={c.holdings}
        >
          <table>
            <caption>
              {c.holdings} · {c.sample}
            </caption>
            <thead>
              <tr>
                <th scope="col">{c.category}</th>
                <th scope="col">{c.value}</th>
                <th scope="col">{c.allocation}</th>
              </tr>
            </thead>
            <tbody>
              {data.holdings.map((h) => (
                <tr key={h.category}>
                  <th scope="row">
                    {capabilities.find((v) => v.slug === h.category)![locale]}
                  </th>
                  <td>
                    <bdi>{money(h.valueCents, locale)}</bdi>
                  </td>
                  <td>
                    <bdi>
                      {new Intl.NumberFormat(
                        locale === "ar" ? "ar-SA" : "en-SA",
                        { style: "percent", maximumFractionDigits: 1 },
                      ).format(h.valueCents / data.balances.portfolioCents)}
                    </bdi>
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">{c.cash}</th>
                <td>
                  <bdi>{money(data.balances.cashCents, locale)}</bdi>
                </td>
                <td>
                  <bdi>
                    {new Intl.NumberFormat(
                      locale === "ar" ? "ar-SA" : "en-SA",
                      { style: "percent", maximumFractionDigits: 1 },
                    ).format(
                      data.balances.cashCents / data.balances.portfolioCents,
                    )}
                  </bdi>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="dashboard-section">
        <h2>{c.statements}</h2>
        <p>{c.statementHelp}</p>
        <div className="portal-records">
          {data.statements.map((month) => (
            <div key={month}>
              <p>
                {date(`${month}-01`, locale, true)} · {c.sample}
              </p>
              <button
                className="button button-secondary"
                disabled={!!pending}
                onClick={() => download(month)}
              >
                {c.download}
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="dashboard-section">
        <h2>{c.notifications}</h2>
        <div className="dashboard-notifications">
          {data.notifications.map((n) => {
            const text = c.notices[n.kind as keyof typeof c.notices];
            return (
              <article key={n.id}>
                <div>
                  <small>
                    {n.sample ? c.sample : c.kyc} ·{" "}
                    {n.readAt ? c.read : c.unread}
                  </small>
                  <h3>{text.title}</h3>
                  <p>{text.body}</p>
                  <time dateTime={n.createdAt}>
                    {date(n.createdAt, locale)}
                  </time>
                </div>
                {!n.readAt && (
                  <button
                    className="button button-secondary"
                    disabled={!!pending}
                    onClick={() => read(n.id)}
                  >
                    {c.markRead}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <p className="form-status" role="status">
        {notice}
      </p>
      <p className="form-note dashboard-risk">{copy[locale].risk}</p>
    </div>
  );
}
