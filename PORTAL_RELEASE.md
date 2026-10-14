# Combined portal release — 14 October 2026

The owner requested real account signup/KYC with mock financial data on alabbas.sa. This integration incorporates Phases 1–4 into current main, preserving the existing browser-only demo, high-resolution logo, public site and footer/legal/CMA wording. It supersedes stopping for per-phase review for this requested release. It does not assert regulatory approval or enable investing/money movement.

GitHub publication deploys code; it does not configure Hostinger's private backend. This chat has GitHub access and no Hostinger account connector or production database/mail credentials. The default `PORTAL_ENABLED=false` remains unchanged. Configure the following in **Hostinger hPanel**, not the Codex cloud editor. Never paste secrets into chat or commit them.

## Activate the backend in Hostinger

1. Open the existing alabbas.sa **Node.js app**, repository `AhmadAlabbas/alabbas.sa`, branch **main**, root `.`, Node **22**. Preserve domain, HTTPS and existing public configuration.
2. Create a dedicated MySQL database/user, or identify the existing portal database. Back it up before migration. Use the actual host, port and database shown by Hostinger; URL-encode special characters in username/password. Loopback template: `mysql://USER:PASSWORD@127.0.0.1:3306/DATABASE`. This is not an assumed hosting address. Remote MySQL needs the authentic provider CA at a private accessible path and URL options `sslaccept=strict&sslcert=ABSOLUTE_CA_PATH`; certificate verification must stay enabled.
3. Provision an authenticated SMTP sender with its actual host, user/password, authorized email address and port **465 or 587**. Verify domain authentication and outbound SMTP connectivity.
4. Enter the following private app variables:

| Name                       | Value                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `SITE_URL`                 | `https://alabbas.sa`                                                                            |
| `PORTAL_ENABLED`           | `true` for the requested manual test deployment                                                 |
| `DATABASE_URL`             | Dedicated MySQL connection URL above                                                            |
| `PORTAL_ENCRYPTION_KEY`    | New 32-byte base64 secret; generate privately with `openssl rand -base64 32`                    |
| `PORTAL_CRON_SECRET`       | Different random secret, at least 32 characters; generate privately with `openssl rand -hex 32` |
| `SMTP_HOST`                | Actual SMTP provider host                                                                       |
| `SMTP_PORT`                | `465` or `587`                                                                                  |
| `SMTP_USER`                | Actual SMTP user                                                                                |
| `SMTP_PASSWORD`            | Actual SMTP password                                                                            |
| `SMTP_FROM`                | Authorized sender email address                                                                 |
| `PORTAL_TRUSTED_IP_HEADER` | Leave empty unless Hostinger confirms an overwritten trusted proxy header                       |

Keep the encryption key stable once records exist; replacing it makes encrypted records unreadable. Never use `NEXT_PUBLIC_` for these values or enter dummy production credentials.

5. Change build command to **`npm run build:portal`**, keep install **`npm ci`** and start **`npm start`**, then redeploy reviewed main. This validates configuration, runs all six migrations with `prisma migrate deploy`, and builds with Webpack. The migration user needs schema privileges; separate/restrict runtime privileges where supported. Do not use reset, `db push` or `migrate dev` on the hosted database. Configuration/migration errors must stop deployment.
6. Configure **cron every minute** using the existing `npm run portal:cron` script or an approved scheduler's protected POST to `/api/portal/cron`. It requires private `SITE_URL`, `PORTAL_ENABLED` and `PORTAL_CRON_SECRET`; cron does not automatically inherit the web app's environment settings. A private permission-restricted environment file or secure scheduler headers are required. Never put the secret in a URL or logged command. See [PORTAL.md](PORTAL.md). **Without cron, signup queues verification email but the recipient cannot verify.** Maintenance also retries failed bank revocations.
7. Inspect build/startup logs, then check `https://alabbas.sa/api/client-access` returns `{"enabled":true}`. If setup fails, restore `PORTAL_ENABLED=false` and the public build command rather than exposing incomplete configuration.

## Manual checks

English: `/en/auth/sign-up`, `/en/auth/sign-in`, `/en/portal/dashboard`, `/en/portal/kyc`, `/en/portal/banks`, `/en/portal/security` and `/en/portal/admin/kyc`. Replace `/en` with `/ar` for Arabic.

Use an email you control, open the verification email, sign in, scan the enrollment QR code in your authenticator and enter its actual TOTP. **123456 belongs only to the old independent demo**, not real authentication. Clients enter the dashboard; staff enter the compliance queue.

Use fictional identity/funding details for KYC exercises. Submit, inspect pending status and have a staff tester approve/reject/request changes. Balances, holdings, performance, PDFs and Sample Bank A/B remain fictional regardless of KYC approval; no real bank/payment is connected. Check scopes, transactions, disconnect and new consent on reconnect, password reset, sessions, mobile/RTL layouts and PDF downloads.

For staff workflows, create/verify/enroll MFA for a separate tester, then run this operator-only command in the deployed app directory with private environment loaded:

```sh
npm run portal:set-role -- TESTER_EMAIL ADMIN
```

It accepts `COMPLIANCE_OFFICER` and `RELATIONSHIP_MANAGER` too. Existing sessions are revoked; sign in again. This needs supported Hostinger terminal/SSH access or an approved operator procedure; it is not a public role-promotion API.

The original browser-only demo remains at `/en/demo/portal` and `/ar/demo/portal`. Formal real-client enablement still requires the legal, PDPL, operational, security and licensed-provider approvals listed in the phase documents. Existing regulatory copy remains untouched.
