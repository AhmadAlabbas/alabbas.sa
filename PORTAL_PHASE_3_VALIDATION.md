# Phase 3 validation — 14 October 2026 (Saudi Arabia)

Validated on `feat/portal-phase-3-dashboard`, based on Phase 2 commit `f9229b83d64870e4fbb25f19e01953215a1addd3`. Node 22.23.3, Next.js 16.4.0, Prisma 6.19.3, PDFKit 0.17.2 and disposable local MariaDB 11.8.6 through Prisma's MySQL connector. No Hostinger/production setting, database or live deployment was changed.

## Passing checks

- Frozen `npm ci`, Prisma generation/schema validation, Webpack production build with `PORTAL_ENABLED=false` and no portal secrets/database, ESLint, TypeScript, Prettier and `git diff --check`.
- **80 passing auth/KYC/dashboard tests:** 33 auth regressions, 28 KYC regressions, 19 dashboard tests. No failed/skipped/disabled tests. Covers sample-data arithmetic and dates/declines, feature-off 404s, ownership/roles/MFA/expiry/suspension, pending and approved samples, strict selectors, client/staff entry redirects, CSRF/bounds/rate limits, per-user notification state, stale KYC notice IDs, simultaneous marking, PDF attachments/privacy/font embedding/auditing and private bilingual metadata.
- Duplicate/concurrent notification marking keeps one read-state row, its original timestamp and one audit event. The test caught MySQL's affected-row behavior on a duplicate no-op; the final implementation checks the newly inserted record ID instead of relying on the affected-row count.
- **7 passing public smoke tests**, including all 44 bilingual public routes, metadata, SEO, 404s, headers and contact validation/throttling with delivery integration unset.
- The additive notification migration applies to an existing Phase 2 database. All four migrations apply to a fresh test database, and repeat deployment reports no pending migration. Existing migration files are unchanged.
- `npm audit --omit=dev`: **0 reported production dependency vulnerabilities**.
- The compiled statement route trace includes the complete Arabic TTF and existing Inter WOFF. PDFKit uses native Node file access; PDF generation works through the production Next route, not just a standalone generator.
- Source comparison confirms no changes to footer/CMA/legal wording, public dictionaries/pages or `.env.example`. No new secret/environment binding, vendor API or worker was introduced.

## Browser and PDF checks

- **26 passing Chromium layout/accessibility checks:** English and Arabic, widths 360/390/768/1440, all three chart periods (24 combinations), plus the expanded full-year data table in each locale (2 checks).
- No horizontal page overflow, page errors, CSP violations or reported WCAG 2 A/AA and 2.1 AA axe violations in those checks. Arabic remains RTL; the chronological chart/slider stay LTR.
- Both language workflows pass actual UI password/TOTP login into the dashboard, chart period changes, keyboard date exploration, chart-data expansion, notification read/reload persistence, browser PDF attachment download and a simulated service failure followed by successful retry.
- Tests use synthetic verified/MFA accounts and only the retained local HTTPS fixture's explicitly pinned certificate key. Browser/system certificate stores were not modified, and live-site TLS verification was not bypassed.
- Downloaded English/Arabic PDFs pass Poppler parsing/text extraction and `pdfinfo`: one A4 page, embedded fonts, correct localized title, sample-only metadata and no JavaScript. The Arabic PDF was rasterized and visually inspected to confirm joined text, complete punctuation, correctly ordered separate SAR/date columns and legible sample/risk warnings. Original totals reconcile to the sample holdings/cash.
- PDFs are untagged illustrative documents, not official accessible financial statements; equivalent figures are in the accessible HTML table. Actual reporting/document policy remains a future approval.

## Remaining production work

The phase is delivered for review, stacked on Phase 2/Phase 1; parent integration must preserve current main's online demo and public changes before retargeting/merging. Test migrations/upserts, fonts/PDF packaging, resource limits, TLS/CSP/cookies and timeout/download behavior on the exact Hostinger staging environment. Local MariaDB/browser checks do not establish Hostinger MySQL behavior, provider delivery, regulatory approval or security certification.

CMA/PDPL and parent KYC/legal/operational/security approvals remain necessary before real collection. Real dashboards/statements additionally need approved valuation/performance methodology, reconciliation/reporting/accessibility and custody/data-source agreements/credentials. No bank, payment, custody, real valuation feed, real notification-delivery service or money movement was tested or asserted. See [PORTAL_PHASE_3.md](PORTAL_PHASE_3.md) for deployment, licenses and the legal-copy/partner requirements.
