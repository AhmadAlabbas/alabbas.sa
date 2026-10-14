# Client portal — Phase 2: individual KYC

This phase is a separate feature branch and a **stacked pull request targeting `feat/portal-phase-1-auth`**. Review Phase 1 first, then review this increment. Do not deploy this branch over the public site or merge directly to `main`. The existing online demo and public website receive no deployment from this phase. Once the parent PR is merged, rebase/retarget this PR onto the merged main and resolve the parent's shared-component integration with the existing demo before deployment.

`PORTAL_ENABLED=false` remains the default. All real auth/portal pages and APIs are 404 when disabled; public login/signup links remain absent. No bank connection, online investment offer or money movement is added. KYC and staff pages are private, no-store, noindex and use Phase 1's nonce CSP and authenticated server sessions. Public footer, legal pages, CMA wording and public dictionaries are unchanged.

## Included workflow

- Individual Saudi-resident clients aged 18 or older can save a **complete, validated draft**, submit it, see review feedback and resubmit after a request for changes. Partial/invalid drafts are deliberately not stored. Institutional and government account types remain in the schema but cannot use individual KYC.
- Personal details: legal name, Gregorian date of birth, nationality code, Saudi city, occupation, national ID/Iqama, and politically exposed person (PEP) declaration. Source of funds includes a category and short explanation; financial capacity uses income/assets bands rather than exact balances. No document uploads, bank credentials or additional contact data are collected.
- ID type/length/checksum checks, adult age and bounded strict input validation. **These checks do not verify identity, Iqama validity or sanctions status.** Use an approved independent/manual verification procedure before approval. No fabricated government verification is shown.
- Four risk questions cover objective, horizon, experience and tolerance for loss. Conservative constraints override the simple conservative/balanced/growth classification. This is a **preliminary, unapproved classification for staff review**, not suitability approval, financial advice, guaranteed returns or a product recommendation.
- Each submission records two explicit acknowledgements using the server's current `kyc-v1` English/Arabic text, locale, UTC acceptance timestamp, hashed network context and browser descriptor. The exact text is retained alongside the version; a client cannot supply or alter the stored wording. Existing privacy and cookie controls are linked/reused. No optional tracker or extra browser storage is added.
- The account stays `PENDING` during drafting, submission, corrections or rejection. Only an admin/compliance review can set it to `APPROVED`. Approved/rejected submissions are locked; an approved account still has no investing/banking endpoint. Suspension overrides session access and blocks approval. There is no client-controlled status/role field.

### Routes

| Route                                  | Access                                                |
| -------------------------------------- | ----------------------------------------------------- |
| `/en/portal/kyc`, `/ar/portal/kyc`     | MFA-authenticated individual client, own details only |
| `/[locale]/portal/admin/kyc`           | Admin, compliance officer, relationship manager       |
| `/[locale]/portal/admin/kyc/[caseId]`  | Admin/compliance officer; submitted snapshot only     |
| `GET/POST /api/portal/kyc`             | Own details / validated draft save                    |
| `POST /api/portal/kyc/submit`          | Own submission with both acknowledgements             |
| `GET /api/portal/admin/kyc?page=0`     | Paginated queue, 50 summaries at a time               |
| `GET /api/portal/admin/kyc?id=CASE_ID` | Admin/compliance detail read, durably audited         |
| `POST /api/portal/admin/kyc`           | Admin/compliance decision with fresh TOTP             |

The relationship-manager queue exposes only opaque case ID, status, revision and update time, with no identity details, financial details, client name, email or risk answers. There is no case-detail/decision access for that role. Client requests cannot choose another account ID. Staff cannot inspect unsent drafts or review their own earlier client submission. No role-management HTTP endpoint exists.

### Review procedure

Admins and compliance officers can approve, request changes or reject a submitted account. Each decision needs a reason that is **visible to the client**, and a fresh, unused TOTP code. Approval additionally requires a recorded reviewer attestation that the identity, source-of-funds, PEP and sanctions checks were completed under the approved procedure. Record supporting evidence in the approved compliance case system; do not put secret/internal-only notes into client feedback. The attestation is not automated verification and is not proof of an external provider response.

Review, MFA consumption, profile revision, account approval and audit insertion share one database transaction. Conditional SQL updates and unique submission/review constraints prevent duplicate or contradictory decisions. A stale revision or competing decision returns `409 CONFLICT`; no money or bank consent is involved. Mutations use Phase 1's Origin/double-submit CSRF protection, bounded JSON, strict schemas and database rate limits. Staff detail reads are limited and logged.

## Storage, encryption and retention

Two additive migrations create `KycProfile`, `KycSubmission`, `KycConsent`, `KycReview` and `KycEvent`, then add the explicit reviewer-check attestation. The Phase 1 migration is unchanged. Existing account/session/mail records are preserved. Migrations were tested on a fresh database, an existing auth database and repeated deployment; validate again on the actual Hostinger MySQL version in staging.

The current profile and every submitted snapshot encrypt the **entire KYC payload**, including ID, date of birth, financial data and risk answers, using Phase 1's AES-256-GCM key and record-specific authenticated context. Review feedback is also encrypted. Snapshots use a separate context from drafts. Client/staff API responses decrypt only after session/role/ownership checks; relationship managers receive summaries only. Backups need encryption, restricted access and tested recovery. The database runtime account and operational access must be restricted; application-level encryption does not protect a compromised application holding the key.

Submitted snapshots, consent records, decisions and durable KYC events are append-only through the application. There are no edit/delete routes for them. `KycEvent` records actor, target, action, revision, timestamp and hashed request context. It is separate from Phase 1 auth audit logs; the auth cron's 90-day cleanup never touches KYC submissions, consents, reviews or events. Restrictive foreign keys prevent simply deleting a related client/reviewer. This is not a WORM storage or tamper-proof ledger; administrators/database owners can still change records.

**No automatic KYC retention deadline or deletion job is invented.** Compliance/legal must approve retention, legal holds and a supervised erasure/anonymization procedure before real data collection. Phase 1 export/deletion requests remain available with password/TOTP and stay pending for the assigned privacy team. Fulfilment must include applicable KYC history/consents and approved third-party redactions; this phase does not automatically export identity data or erase regulated records.

## Hostinger staging and GitHub deployment

Follow [PORTAL.md](PORTAL.md) for the Node 22 app, MySQL TLS, secrets, SMTP, HTTPS and protected cron. No Docker, root privileges, daemon or new vendor key is needed for this phase.

1. Keep the production GitHub connection on `main` and `PORTAL_ENABLED=false`. Deliver Phase 2 through its PR and stop for review. Existing demo paths are independent of real-client collection.
2. Use an isolated Hostinger Node.js staging app, private environment and synthetic data. After both PRs are reviewed and integrated with current main, connect staging to the reviewed commit. Do not enable a production portal merely to inspect the UI.
3. Back up the staging database. Use `npm ci` and `npm run build:portal`: the existing preflight validates secrets/configuration, `prisma migrate deploy` applies all reviewed additive migrations, and `next build --webpack` preserves Hostinger's supported build. Start with `npm start`. For a disabled public build, keep `npm run build` without database credentials. Never use `db push`, `migrate dev` or a reset on production.
4. Phase 2 adds **no required environment variable**. `.env.example` still contains empty server-only placeholders and `PORTAL_ENABLED=false`. Retain `PORTAL_ENCRYPTION_KEY` securely; do not replace it without an approved decrypt/re-encrypt migration and backup plan.
5. Provision staff accounts through the normal verified-email/MFA signup process with staging synthetic identities. In the authorized app directory/SSH console, run `npm run portal:set-role -- staff@example.com COMPLIANCE_OFFICER` (or `ADMIN` / `RELATIONSHIP_MANAGER`). The operator CLI requires an existing verified, MFA-enabled, nonsuspended account, records an audit event and revokes its sessions. Sign in again afterward. The CLI relies on trusted deployment/operator access, is never served over HTTP, and must not be callable from client input. Record the approving operator separately under the access-management procedure. Use the private `.env` or securely inherited hosting settings; do not pass secrets as command-line arguments.
6. Verify both languages, drafts, explicit consent, pending status, corrections, immutable earlier submissions, rejection, fresh TOTP approval, self-review denial, manager restrictions, suspension, rate limits and disabled 404s. Check noindex/CSP/cookies through the actual hosting proxy and repeat concurrency tests on its MySQL version. Confirm unchanged public/legal pages and the existing demo after integrating the parent PR.
7. A code rollback does not undo schema changes. Disable the real portal, restore reviewed code and keep data/backups intact while planning recovery. Retention/erasure changes need a separate reviewed migration/procedure.

## Verification

Use the disposable loopback `_test` database and enabled/disabled production-server arrangement documented in [PORTAL.md](PORTAL.md). `npm run test:portal` now runs auth and KYC integration suites serially. It deletes test-table contents and refuses a non-loopback or non-`_test` database; never point it at client data. Run `npm test` against the disabled local server for the existing public smoke suite, plus lint, TypeScript, format and production build checks.

KYC tests cover consent and validation tampering, encrypted/context-bound records, owner/role/MFA boundaries, identity format/age, risk constraints, pending/approved/rejected/correction states, preserved earlier submissions, pagination, rate limits, simultaneous writers/reviewers, TOTP replay, suspended/unsupported accounts, retention and noindex/feature gating. Full order/bank flows belong to future phases; those endpoints remain 404.

## External requirements and legal copy before enablement

- Review/approval of Phase 1 and this phase; confirmed CMA authorization/permitted activities and explicit approval to expose registration/KYC.
- Saudi PDPL/legal approval of minimum fields, purposes/lawful basis, consent wording and versions, reviewer feedback visibility, data access, processing location/transfers, retention/legal holds and export/deletion procedures. Final Arabic/English legal translation and privacy-contact ownership.
- Approved KYC/AML operating policy: independent identity/ID validity checks, source-of-funds assessment, PEP/sanctions screening, staff training, evidence retention and escalation. This phase needs no API license/key to run synthetically. A real identity/screening vendor requires its approved API credentials, partner agreement and data-processing terms if selected later. Optional Nafath remains Phase 1's fail-closed mock.
- Approval/validation of the risk questions and classification under the company's suitability policy before using them for real investment decisions. Product suitability checks and risk/fee disclosures belong to Phase 5.
- Hostinger staging migration and TLS/HTTPS verification, approved SMTP, cron/monitoring, encryption-key custody/rotation, backups and independent security assessment before collecting real client data.

Legal copy requiring later updates: **privacy** (ID/Iqama, financial/PEP/risk data, consent and review records, processors, retention and rights), **cookies** (existing necessary session/CSRF names and durations; no new cookies here), **terms** (onboarding, accurate information, review/rejection/corrections, account restrictions and client-visible feedback), and **disclosures** (verification limits, approved activities and the role of risk profiling). The public footer and existing CMA/legal wording remain untouched. Open Banking, payment/custody contracts and investment-product approvals remain future-phase requirements.
