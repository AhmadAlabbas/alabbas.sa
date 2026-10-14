# Deploy Alabbas on Hostinger Node.js Web App hosting

Use the GitHub repository **`AhmadAlabbas/alabbas.sa`**, deploying the **`main`** branch. Hostinger builds the source and runs the Next.js server. Updates become live after changes are committed and pushed to the connected branch and Hostinger completes a successful deployment.

Client portal phases are delivered on separate feature branches through reviewed PRs; never push portal work directly to `main`. Keep `PORTAL_ENABLED=false` on the public app during review. See [PORTAL.md](PORTAL.md) for MySQL migrations, private auth/mail configuration, protected cron and the approved portal's `build:portal` command. Public builds retain `npm run build` and require no portal credentials.

The combined real-account portal activation steps are in [PORTAL_RELEASE.md](PORTAL_RELEASE.md). Enabled deployments require **`npm run build:portal`**, private MySQL/SMTP/keys and protected cron. The public app can continue using `npm run build` while `PORTAL_ENABLED=false`; publishing code does not activate the backend.

## Connect GitHub and enable deployments

1. In hPanel, open **Websites** and add a **Node.js web app**, or open the existing destination Node.js app.
2. Choose **GitHub** as the deployment source and authorize Hostinger's GitHub integration for **`AhmadAlabbas/alabbas.sa`**. Restrict repository access to the repositories you intend to deploy.
3. Select repository **`AhmadAlabbas/alabbas.sa`**, branch **`main`**, and the repository root **`.`**.
4. Choose the **Next.js** preset, **Node.js 22**, install **`npm ci`**, build **`npm run build`**, and start **`npm start`** where these settings are exposed. Keep the preset's output / entry-file defaults.
5. Set **`SITE_URL=https://alabbas.sa`** in the app environment settings before building. Configure approved enquiry-delivery settings separately if available; do not commit credentials to GitHub.
6. Enable **automatic deployments** for pushes to **`main`** in the app's deployment settings. Trigger the initial deployment and check the build / startup logs. If your panel does not expose an automatic deployment option, verify its supported trigger with Hostinger rather than assuming pushes deploy automatically.
7. Verify the deployed app using the checks below, attach **`alabbas.sa`**, follow the app's specific DNS instructions and enable HTTPS.

Hostinger's GitHub integration authorization and domain connection must be performed in your hPanel; this chat has no Hostinger account connector. GitHub publication alone does not establish that Hostinger is connected or the website is live.

### Future updates from this workspace

Use the existing repository checkout, make the requested change, run the relevant checks, then commit and push the finished change to `main` when authorized for a live update. Hostinger's connected deployment should build that commit. Verify its deployment result and the affected public behavior. Never force-push, reset unrelated changes or include secret files to make a deployment succeed.

The initial site was created in an empty repository. Future pushes must inspect the remote first and preserve any newer commits. Work on another branch is deployed only when merged or otherwise pushed to the branch Hostinger is watching. The automatic deployment setting lives in Hostinger, not in this site's client code; no Hostinger token is required in this repository for the managed GitHub integration.

## Alternative: ZIP upload

The prepared source archive is `alabbas-hostinger-node.zip`. It is for **Node.js Web App hosting**, not a static-site upload to `public_html`. It contains the application source, public assets and a dependency lockfile. Hostinger must install dependencies and build the application. Local `node_modules`, `.next`, Git metadata and live environment files are excluded. ZIP upload is an alternative to the GitHub workflow and does not itself configure automatic updates.

### Upload and build

1. Open Hostinger **hPanel → Websites** and add a **Node.js web app**. If you already created the destination Node.js app, open its deployment settings instead. Preserve any existing live website until the new app has been verified.
2. Choose the file-upload / ZIP deployment option and upload `alabbas-hostinger-node.zip`. The ZIP has `package.json` directly at its root; use `.` as the project root if a root directory is requested.
3. Choose the **Next.js** framework preset and **Node.js 22**. The project supports Node 22 and 24; the supplied Hostinger build-settings screen selects 22.x.
4. Use the following settings where Hostinger exposes them. Keep the Next.js preset's output-directory / entry-file defaults. Do not choose a static HTML preset.

| Setting                     | Value                                     |
| --------------------------- | ----------------------------------------- |
| Framework                   | Next.js                                   |
| Node.js                     | 22.x                                      |
| Root directory              | `.` / archive root                        |
| Install command             | `npm ci`                                  |
| Build command               | `npm run build`                           |
| Start command, if requested | `npm start`                               |
| `SITE_URL`                  | `https://alabbas.sa` for the final domain |

`npm start` listens on all interfaces and Next.js uses the hosting platform's `PORT` variable. Let Hostinger manage that port; do not manually assign port 80 or 443. Installation needs development dependencies because TypeScript and Tailwind are used at build time; do not use `npm ci --omit=dev` before building.

5. Add `SITE_URL` to the app's environment settings **before building**. Canonical URLs, hreflang and the sitemap are generated at build time. If you first deploy to a temporary domain, set `SITE_URL` to its actual HTTPS origin and rebuild when switching to `https://alabbas.sa`.
6. Deploy and inspect the build / startup logs. A passing build is not sufficient by itself: open both `/en` and `/ar` on the deployed app and perform the checks below.

Labels in hPanel may differ; use the Next.js / Node.js app workflow and the configuration values above. The supplied build-settings PDF confirms Next.js, main, Node.js 22.x, root ./ and the default Next.js build settings. The live panel was not accessed from this chat.

## Build compatibility

`npm run build` now uses **`next build --webpack`**. The supplied Hostinger log shows a Turbopack panic while evaluating PostCSS for `src/app/globals.css`: its Node worker exits before the build connects to it. The sitemap route appears in the error because the failed CSS evaluation prevents writing application endpoints; the log does not identify a sitemap-content defect.

Keep Hostinger's build command as **`npm run build`** so it uses the repository's tested Webpack production build. If a custom command was changed to `next build`, replace it with `npm run build`. Development can continue using the existing `npm run dev` command.

The installation's five high-severity audit notices are the documented development-tool dependency chain, separate from this fatal build error. Do not run `npm audit fix --force` to repair the bundler crash; it proposes an incompatible framework-tooling downgrade.

## Domain and HTTPS

After the deployed app works, attach `alabbas.sa` in the app's domain settings. Follow the DNS records Hostinger shows for **that specific app**; no destination IP address is assumed in these instructions. If DNS is managed elsewhere, change only the records needed to route the website. Preserve mail / verification records such as MX, SPF, DKIM and DMARC.

Enable the platform's SSL certificate and confirm HTTPS works before considering the launch complete. If `www.alabbas.sa` is used, connect it and choose one canonical hostname; configure the alternate hostname to redirect to the canonical origin. Rebuild after a `SITE_URL` change.

## Enquiry delivery

The contact form's server-side validation works, but real delivery remains unconfigured. It will display an unavailable-delivery message instead of pretending an enquiry was sent.

Configure the approved provider using Hostinger's private app environment settings:

- `CONTACT_WEBHOOK_URL`: approved **HTTPS** endpoint accepting POST JSON.
- `CONTACT_WEBHOOK_TOKEN`: optional server-only bearer credential.

Hostinger may detect all three keys in `.env.example` and mark their values required. Only `SITE_URL` is needed to display the site. Until a real gateway is configured, remove the `CONTACT_WEBHOOK_URL` and `CONTACT_WEBHOOK_TOKEN` entries from Hostinger’s environment-variable editor. Do not enter dummy endpoints or credentials. The contact form will continue to report unavailable delivery.

The portal adds more names to `.env.example`; leave the feature false and omit the database, encryption, cron and SMTP entries from the editor until the approved portal is configured. Empty placeholder secrets are not required for a disabled public deployment.

Never put credentials into the ZIP, client code or chat. See `README.md` for the gateway payload and response contract. Confirm provider delivery end to end with a controlled test enquiry. Add durable rate limiting using the hosting provider's trusted IP forwarding behavior before accepting public enquiries.

## Verify the deployed site

- `/` redirects to `/en`; `/en` and `/ar` render correctly.
- Fonts, architectural imagery and the angular logo rendition load without missing assets.
- Arabic pages use RTL; changing language retains the page.
- Navigation, insight filters and cookie controls work on mobile and desktop.
- `/sitemap.xml` contains the actual canonical domain and both languages; `/robots.txt` loads.
- `/en/contact?type=investor-relations` selects Investor Relations, rejects invalid entries and reports the delivery outcome accurately.
- An unknown page returns 404; no build / runtime errors appear in Hostinger's logs.
- HTTPS works, and the application's security headers remain present through the hosting proxy.

## Current publication status

The site contains visibly labeled sample figures, leadership placeholders, illustrative investment scenarios, sample articles and draft legal policies. Office details and social channels await confirmation. CMA authorization is not asserted. The logo file is a raster rendition of the supplied reference, not the original vector master. Obtain the business / legal approvals listed in `README.md` before treating the site as an official completed launch.

The ZIP has been prepared and checked locally. The GitHub source is prepared for the connected-branch workflow described above. No Hostinger account connection, upload, domain change or public deployment has been performed from this chat. Existing local smoke tests and browser validation are recorded in `VALIDATION.md`; they do not establish readiness of the hosted instance.
