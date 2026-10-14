# Phase 2 validation — 14 October 2026 (Saudi Arabia)

Validated on `feat/portal-phase-2-kyc`, based on the unmerged Phase 1 auth branch. Node 22.23.3, Next.js 16.4.0, Prisma 6.19.3 and local MariaDB 11.8.6 through Prisma's MySQL connector. No production database, Hostinger app setting or live website was changed.

## Passing checks

- Frozen `npm ci`, Prisma client generation/schema validation, ESLint, TypeScript, Prettier and `git diff --check`.
- Production Webpack build with `PORTAL_ENABLED=false` and no database/mail/auth secrets. All 44 public routes remain statically generated. The same production build runs in enabled and disabled runtime configurations.
- Both new additive migrations on the existing Phase 1 test database; all three migrations on a fresh test database. Repeated `migrate deploy` reports no pending migrations. The initial Phase 1 migration is unchanged.
- **61 passing auth/KYC integration tests:** 33 auth regression tests and 28 KYC tests. No failed, skipped or disabled tests. Includes ownership/roles, MFA and replay, CSRF/request limits, injection/age/ID validation, encryption/context binding, exact bilingual consent text/timestamps, immutable resubmissions, pending/approved/rejected states, correction feedback, suspension/unsupported account types, pagination, rate limiting and protected retention.
- Concurrent draft creation permits one initial revision. Competing reviewers permit exactly one decision; the other returns HTTP 409, and account/profile status remain consistent. Conditional SQL writes run in a Read Committed transaction and recognize MySQL/MariaDB conflict errors. This avoids a reproduced MariaDB stale-record error under competing review updates.
- **7 passing public smoke tests**, including all 44 existing bilingual routes, metadata, SEO endpoints, security headers, genuine 404s and contact validation/throttling. Contact delivery integration remained unset during testing.
- Operator-only role CLI checked on an existing synthetic verified/MFA account: role update, audit insertion and revocation of that account's sessions pass. No real staff account was modified.
- Source comparison against the parent confirms no change to the public footer, CMA/legal wording, public dictionaries, public page implementation, `.env.example` or the initial auth migration. No new dependency or client-exposed secret was added.

## Browser validation

- Full English/Arabic KYC flows: MFA login, complete draft save, explicit consent/submission, pending locked details, compliance request for changes, client correction/resubmission, fresh-TOTP review approval and locked approved account.
- Relationship-manager status queue has no detail/review links. Admin/compliance permissions and self-review denial are also covered by the integration suite.
- **36 passing layout/accessibility checks:** both locales × widths 390, 768 and 1440 × draft form, pending account, review queue, submission details, approved account and relationship-manager queue.
- No page errors, CSP violations, horizontal overflow or reported WCAG 2 A/AA and 2.1 AA axe violations in those checks. Arabic remains RTL; displayed timestamps use Asia/Riyadh.
- These checks used the local HTTPS fixture and only its explicitly pinned test-certificate key. System/browser trust stores were not changed and global certificate checking was not disabled. Seeded accounts/identity details were synthetic. Fixture-only TOTP-window resets allowed rapid sequential review tests; the application has no MFA bypass, and the automated suite separately proves replay rejection.

## Checks still required before real collection

Repeat migrations/concurrency checks on the exact Hostinger MySQL version and verify database TLS/CA trust, HTTPS/CSP/cookies through the hosting proxy, private-key backup/recovery, actual SMTP delivery and scheduled maintenance in staging. Parent/main integration must also preserve the current online demo and latest public changes before any reviewed deployment.

CMA/permitted-activity confirmation, approved KYC/AML and identity/sanctions procedures, risk-questionnaire validation, final bilingual consent/legal copy, Saudi PDPL retention/rights procedures and independent security assessment remain outstanding. No real national-ID verification, screening API, product suitability decision, bank connection or money movement was exercised or asserted. Phase 1 and Phase 2 must be reviewed before enabling the real portal; the live website is unchanged by this PR.

See [PORTAL_PHASE_2.md](PORTAL_PHASE_2.md) for routes, roles, migration/deployment steps and the legal-copy/partner requirements.
