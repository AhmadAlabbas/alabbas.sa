// A fixed synthetic dataset; never interpreted as a user's ledger or priced holdings.
export const sampleAsOf = "2026-09-30";
export const periods = ["1M", "3M", "1Y"] as const;
export type Period = (typeof periods)[number];
export const statementMonths = ["2026-09", "2026-08", "2026-07"] as const;
export const sampleHoldings = [
  { category: "real-estate", valueCents: 8_000_000 },
  { category: "private-equity", valueCents: 6_000_000 },
  { category: "public-markets", valueCents: 5_000_000 },
  { category: "infrastructure", valueCents: 3_500_000 },
  { category: "alternatives", valueCents: 2_500_000 },
] as const;
export const sampleCashCents = 1_750_000;
export const samplePortfolioCents =
  sampleHoldings.reduce((sum, h) => sum + h.valueCents, 0) + sampleCashCents;
export const sampleHistory = Array.from({ length: 365 }, (_, i) => {
  const t = i / 364;
  return {
    date: new Date(Date.UTC(2025, 9, 1) + i * 86400000)
      .toISOString()
      .slice(0, 10),
    valueCents: Math.round(
      25_000_000 +
        1_750_000 * t +
        450_000 * Math.sin(t * 4 * Math.PI) +
        140_000 * Math.sin(t * 12 * Math.PI),
    ),
  };
});
export function samplePerformance(period: Period) {
  const start =
    period === "1M"
      ? "2026-09-01"
      : period === "3M"
        ? "2026-07-01"
        : "2025-10-01";
  const points = sampleHistory.filter((p) => p.date >= start);
  const changeCents =
    points[points.length - 1].valueCents - points[0].valueCents;
  return {
    period,
    points,
    changeCents,
    changePercent: (changeCents / points[0].valueCents) * 100,
  };
}
export function sampleStatement(month: string) {
  if (!(statementMonths as readonly string[]).includes(month)) return null;
  const points = sampleHistory.filter((p) => p.date.startsWith(month));
  const last = points[points.length - 1],
    holdingsTotal = last.valueCents - sampleCashCents;
  let allocated = 0;
  const holdings = sampleHoldings.map((h, i) => {
    const valueCents =
      i === sampleHoldings.length - 1
        ? holdingsTotal - allocated
        : Math.round((h.valueCents / 25_000_000) * holdingsTotal);
    allocated += valueCents;
    return { category: h.category, valueCents };
  });
  return {
    month,
    start: points[0].date,
    end: last.date,
    openingCents: points[0].valueCents,
    closingCents: last.valueCents,
    cashCents: sampleCashCents,
    holdings,
  };
}
export const sampleNotices = [
  {
    id: "sample-welcome",
    kind: "SAMPLE_WELCOME",
    createdAt: "2026-09-30T09:00:00.000Z",
    sample: true,
  },
  {
    id: "sample-statement-2026-09",
    kind: "SAMPLE_STATEMENT",
    createdAt: "2026-09-30T08:00:00.000Z",
    sample: true,
  },
  {
    id: "sample-risk",
    kind: "SAMPLE_RISK",
    createdAt: "2026-09-30T07:00:00.000Z",
    sample: true,
  },
] as const;
