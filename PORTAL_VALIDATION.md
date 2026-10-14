# Phase 1 validation — 13 October 2026

Validated on the feature branch with Node **22.23.3**, Next.js **16.4.0**, Prisma **6.19.3**, and a disposable local MariaDB **11.8.6** instance using Prisma's MySQL connector. The database was initialized under the workspace without root access or Docker. No production database, mail account, Hostinger app setting or public deployment was changed.

## Automated checks

- `npm run lint`, `npm run typecheck`, `npm run format:check`: pass.
- Disabled `npm run build`: pass without database/auth/mail credentials; all 44 existing public routes remain statically generated.
- `npm run build:portal`: configured preflight, migration deployment and Webpack production build checked against the disposable database.
- Prisma schema validation, initial SQL migration and repeat `migrate deploy`: pass; repeat reports no pending migrations.
- `npm run test:portal`: **33 tests**, covering flags/404s, noindex and script CSP, CSRF/origin checks, payload limits, role injection, encrypted records, email tokens, mandatory TOTP, replay and concurrent authentication, timeouts, suspension, owner permissions, resets, step-up/data requests, concurrent rate limits, login/TOTP brute-force limits, database/mail configuration and protected cleanup. Full KYC/bank/order workflows are intentionally absent and their routes are tested as unavailable.
- `TEST_BASE_URL=http://localhost:3021 npm test`: **7 passing smoke tests**, including every existing bilingual public route, metadata, canonical URLs, SEO, 404s, headers and contact validation/throttling. The disabled instance has no portal credentials.
- `npm audit --omit=dev`: **0 vulnerabilities** after the scoped Prisma configuration dependency override.

## Browser checks

- **40** Chromium page/layout/accessibility checks: English and Arabic, widths **360, 768, 1024 and 1440**; disabled public home, enabled home, signin, signup and authenticated security pages.
- No horizontal overflow, page errors, CSP violations or WCAG 2 A/AA and 2.1 AA violations reported by axe for those checks. Header login/signup links are absent when disabled and present when enabled. Arabic uses RTL.
- Separate interactive English/Arabic signup, verification, TOTP enrollment, account-security access, sign-out, forgot-password and reset flows pass over a **local HTTPS reverse proxy**. Chromium trusts only the fixture's explicitly pinned certificate key; no global TLS verification bypass is used. Origin checks and Secure/HttpOnly cookies operate normally. Email fragments are removed from browser history and resets preserve MFA while invalidating sessions.
- Footer, legal content and existing public dictionaries have no source diff. Existing consent controls are reused and no optional tracker is added.

## Remaining production checks

Local browser/mail tests inspect encrypted queued verification/reset messages; **real SMTP inbox delivery is not configured or verified**. Check it with the approved mail provider and scheduler in Hostinger staging. Repeat migrations against the actual Hostinger MySQL version, verify provider TLS/CA files, HTTPS redirects, nonce/security headers through the hosting proxy, trusted IP handling, backups, scheduler behavior and operational monitoring.

Export/deletion requests are pending staff workflows. Recovery from a lost authenticator, final retention/privacy/legal copy, regulatory approvals and an independent security assessment remain prerequisites before enabling production. See [PORTAL.md](PORTAL.md) for deployment and the external requirements. Phase 2 must wait for review of this PR.
