# Validation — 12 October 2026

Validated the current cloud instance in `/workspace/alabbas.sa` using Node.js 24.19.0, Next.js 16.4.0 and React 19.3.0. These results describe local production-server checks, not a deployment, published environment snapshot or a new-task restoration.

## Passed

- Reinstalled from `package-lock.json` using `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`, then rebuilt successfully. The lockfile remained the dependency source of truth.
- `npm run lint`, `npm run typecheck`, `npm run format:check` and `npm run build` passed. Build generated all 44 localized website pages plus framework / SEO routes.
- `npm run dev -- --port 3003` started successfully and served English and Arabic Home pages with HTTP 200. The final production server starts with `npm start` on port 3000.
- All **7** existing smoke tests passed; none failed, skipped or were disabled. They cover all 44 routes, localization, metadata, redirects, 404s, sitemap / robots, security headers, contact validation, same-origin browser submissions, the honeypot, throttling and the honest 503 response when delivery is unconfigured.
- Playwright checked **176** route / viewport combinations: all 44 pages at **360, 768, 1024 and 1440 pixels**, with no horizontal overflow.
- Browser interactions passed: cookie persistence and reopening, mega-menu dismissal and keyboard focus return, mobile navigation dismissal, insight filtering, language switching with the route preserved, investor-relations form selection and the unavailable-delivery message without clearing the user’s input.
- **26** axe-core checks returned no violations against WCAG 2 A/AA and WCAG 2.1 AA tags. These cover both Home languages at all four widths plus representative interior pages in both languages. No browser page errors were recorded. Automated checks are not a full accessibility certification; assistive-technology and native Arabic review remain launch tasks.
- `npm audit --omit=dev --audit-level=high` returned **0 production dependency vulnerabilities**.

## Lighthouse

Cold-load Lighthouse runs used the production build and system Chromium on the local server, with Lighthouse mobile or desktop defaults. Runs were sequential to avoid concurrent browser workloads distorting performance measurements. Scores vary by device, network and hosting; validate again on the final domain after approved content and integrations are added.

| Home page        | Performance | Accessibility | Best practices | SEO |
| ---------------- | ----------: | ------------: | -------------: | --: |
| English, mobile  |          95 |           100 |            100 | 100 |
| Arabic, mobile   |          95 |           100 |            100 | 100 |
| English, desktop |         100 |           100 |            100 | 100 |

## Diagnosed and corrected

- Upgraded the initial framework / React versions to the current available stable releases after production dependency advisories were found.
- Corrected cookie-state synchronization and passed ESLint without suppressing its rule.
- Corrected browser-origin validation to compare the public Host with the request protocol instead of Next.js’s internal bind address. The smoke suite now exercises an actual same-origin Origin header.
- Replaced unsupported font arrow glyphs with SVG icons.
- Changed scroll fades to slides with fully opaque text after contrast checks exposed reduced contrast; reduced-motion preferences disable the effect.
- Replaced preloading both languages’ complete font sets with active-language preloads. Fonts are served locally with their original OFL licenses.
- Restarted production servers after rebuilds; stale servers referencing replaced `.next` chunks are not valid performance / accessibility evidence.
- Rejected background-removal logo exports that distorted the edges. The site uses a clean raster rendition, rendered in black / white using CSS; original-vector confirmation remains a brand task.

## Limits and launch inputs

The contact adapter has not been tested against a real email / CRM provider because none is configured. It returns HTTP 503 rather than reporting a successful delivery. Configure the approved HTTPS gateway and test its acceptance contract before launch. Add shared rate limiting and an approved spam challenge as appropriate; the current limiter is per instance and assumes trusted hosting IP headers.

The full dependency audit reports a high-severity **development-only** advisory chain through `braces` → `micromatch` → `fast-glob` → Next’s ESLint plugin/config. The registry offers no supported patch for this chain; the suggested forced downgrade was not applied. This tooling is not used to process site visitor input. Revisit it when a compatible patched lint dependency is published.

Company figures, leadership, case studies, editorial items and legal policies are marked illustrative, placeholder or draft. Office details, social URLs and vacancies need verified business input. CMA authorization is not asserted. See the complete business/legal launch checklist in `README.md`.

The initial local validation was completed before GitHub publication or a public website deployment. GitHub publication and Hostinger deployment are separate steps; verify each independently. No pre-existing application files were overwritten; the selected repository was empty when this build began. The original supplied content attachment remains preserved.

Cloud configuration draft persistence was confirmed for **install_script** and **start_skill**. This save did not execute those fields, publish a snapshot, deploy the website or validate restoration in a fresh task. Review/save the draft in environment settings, then publish the environment to activate the prepared configuration and snapshot.

## Evidence

Current-instance QA files are in `/workspace/alabbas-qa`: `results.json`, `interactions.json`, `lighthouse-en-final.json`, `lighthouse-ar-final.json`, `lighthouse-desktop-final.json` and screenshots. One-off browser tooling was installed outside the application checkout. The application’s repeatable smoke tests are retained under `tests/` and documented in `README.md`.

## Hostinger Node.js 22 verification

The supplied Hostinger build-settings PDF selects Next.js, branch `main`, Node.js **22.x**, root `./` and the default Next.js build settings. The application engine declaration now accepts Node.js 22 and 24, and `.nvmrc` selects 22 to match that deployment.

A fresh source copy outside the application checkout was installed using Node.js **22.23.3** and the frozen dependency lockfile. Installation, ESLint and the production build all passed; all 44 localized website pages were generated. The production server started on port 3010, all **7** smoke tests passed with none skipped, and the Next.js logo-optimization request returned HTTP 200 with a valid WebP image. The existing Node.js 24 build was preserved during this check.

The temporary verification copy's parent has a separate lockfile for its Node.js binary installation, causing a workspace-root inference warning. This is specific to that local verification directory; it did not fail the build or functional requests. It does not establish the root layout of Hostinger's deployment checkout.

These results validate Node.js 22 compatibility locally. The live Hostinger build, environment-variable values and initial domain deployment still require verification after deployment. Set `SITE_URL=https://alabbas.sa`; remove the optional webhook keys from Hostinger's environment editor until a real delivery gateway is configured.
