# Combined release validation — 14 October 2026

Release branch `release/portal-phases-1-4-preview` combines current main `06a78a6` and Phase 4 `d5c33a0` (including all parent phases). Node 22.23.3, Next 16.4.0 and Prisma 6.19.3. Checks exercise current-instance production builds with a disposable local `_test` database, not Hostinger production credentials.

- Resolved integration conflicts while preserving the main branch's browser-only demo/runtime, high-resolution logo, legal/footer/site copy and public routes. No changes to logo/public assets, footer or public dictionary. Real MFA login uses the portal entry route (client dashboard/staff review queue); the independent demo retains its security-screen entry.
- Prisma generation, repeat migration deployment (all six already applied, no pending migrations), ESLint, TypeScript, formatting and production Webpack build pass. The public build uses `PORTAL_ENABLED=false` without backend credentials.
- **110 portal tests** pass, with no failures/skips; **14 public/demo tests** pass, with no failures/skips. Feature-off 404s remain enforced.
- **72 browser accessibility/layout checks** pass: 26 dashboard, 10 bank connections and 36 KYC/staff checks. Actual EN/AR password/TOTP login, dashboard/PDFs, bank consent/scopes/pagination/disconnect/reconnect, and KYC save/submit/correction/resubmit/approval/manager permissions pass. No page overflow, page errors or CSP violation recorded. Local HTTPS uses only the local fixture's pinned key.
- Two independent browser-only demo flows pass with no requests to real auth/portal APIs. Existing sample login, inbox/verification, reset, security/session controls and language behavior are retained.

Local evidence is outside the checkout under `/workspace/portal-tools/release-{build,portal-tests,public-tests,browser,dashboard-browser,kyc-browser,demo-browser}.log`. No secrets were printed or committed. Automated checks are not a native Arabic/legal review or independent penetration test.

Live publication, flag activation and actual Hostinger MySQL/SMTP/cron delivery must be checked separately. GitHub deployment does not provision or inject private Hostinger settings. Follow [PORTAL_RELEASE.md](PORTAL_RELEASE.md). All financial figures, PDF statements and bank connections remain mocks; investing remains unavailable. Existing CMA/legal wording is untouched.
