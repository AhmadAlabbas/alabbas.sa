# ALABBAS Investment Platform — implementation, controls and release gates

Status: **non-production investment prototype**, 1 November 2026.

This project has TWO distinct surfaces:

1. **Corporate website** at alabbas.sa, publicly informational.
2. **Investment account and trading experience**, planned as a separately deployed, protected investor application (a proposed subdomain is invest.alabbas.sa). The prototype lives at `/en/invest` and `/ar/invest` so it is easy to review without requiring Hostinger credentials.

## Delivered on branch `feat/investment-platform-sandbox`

- **Bilingual fictional investment workspace** at `/en/invest` and `/ar/invest`: responsive overview, simulated cash and holdings, allocation, sample markets, watchlist, paper buy/sell tickets, order history and investor-category switching.
- **Paper order validation**: only integer units, no margin, no short selling, no spending more fictional cash than available. Stocks, ETF, fund, bond and sukuk instruments have FIXED FICTIONAL sample prices and issuers. No real market data feeds.
- **Institutional flow demonstration**: a fictional maker/checker queue for corporation/government sample orders. A role toggle is *purely visual* and is not security or authority verification.
- **Local-only state**: browser localStorage saves the fictionally funded sample account, partitioned by investor category. Nothing is sent to ALABBAS servers by the demo. Never use these browser records for actual orders or financial records. No real login is required in the sandbox.
- **Sign-up investor category**: `INDIVIDUAL`, `INSTITUTION` or `GOVERNMENT`. Default remains individual for compatibility. Type is unverified self-attestation, not an approval.
- **Entity applications**: after email verification and TOTP, institution/government accounts may submit preliminary legal entity details over an origin/CSRF-protected API, stored encrypted using the existing portal key, with a DB uniqueness constraint and audit log. Applications remain **SUBMITTED**; no self-approval, order routing, trading, funding or authorized representative roles. Personal KYC remains for individuals only.
- **Safe routing**: entity clients go to `/en/portal/entity` (or AR equivalent) instead of an incompatible individual dashboard.
- **Tests/CI**: paper-order unit tests; GitHub Actions checks for lint, typecheck, tests and a portal-disabled public build.

## What is NOT delivered or enabled

- A licensed investing service, brokerage account, bank account, custodian or client money account.
- Security-grade institutional maker/checker authorization, corporate signatory verification or beneficial ownership checks.
- Real securities-market prices, exchanges, broker connectivity, settlement, holdings, custody or corporate actions.
- Real subscriptions, capital calls, transfers, deposits, withdrawals, returns, dividend payments, bond coupons or fees.
- Automated suitability determinations, financial advice, trade execution, portfolio management or customer approval.
- Live management of external investor organizations, full KYB documentation, regulatory screening or a production dealing desk.
- Hostinger credentials, production MySQL migrations, SMTP tests or a verified live deployment.

These items must not be represented as live services in marketing or UI. Do not enable real-money trading simply by setting an environment variable.

## Identity and onboarding data model

Existing `User.accountType` already distinguishes individual, institution and government accounts. The new sign-up selection stores this category only, with status `PENDING`.

New `EntityApplication` records are available to a **verified email + MFA session only**. They store the applicant's claim (legal entity name, registration reference, jurisdiction SA and representative title) encrypted with AES-256-GCM under a per-user associated-data context. The public API returns application status, **not** the raw identity claims. One application per user is enforced at the database layer.

This preliminary application is NOT enough for institutional onboarding. Future regulated build must add:

- independently verified legal entity identifier, registration documents, shareholder/UBO structure, sanctions/PEP checks, documentary evidence and record retention;
- multi-user organization accounts and explicitly verified membership/authority;
- dual controls for trade creation, approval, limits and entitlements enforced in a server-side authorization service;
- a documented government-entity procurement/mandate and signatory approval path;
- KYC/KYB review audit trails, reviewer segregation, eligibility and product-specific suitability.

## Proposed investment service architecture (phase 3)

```
Investor portal (browser / mobile)
  -> Auth, MFA, verified org + role permissions
  -> KYC/KYB, suitability, restrictions, product eligibility
  -> Order Management Service (OMS) with idempotency keys and pre-trade checks
  -> Licensed broker/execution or asset manager (only after authorized agreements)
  -> Trade events and settlement confirmations
  -> Independent double-entry cash/securities ledger
  -> Licensed custodian, bank/payment rails and daily reconciliation
  -> Statements, notifications, audit and compliance monitoring
```

Integration boundary rules:

1. No order endpoint or transfer endpoint may exist without licensed partner/authorization review. UI prototypes must call only the local pure paper engine.
2. Orders require stable idempotency keys, user and organization authority verification, product entitlement, market-session/risk checks, validated quotes and explicit customer confirmation. **Never treat a button click as execution**.
3. An order has server-owned states (e.g. CREATED -> VALIDATED -> SUBMITTED -> ACKNOWLEDGED -> PARTIAL/FILLED/CANCELLED/REJECTED). Broker acknowledgements are not fills; fills require execution IDs and reconciliation.
4. Positions and available cash must derive from reconciled server ledgers, not browsers or quotes. Use immutable, audit-linked balanced entries, per-currency cash, explicit fees and tax treatment. Handle out-of-order and repeated provider events safely.
5. Separately validate corporate actions, bond/sukuk accrued interest, coupons/maturities, fund NAV/cutoffs and settlement cycles.
6. Use trusted licensed market data contracts, timestamps, exchange status, stale data indicators and market-specific price precision. Fictional fixtures must never be represented as exchange data.
7. Isolate all tenants at service and query layers; audit cross-tenant access, implement revocation and step-up MFA, enforce spend/approval limits and segregate traders from approvers.
8. Build data retention, Saudi PDPL and applicable authority/compliance obligations with counsel and appointed responsible teams; include backups, disaster recovery, security incident handling and third-party due diligence.
9. Financial transactions cannot be activated until the legal, licensed, operational and technical approval gates below pass.

## Four-phase roadmap and gates

### Phase 1 — universal accounts (partially implemented)

[x] Individual/institution/government sign-up category.
[x] Existing email verification, MFA, individual KYC and encrypted data foundation.
[x] Encrypted, status-only, pending institution/government applications.
[ ] Staff-reviewed KYB/KYC, authoritative validation, document provider, signatory + UBO verification.
[ ] True multi-user org permissions and independent maker/checker authorizations.
[ ] Formal individual/institutional client agreements, privacy and disclosures.
[ ] Hostinger deployment and MySQL/SMTP verification.

### Phase 2 — investment experience (paper prototype implemented)

[x] Fictional instruments for stocks, ETFs, funds, bonds and sukuk.
[x] Simulated order ticket, holdings, cash checks, watchlist, history.
[x] Bilingual, responsive workspace; simulated institutional approval UI.
[x] Unit tests for the engine.
[ ] Server-backed, test-only simulated portfolio accounts and independently authorized org approvers.
[ ] Real quoted data license/feeds and full market data quality controls (separate from paper fixtures).
[ ] Independently verified WCAG/RTL and browser regression testing on deployment.

### Phase 3 — regulated integrations (design only; BLOCKED)

[ ] Written legal analysis of exact products and jurisdictions, CMA activities and authorization basis.
[ ] Contracts and credentials with licensed broker, custodian, bank, funds and approved providers.
[ ] Server-side OMS, append-only ledger, custody/settlement reconciliation and approval engine.
[ ] AML/CFT, sanctions/PEP, risk, recordkeeping, market-abuse controls, PDPL and security controls.
[ ] Security audit, incident response, monitoring, disaster recovery and independent penetration test.

### Phase 4 — real-money release (BLOCKED until all prior gates pass)

[ ] Approval by legal/compliance and regulated partners.
[ ] Hostinger or alternative production environment hardened with secrets, migrations, backups, DDoS defenses and audit retention.
[ ] Full end-to-end integration/sandbox testing; reconciling records, settlements, refunds and failures.
[ ] Approved product listings, fee schedules and marketing disclosures.
[ ] Controlled launch with live-ops monitoring, support, incident response and rollback procedure.

## Local development

Use Node 22, as specified in .nvmrc:

```bash
npm ci
npm run lint
npm run typecheck
node --import tsx --test tests/invest-demo.test.ts
npm run build
npm run dev
```

Visit http://localhost:3000/en/invest and /ar/invest to review the sandbox. It is unindexed and does not expose order/payment APIs. Authentication lives at /en/auth/* only when the original portal feature flag is enabled and configured; the safe legacy browser-only authentication demo remains at /en/demo/portal.

### Later: Hostinger database

Do not create dummy credentials or test with production customer data.

1. Provision a dedicated MySQL database and restrictive application user over verified TLS, using a trusted CA certificate.
2. Store `DATABASE_URL`, `PORTAL_ENCRYPTION_KEY`, `PORTAL_CRON_SECRET` and SMTP settings in private Hostinger environment settings. Never commit secrets.
3. Follow PORTAL_RELEASE.md for backups, migration permissions and `npm run build:portal`, noting this branch adds a seventh migration.
4. Run migrations on a throwaway/staging database first. Ensure the actual MySQL engine and index syntax match.
5. Verify real email, HTTPS, proxy trust, CSP, cookies, CSRF, rate-limits, cron and reviewer procedures before considering portal activation.
6. Keep `PORTAL_ENABLED=false` until independently checked. Even when enabled, it does NOT enable any real investing functionality.

## Deployment and change safety

This branch is intentionally separate from `main`. It must pass CI and manual code/design review before merge. No production deployment is asserted. This work contains no secrets, real payments, live trading or bank integration.
