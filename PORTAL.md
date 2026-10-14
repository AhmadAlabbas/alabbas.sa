# Client portal — Phase 1 review

This branch adds individual account authentication and account security. **The portal is disabled by default.** Review and merge this phase separately; no work from Phases 2–5 is included. The existing public pages, legal text and CMA authorization wording are unchanged.

## What is included

- English and Arabic `/[locale]/auth/*` and `/[locale]/portal/security` pages reuse the existing header, footer, fonts, design tokens, forms and route dictionaries. Arabic retains RTL.
- Email verification, password reset, Argon2id passwords, mandatory TOTP enrollment and login, login history, session revocation and password changes.
- Opaque server-side MySQL sessions using Prisma. Password confirmation creates only a five-minute challenge; completing TOTP replaces it with a full session. Full sessions expire after 15 minutes of inactivity or eight hours absolutely. Password reset/change invalidates every session and outstanding link without removing TOTP.
- Random bearer tokens are hashed in the database. TOTP secrets and queued email contents are encrypted with AES-256-GCM and context binding. No national ID or bank information is collected in this phase.
- Secure, HttpOnly, SameSite=Strict, host-only cookies; Origin and double-submit CSRF checks; bounded JSON requests; strict Zod validation; database-backed rate limits; audit events; private no-store responses; nonce-based script CSP and noindex on private pages/APIs.
- Personal-data export/deletion **requests**, protected by password and fresh TOTP. Requests remain pending for authorized staff; this phase does not automatically disclose or erase records. Staff processing and the operational privacy procedure must be ready before enabling the portal.
- Extensible account types and roles. Public registration always creates `INDIVIDUAL`, `CLIENT`, `PENDING`; clients cannot choose a role or change approval status. Administrative/KYC screens arrive in Phase 2. Pending clients can manage account security only.
- A Nafath provider interface with a fail-closed mock: it always reports pending and cannot sign users in. No national identity verification is asserted.

`PORTAL_ENABLED` must equal the literal `true` to enable any portal route. When absent, empty or false, auth/portal page and API requests return HTTP 404 before requiring credentials; header login/signup links are absent. The header checks a no-store runtime configuration endpoint so a statically built public page does not retain enabled links after disabling the feature. The sitemap remains public-only, and robots disallows auth/portal paths.

## Environment and secrets

Use Hostinger's private app environment settings in production and an ignored `.env` locally. Never use a `NEXT_PUBLIC_` prefix for a secret. `.env.example` contains names and empty placeholders only. Disabled public builds need only the existing `SITE_URL`; omit other portal keys until configured rather than filling them with dummy production values.

| Variable                                  | Purpose                                                                                                                                                                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORTAL_ENABLED`                          | `false` until the phase and legal approvals are complete.                                                                                                                                                                                            |
| `SITE_URL`                                | Exact canonical HTTPS origin, e.g. `https://alabbas.sa`; no subpath, credentials, query or fragment. Set before building.                                                                                                                            |
| `DATABASE_URL`                            | Dedicated MySQL database/user, URL-encoded credentials and provider connection parameters. Remote connections require `sslaccept=strict` and `sslcert` pointing to the trusted provider CA file. Loopback MySQL may use local transport without TLS. |
| `PORTAL_ENCRYPTION_KEY`                   | Base64-encoded 32 random bytes. Generate privately with `openssl rand -base64 32`. Keep a protected backup; changing it without decrypting/re-encrypting records makes TOTP and queued emails unreadable.                                            |
| `PORTAL_CRON_SECRET`                      | Independent random secret of at least 32 characters, used only in a Bearer header.                                                                                                                                                                   |
| `SMTP_HOST`, `SMTP_PORT`                  | Approved mail host; 465 with implicit TLS or 587 with required STARTTLS. Certificate verification remains enabled.                                                                                                                                   |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Mail credentials and verified sender email. Configure SPF, DKIM and DMARC with the provider.                                                                                                                                                         |
| `PORTAL_TRUSTED_IP_HEADER`                | Empty by default. Set to `x-real-ip` or `x-forwarded-for` only after Hostinger confirms the proxy overwrites that header and direct origin access is blocked.                                                                                        |

Example **format**, with placeholders that must be replaced privately:

```text
DATABASE_URL=mysql://USER:URL_ENCODED_PASSWORD@DB_HOST:3306/DB_NAME?sslaccept=strict&sslcert=%2FPRIVATE_PATH%2Fprovider-ca.pem
```

Upload only the provider's authentic CA certificate to a private accessible path; do not disable certificate checks. If the database is remote and Hostinger cannot supply a verified TLS connection, leave the portal disabled until an appropriate connection is available. Check outbound SMTP and database access on the actual hosting plan.

With no trusted IP header all visitors share a conservative network bucket, in addition to per-email/per-user limits. This safely avoids trusting spoofed IPs, but can throttle legitimate clients together. Confirm the forwarding arrangement before public use. Counters live in MySQL, not per-process memory. Fixed-window boundaries allow a burst across adjacent windows; hosting-level abuse controls should supplement this for public traffic.

## Hostinger deployment from GitHub

1. Keep the production app connected to `main` with `PORTAL_ENABLED=false`. This phase is delivered in a feature-branch PR, never by pushing directly to `main`. Review it before merging. A merge alone must not enable the portal.
2. Provision a separate staging Node.js Web App connected to the reviewed feature branch and a separate empty database. Configure Node **22**, root `.`, install `npm ci`, and start `npm start`. Hostinger owns the listening port. No root access, Docker or worker daemon is needed.
3. Create a dedicated MySQL database and app user in hPanel. Scope privileges to that database. Back up any existing database before migration. Use a separate migration credential if the hosting plan supports it; the runtime user should not retain schema-change privileges after deployment.
4. Add the private variables above, using the staging app's actual HTTPS origin as `SITE_URL`. Configure CA files/TLS, sender-domain authentication and the trusted proxy arrangement. Staging may set `PORTAL_ENABLED=true` solely for controlled testing with synthetic data; keep production false until approved.
5. `npm ci` generates the Prisma client through `postinstall`. To deploy an enabled staging/approved production portal, use **`npm run build:portal`**. It validates configuration, runs **`prisma migrate deploy`**, then uses the existing **`next build --webpack`** build. Never replace this with Turbopack on this hosting setup. A configuration or migration failure stops the build.
6. With the portal disabled, retain **`npm run build`**. It succeeds without portal secrets or a running database. Before enabling a previously disabled deployment, run `npm run db:migrate` from the approved deployment directory with private environment variables, or switch to `build:portal` and redeploy. Do not run `prisma migrate dev` or `db push` against production.
7. Confirm the application is served over HTTPS and HTTP redirects to it at the hosting layer. Check the headers through Hostinger's proxy, not only locally. Enable a cron task as described below and test actual verification/reset delivery. Never put tokens or passwords into hosting logs.
8. Verify English/Arabic signup, inbox link verification, initial TOTP setup, a subsequent login, reset, idle expiry and session revocation in staging. Verify no indexable portal URLs are in the sitemap and disabled routes are genuine HTTP 404s for GET, POST and HEAD. Confirm disabling the runtime flag and restarting/redeploying removes links and blocks APIs immediately.
9. After review and all approvals, merge only through a reviewed PR and deliberately enable the production flag with the configured database/mail/cron. Recheck both public languages and all relevant auth flows on `alabbas.sa`.

The schema and SQL migration are in `prisma/`. The checked-in initial migration applies to a fresh database; `migrate deploy` records it and is safe to repeat. Future schema changes need new reviewed migrations. Do not edit an already-applied migration. A code rollback does not reverse schema changes; keep the portal disabled while planning a restore. Never use a destructive Prisma reset to repair production.

## Scheduled mail and cleanup

Signup/reset queue encrypted mail in the same transaction as the action token. There is no background worker. A scheduler makes a **POST** to `/api/portal/cron` with `Authorization: Bearer PORTAL_CRON_SECRET`, preferably every minute. Unauthenticated requests are rejected; the endpoint is also 404 when the portal is disabled. It does not accept cookie authorization or secrets in URLs.

Use hPanel cron if available, or an approved external HTTPS scheduler that can securely store and send an authorization header. `npm run portal:cron` provides a bounded Node invocation when the scheduler has access to the app directory and its private `.env`. Cron environments do not automatically inherit the web app's hPanel environment; verify availability privately. Set the working directory to the app directory and use the actual Node 22 executable path supplied by Hostinger. Do not include a secret directly in the cron command or query string.

Each request claims at most five jobs with a database lease, requires verified SMTP TLS, retries failures with backoff up to five attempts, and clears the encrypted payload after successful submission. A SMTP success means the mail server accepted it, not proof of inbox delivery. Monitor unsent jobs and rejected cron calls without logging payloads, credentials or links. Retries use a stable Message-ID but SMTP cannot guarantee exactly-once delivery. Run frequencies and batch size must support expected signup volume; expired links require a new request.

Cleanup removes expired/idle sessions, expired action tokens and rate buckets, sent email jobs after seven days, and audit/old mail jobs after 90 days. **These retention periods are provisional engineering defaults requiring Saudi legal/compliance approval before enabling the portal.** Future regulated consent/order records require their own approved retention and legal-hold handling; do not apply this auth audit cleanup to them. Data-rights requests are retained pending staff resolution, not deleted by this cron.

## Tests and review

```sh
npm ci
npm run lint
npm run typecheck
npm run format:check
PORTAL_ENABLED=false npm run build
```

For portal integration tests, provision a **disposable loopback MySQL/MariaDB database whose name ends in `_test`**. Configure its credentials and synthetic mail settings in a private test `.env`. Tests delete all portal tables' contents and refuse other database hosts/names. Never point the test suite at staging/client data.

1. Apply `npm run db:migrate` to that test database.
2. Build the application once with the portal disabled and canonical public `SITE_URL`. Start that same production build twice: an enabled instance on port **3020** with the private test environment and a disabled instance on **3021** with only `SITE_URL=https://alabbas.sa` and `PORTAL_ENABLED=false`. The shared build must support both runtime states.
3. Run `npm run test:portal` with the enabled instance's test environment. `PORTAL_TEST_URL` and `PORTAL_OFF_TEST_URL` can override those loopback addresses. The HTTP test harness manually supplies the configured HTTPS Origin and handles Secure cookies for local testing; this does not replace a real HTTPS browser test on Hostinger.
4. Run `TEST_BASE_URL=http://localhost:3021 npm test` with the contact integration unset. This covers all 44 existing public pages and the contact API.

The retained portal suite checks feature gating, localization/noindex/CSP, CSRF, request bounds, role injection, hashing/encryption, verification/reset links, mandatory MFA, replay/concurrency, timeout/suspension, owner permissions, session revocation, step-up requests, database rate limits and protected cleanup. KYC/bank/order/admin endpoints must remain unavailable in Phase 1; their full permission/workflow tests will accompany their respective phases.

Local verification uses an isolated MariaDB instance through Prisma's MySQL connector, without root or Docker. Repeat migrations and real TLS/SMTP/cron/HTTPS checks against the exact Hostinger MySQL version in staging. Local tests do not establish regulatory approval or guarantee production security. Arrange an independent security assessment before collecting client data.

`package.json` overrides Prisma's configuration-only `deepmerge-ts` dependency to **8.0.2**, which fixes the recursive-graph stack-exhaustion advisory [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). Prisma generation, schema validation, migrations and portal builds are checked with this override. Reassess it when upgrading Prisma; do not use a forced framework downgrade to suppress audit findings. The existing ESLint development dependency advisory is separate from the production dependency audit.

## Privacy, cookies and legal copy awaiting approval

The existing cookie consent component remains intact. Portal session and CSRF cookies are strictly necessary for requested account security and work even when optional cookie consent is declined. No optional tracker is added, and no bearer token is stored in local storage. Signup records a timestamped, versioned privacy acknowledgement, linked to the existing privacy policy; this is not an assertion that the draft policy is legally sufficient.

Before enabling, counsel/compliance must approve updates to the existing privacy, cookies, terms and disclosures pages: the legal controller/contact, purposes and lawful basis, minimum account data, verification/MFA/security logging, service providers and location of processing, international transfers, retention and legal holds, export/deletion procedures and response deadlines, essential cookie names/duration, account terms, service limitations, and the final authorization/permitted activities. **Do not change the current CMA wording until approval is confirmed.** This phase deliberately leaves those public legal pages and footer text unchanged.

Requests need an assigned privacy contact, secure delivery of exports, identity verification, approved deletion/anonymization and legal-hold handling, and a recorded staff resolution. There is no compliance/admin UI yet; production enablement depends on an approved operational procedure until Phase 2 provides it. There is no email-only MFA reset or recovery bypass. Lost-authenticator recovery requires a separately approved identity-checking procedure and audited implementation before offering recovery to clients.

## External requirements still outstanding

- CMA authorization/permitted-activity confirmation and approval to expose client registration; approved Arabic/English account, privacy/cookie/terms copy and Saudi PDPL processing/retention procedures.
- Real Hostinger MySQL credentials, verified database TLS or local connection, backups, staging migration verification, HTTPS and proxy configuration.
- Approved SMTP credentials, verified sender domain and tested inbox delivery; a protected scheduler and monitoring for delivery failures/security events.
- Secret provisioning/backup and rotation procedures; privacy-request ownership; an approved lost-TOTP recovery process; independent security review before public collection of client data.
- Nafath access credentials/partner agreement only if that provider is later implemented. The current mock requires no external key and provides no identity assurance.

SAMA-licensed Open Banking partner contracts/API keys, payment/custody agreements, investment product disclosures and risk acknowledgements remain requirements for future phases. They are not simulated as approvals in Phase 1, and no real money movement or online investment offer is implemented.
