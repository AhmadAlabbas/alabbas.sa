# Alabbas — alabbas.sa

A bilingual, responsive investment-management website built with Next.js App Router, TypeScript, Tailwind CSS 4 and locally bundled Inter / IBM Plex Sans Arabic. English and Arabic are statically generated under `/en` and `/ar`; language switching preserves the current page. The route-based dictionaries provide localization without an external translation service.

## Develop

Use Node.js 22 or 24 LTS and npm. `.nvmrc` selects 22 to match the Hostinger deployment. The cloud checkout is `/workspace/alabbas.sa`.

```sh
npm ci
npm run dev
```

Open the development server on port 3000. No credentials are required to browse the site. Each cloud task is already isolated; use the existing checkout rather than creating a worktree.

```sh
npm run lint
npm run typecheck
npm run format:check
npm run build
npm start
# In another terminal, against the running production server:
npm test
```

The smoke suite exercises all 44 pages, metadata, redirects, 404s, SEO endpoints, security headers, contact validation, the honeypot, unavailable integration behavior and request throttling. Set `TEST_BASE_URL` to test a different local origin. The contact tests assume no delivery integration is configured and use synthetic documentation-range IP addresses.

Production builds use Next.js’s supported Webpack bundler (`next build --webpack`) to avoid the Turbopack CSS-worker crash observed in Hostinger’s build environment. Keep the hosting build command as `npm run build`.

## Client portal (Phase 1)

For the combined Phases 1–4 release and activation on alabbas.sa, follow [PORTAL_RELEASE.md](PORTAL_RELEASE.md). The account backend needs private Hostinger MySQL/SMTP settings, migrations and protected cron; financial data and bank connections remain mock.

The client portal is **disabled by default** with `PORTAL_ENABLED=false`. See [PORTAL.md](PORTAL.md) for authentication architecture, MySQL migrations, private configuration, tests, Hostinger cron/deployment steps and legal prerequisites. Portal changes use one feature branch and reviewed PR per phase; do not push them directly to `main`. Public builds keep using `npm run build` without database or auth credentials.

## Content and design

- `src/content/site.ts`: bilingual interface copy, capabilities, client groups, insight summaries and dates.
- `src/content/editorial.ts`: bilingual sample articles and draft policies.
- `src/content/social.ts`: YouTube, Instagram, TikTok, X, LinkedIn and Pinterest entries. Circular icons are displayed without links until verified profile URLs are supplied.
- `src/components`: shared header, mega menus, footer, buttons, page headings, cards, figures, forms and consent controls.
- `src/components/home.tsx`: complete Home page and shared CTA / capability components.
- `src/components/pages.tsx`: interior page templates.
- `src/app/globals.css`: design tokens and responsive styles, using logical properties for RTL.
- `src/app/[locale]/[[...slug]]/page.tsx`: routes, static generation, per-page metadata and hreflang.
- `public/assets/architecture.svg`: original abstract architectural illustration, not a real property or portfolio holding.
- `public/assets/og.png`: share image. Its source is `og.svg`.
- `public/fonts`: local font subsets and their OFL licenses. Only the active language’s weights are preloaded; the language toggle loads its other font as needed.

Palette: ink `#101511`, white `#FFFFFF`, light neutral `#F3F4EF`, restrained gold `#A8956E`. Typography uses 400–600 weights and follows reduced-motion preferences. Stat counters animate once when visible; motion is subtle and optional.

The supplied angular logo is represented in `public/assets/logo.png`, a clean raster rendition prepared from the image shared in chat. The header renders a black version and the footer a white version with CSS inversion and blending; background removal artifacts were rejected. This is not an original vector master. Obtain the original high-resolution/vector source and approve the rendition before launch.

## Contact delivery

The form validates name, email, organization, enquiry type, message and privacy consent on the server. A hidden honeypot and a best-effort per-instance rate limiter reduce spam. Cross-origin submissions are rejected, payload size is bounded, and the backend never prints enquiry data or credentials.

Copy `.env.example` to `.env.local` for local configuration, or use Vercel environment settings. Keep these variables server-side:

| Variable                | Purpose                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| `SITE_URL`              | Public canonical origin; defaults to `https://alabbas.sa`. Set before building. |
| `CONTACT_WEBHOOK_URL`   | Approved **HTTPS** CRM/email gateway endpoint accepting POST JSON.              |
| `CONTACT_WEBHOOK_TOKEN` | Optional bearer credential for that endpoint. Never expose it to client code.   |

The gateway receives `name`, `email`, `organization`, `clientType`, `message`, `consent` and `locale`. A successful 2xx response is treated as accepted delivery. Confirm this contract with the provider. Requests time out after 10 seconds, redirects are rejected, and a failed or missing gateway returns HTTP 503 with an honest UI message. No enquiries are stored locally, and no email delivery is simulated.

Before a public launch, replace the in-memory limiter with a shared edge/service limiter using trusted platform IP headers, and consider Turnstile/reCAPTCHA or another verified challenge. Do not trust client-supplied `x-forwarded-for` on an unprotected self-hosted deployment.

## Deployment

For Hostinger **Node.js Web App hosting**, follow [HOSTINGER.md](HOSTINGER.md). Connect `AhmadAlabbas/alabbas.sa` on branch `main`, use Node.js 22 and enable automatic deployments. Hostinger installs and builds each pushed update. A source ZIP is available as an alternative.

Import the repository into Vercel, select Next.js, use Node.js 24, and retain the default `npm run build` command. Configure the canonical origin and approved delivery gateway in project settings, then redeploy. Preview environments should have a separate approved test gateway and origin. The application does not perform deployment automatically.

Security headers include CSP, HSTS, frame protection, MIME sniffing prevention, referrer policy and permissions policy. The current CSP permits inline scripts and styles for Next.js static rendering and uses no third-party scripts. A stricter nonce-based CSP requires a deliberate rendering change. Security headers need to be revalidated when integrations are added.

## Before launch

- [x] Home, About, five solution pages, client overview and three client pages, Insights with filters and three articles, Careers, Contact and four Legal pages.
- [x] English / Arabic routes, RTL, local fonts, responsive layouts, keyboard controls, reduced motion and persistent cookie choice.
- [x] Per-page metadata, Open Graph image, hreflang, sitemap, robots and Organization schema.
- [x] Server-side contact validation and delivery adapter, security headers, tooling and repeatable smoke tests.
- [ ] Replace illustrative AUM / experience / clients / investments with verified facts, or remove the figures.
- [ ] Approve the logo rendition or replace it with the original vector master; supply the approved company story, leadership names/biographies and actual investment capabilities.
- [ ] Approve actual portfolio examples and articles. Every current case study and article is labeled illustrative or sample.
- [ ] Confirm the legal entity, CMA authorization status, permitted activities and regulatory disclosure. The site asserts no license.
- [ ] Approve Saudi PDPL privacy language, processing basis, retention, providers, transfers and rights contact; finalize all legal policies.
- [ ] Confirm office address, phone/email, map coordinates, social URLs and vacancies. No fake contact/social links or job postings are published.
- [ ] Configure and end-to-end test the approved email/CRM gateway, then add durable spam/rate-limit protection.
- [ ] Review Arabic copy with a native business/legal reviewer and test with assistive technology.
- [ ] Run final Lighthouse and security checks on the production domain after approved content and integrations are in place.

Cookie consent stores a preference in local storage only; no optional analytics or advertising trackers are installed. Optional consent currently records a choice without enabling a tracker. Footer controls reopen the banner.

See `VALIDATION.md` for the recorded current-instance validation. A successful build or draft configuration save is not a deployment or proof of fresh-task restoration.
