# Phase 3 — sample client dashboard

Phase 3 is a separate feature branch stacked on `feat/portal-phase-2-kyc` / PR #4, which depends on Phase 1. Review the parent phases first. After those are merged, rebase/retarget this increment onto reviewed current main, preserving its existing public pages and online demo. Do not merge a child phase into the parent before the parent is reviewed. This phase stops at a pull request; no live deployment or production setting changes are made.

## Client experience

After completing MFA, clients enter the sample dashboard through the portal root; staff enter the existing compliance queue. Unauthenticated entry redirects to sign-in. Account-security and KYC navigation remain available.

`/[locale]/portal/dashboard` supports English and Arabic/RTL with the existing fonts, design tokens, header/footer, portal navigation and forms. Individual MFA-authenticated clients can explore it while KYC is pending. Staff and unsupported institutional/government accounts cannot access this individual dashboard.

- Portfolio, holdings and cash cards: **fixed fictional values**, explicitly labeled sample data and valued at **30 September 2026**. They are not client assets, company results, an investment offer or a custody ledger. The five sample holdings reuse the public solution categories; a separate cash row makes the portfolio allocation clear. Integer SAR cents keep balances and statement totals consistent.
- Performance: sample daily values with rises and declines; 1-month, 3-month and 1-year calendar windows; pointer exploration, a labeled keyboard-operable date slider and an expandable data table. The displayed change is a change in synthetic value, not a time-weighted/cash-flow-adjusted return or audited performance. Dates use the Gregorian calendar and Asia/Riyadh; the timeline stays chronological left to right in either locale.
- Account/KYC status: **actual statuses for the signed-in account**, clearly separated from fictional financial figures. Pending status is never inferred from sample balances, and viewing this dashboard cannot approve an account or unlock investing. Links lead to existing KYC/account-security pages.
- Statements: three sample months (July–September 2026), generated on demand as one-page PDFs in the selected language. Every PDF says it is fictional and not an official statement, proof of assets, tax document or investment advice. There is no client name, email, ID or account identifier in the sample PDF. Arabic PDFs use the complete existing IBM Plex Sans Arabic family with shaping and separate LTR SAR/date columns. Fonts are embedded; no browser, vendor API or worker is required for generation.
- Notifications: the current **actual KYC status** notice plus three clearly identified sample notices. A new KYC revision/status creates a new unread status notice. Marking read persists only for the current user and is idempotent, including simultaneous clicks; it preserves first-read time and records one audit event. Read state is not KYC consent, an investment acknowledgement or approval. No email/push delivery is asserted.
- Loading, failure/retry and failed-download states show an error instead of fabricated success. Client financial data never becomes editable or actionable.

The existing investing disclaimer is reused exactly from the public dictionary. Public footer, legal pages, CMA wording, cookie controls and public dictionaries remain unchanged. No optional tracker, banking provider, payment/custody connection, order flow or money movement is added.

## Access and endpoints

`PORTAL_ENABLED=false` remains the default. New pages and APIs return genuine 404s before requiring secrets when disabled. Enabled routes require Phase 1's verified email and full mandatory-MFA session, timeout, active account, `CLIENT` role and `INDIVIDUAL` account type. Suspension, session revocation and expiry deny access. Portal pages/API/PDF responses remain noindex, private/no-store and protected by the existing portal nonce CSP/security headers. They are absent from the public sitemap.

| Endpoint                                       | Behavior                                                                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/portal/dashboard?period=1Y`          | Current account statuses, fixed sample balances/holdings, selected chart period, statement list and own notification read state. Only `1M`, `3M`, `1Y` are allowed. |
| `POST /api/portal/notifications/read`          | Strict JSON `{ "id": "CURRENT_NOTIFICATION_ID" }`; Origin/CSRF checked, unknown/stale IDs rejected, per-user read state recorded.                                   |
| `GET /api/portal/statements/2026-09?locale=ar` | Authenticated sample PDF attachment. Only the three configured months and `en`/`ar` are accepted.                                                                   |

No endpoint accepts another user's ID, a role/status change, arbitrary file path or arbitrary statement content. Dashboard reads, notification changes and PDF generation have separate database-backed rate limits. Statement generation is audited as `SAMPLE_STATEMENT_GENERATED`; this records server generation, not proof the client saved the file. Notification read events are ordinary Phase 1 audit events under its provisional retention, not regulated investment/KYC records.

## Database and privacy

One additive migration creates `NotificationRead`, uniquely keyed by user and notification key. It stores only an opaque key and first-read timestamp. Foreign-key cascade removes this convenience metadata if an account is deleted under an approved procedure. The existing regulated KYC restrictive relations still apply; this migration does not automate or bypass client deletion/legal holds. Include read-state metadata when processing an applicable export request under the existing privacy workflow. No balances, positions or fabricated financial history are inserted into MySQL, and no existing migration is edited.

Mock values are deliberately fixed and identical for all eligible clients. The dashboard derives account/KYC statuses and read state server-side from the authenticated session. It does not decrypt or disclose KYC identity fields to render the overview. Private data requests remain Phase 1's password/TOTP-protected pending staff workflow.

## Hostinger deployment and environment

Follow [PORTAL.md](PORTAL.md) and [PORTAL_PHASE_2.md](PORTAL_PHASE_2.md) for the parent phases, Node **22**, MySQL TLS, secrets, SMTP, HTTPS and protected cron. Phase 3 adds **no environment variable, API key, external service, daemon, Docker requirement or root-access requirement**. `.env.example` remains unchanged with empty server-only secret placeholders and `PORTAL_ENABLED=false`.

1. Keep production on reviewed `main` with the real portal disabled. Review this PR and its parents before integration; preserve the existing demo and public changes when resolving parent/main differences. Do not enable the real portal solely to inspect samples on production.
2. Use an isolated Hostinger Node.js staging app and synthetic accounts/data. Back up the staging database before applying the reviewed additive migration.
3. Install with `npm ci`. Enabled staging uses the existing `npm run build:portal` (configuration preflight, `prisma migrate deploy`, then `next build --webpack`) and `npm start`. Disabled public builds keep `npm run build` without portal secrets or a running database. Never run a destructive reset, `db push` or `migrate dev` against production.
4. PDFKit **0.17.2** is explicitly externalized for Node file access. The statement route's Next output trace includes the complete Arabic font asset and existing Inter WOFF. Keep these files, PDFKit and their dependency/license files in deployment packaging; a full GitHub app checkout with normal Next start satisfies this requirement. No font/CDN request occurs during download. Verify both language PDFs through Hostinger after packaging.
5. Test both languages, runtime feature-off 404s, pending/approved states, chart controls, notification read isolation/persistence, downloads, expiry, staff denial, cache/noindex/security headers and unchanged public pages. Verify real MySQL migration/upsert behavior and hosting resource limits in staging.
6. Cron is unchanged; there is no PDF/background worker or new schedule. Production enablement still requires the parent phases' regulatory/legal/operational approvals. A code rollback does not undo the additive schema; disable the real portal and plan data-safe recovery.

PDFKit is MIT licensed; its type definitions are development-only. The embedded Inter and IBM Plex fonts use SIL Open Font License terms. The complete Arabic font and original license/provenance are in `src/lib/portal/pdf-assets`. No paid license or partner credential is required for these sample features. Sample PDFs are visually/text-rendered, untagged documents; accessible financial equivalents are provided in the HTML tables. Real statements need accessibility/document-policy review and a signed-off reporting process.

## Tests and remaining approvals

Run the existing guarded disposable loopback `_test` database workflow from the parent documents. `npm run test:portal` now includes dashboard tests, with auth/KYC regressions serially; it deletes synthetic table contents and refuses a remote/non-`_test` database. Test public smoke checks on the disabled local instance, and run production build, frozen install, Prisma validation, lint, TypeScript, formatting and dependency audit. Never point the test harness at client data. See [PORTAL_PHASE_3_VALIDATION.md](PORTAL_PHASE_3_VALIDATION.md) for the actual results.

Before real collection/enablement: review all three phases; confirm CMA permitted activities, approved Arabic/English portal/privacy/terms/cookie disclosures, Saudi PDPL retention/export/deletion procedures, identity/KYC/AML policy, staff procedures, Hostinger staging/TLS/backups and independent security review. Before replacing samples with actual figures: approve portfolio valuation/performance methodology, reporting/reconciliation, custody/data-source contracts and credentials, client statement content/accessibility, retention and notification-delivery policy. None is implied by sample availability.

Legal copy awaiting approval: **privacy** (actual holdings/financial history, reporting/notification processing, providers/transfers, retention and rights), **terms** (account-status limits, valuation/performance methodology, official statement availability, corrections and delivery), **disclosures** (illustrative versus actual results, approved activities and risk warnings), and **cookies** (existing essential session/CSRF cookies; no new cookies in this phase). Existing CMA/footer/legal text is deliberately untouched. SAMA Open Banking, payment/custody contracts/keys and investment product disclosures remain later-phase requirements.
