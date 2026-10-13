# Online portal demo

This release publishes a browser-only preview at `/en/demo/portal` and `/ar/demo/portal` on the existing Hostinger site. It deliberately contains no real authentication server, database, mail integration, KYC approval, banking connection or money movement. The secure Phase 1 implementation remains in its separate review branch/PR.

The demo reuses the portal's account-security components and the public site's fonts, design tokens, header, footer and locale conventions. Every demo view has an explicit English/Arabic demo notice, noindex metadata and an X-Robots-Tag. Demo URLs are excluded from the sitemap and disallowed in robots. Existing public navigation, legal content and CMA wording are unchanged.

Try signup and its sample inbox, simulated verification, signin, code `123456`, session revocation, sample export/deletion requests, password changes and resets. Identity/password fields are fixed sample values and read-only, and requests stay in browser memory. Refreshing the page or choosing Reset demo starts a fresh sample state; changing language may also start a fresh state. No demo action calls the actual auth/portal APIs, writes account data to cookies/local storage, or sends email. The existing optional cookie-preference control keeps its original behavior.

## Deployment

Use the existing `npm ci`, `npm run build` (Webpack), `npm start`, Node 22 and Hostinger GitHub connection. No new dependencies, secrets, migrations or hosting services are required. Publish from the reviewed demo feature branch through a pull request to `main`, not a direct push. The real `/[locale]/auth/*`, `/[locale]/portal/*` and `/api/auth`, `/api/portal` endpoints remain absent/404 in this demo-only release. Do not set `PORTAL_ENABLED=true` to make this preview work.

## Checks

Run lint, typecheck, formatting, the production build, and `npm test` against the production server. The retained demo tests exercise fixed sample identity, code validation, session revocation, request metadata, password/reset state, unknown actions, all 18 localized pages, noindex and the unavailable real APIs. Browser checks cover the full English/Arabic demo flow and verify that demo actions make no requests to `/api/auth` or `/api/portal`.

Validated on 13 October 2026 with Node 22.23.3: lint, typecheck, formatting, a fresh `npm ci` and Webpack build, all **14 automated tests**, two complete bilingual browser flows, **24** responsive/accessibility checks and language switching. Browser checks reported zero page errors and zero calls to real auth/portal APIs. Header, footer, public dictionaries/legal text, environment template and dependency manifests have no source changes in this release.

Publishing this preview does not complete Phase 2 or authorize real client onboarding. KYC/compliance review, banking, investing and the operational/legal prerequisites still require their own phased reviews before the real portal is enabled.
