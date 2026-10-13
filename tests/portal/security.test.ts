import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  encrypt,
  decrypt,
  tokenHash,
  makeTotp,
  hashPassword,
  verifyPassword,
} from "../../src/lib/portal/crypto";
import { requireRole } from "../../src/lib/portal/sessions";
import { rateLimit } from "../../src/lib/portal/limits";
import { MockNafathProvider } from "../../src/lib/portal/providers/nafath";
import { portalEnabled } from "../../src/lib/portal/feature";
import { portalConfig } from "../../src/lib/portal/config";
const database = new URL(process.env.DATABASE_URL || "");
assert.ok(
  ["127.0.0.1", "localhost"].includes(database.hostname) &&
    database.pathname.endsWith("_test"),
  "Portal tests require a disposable loopback database ending in _test.",
);
const prisma = new PrismaClient({ log: [] });
const base = process.env.PORTAL_TEST_URL || "http://localhost:3020";
const off = process.env.PORTAL_OFF_TEST_URL || "http://localhost:3021";
const origin = process.env.SITE_URL!;
const password = "Test-password-phase1-972!";
class Browser {
  cookies = new Map<string, string>();
  async get(path: string) {
    const r = await fetch(base + path, { headers: { Cookie: this.cookie() } });
    this.capture(r);
    return r;
  }
  cookie() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  capture(r: Response) {
    for (const line of r.headers.getSetCookie()) {
      const [pair] = line.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  async post(
    action: string,
    data: unknown,
    extra: Record<string, string> = {},
  ) {
    const csrf = await this.get("/api/auth");
    const result = await csrf.json();
    const r = await fetch(`${base}/api/auth/${action}`, {
      method: "POST",
      headers: {
        Cookie: this.cookie(),
        Origin: origin,
        "Content-Type": "application/json",
        "X-CSRF-Token": result.csrfToken,
        ...extra,
      },
      body: JSON.stringify(data),
    });
    this.capture(r);
    return r;
  }
}
beforeEach(async () => {
  await prisma.kycConsent.deleteMany();
  await prisma.kycReview.deleteMany();
  await prisma.kycEvent.deleteMany();
  await prisma.kycSubmission.deleteMany();
  await prisma.kycProfile.deleteMany();
  await prisma.dataRequest.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.actionToken.deleteMany();
  await prisma.emailJob.deleteMany();
  await prisma.rateLimit.deleteMany();
  await prisma.user.deleteMany();
});
after(async () => {
  await prisma.$disconnect();
});
async function account(email = "client@example.test") {
  const browser = new Browser();
  const r = await browser.post("sign-up", {
    name: "Security Test User",
    email,
    password,
    locale: "en",
    consent: true,
  });
  assert.equal(r.status, 200);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { browser, user };
}
async function emailToken() {
  const job = await prisma.emailJob.findFirstOrThrow({
    orderBy: { createdAt: "desc" },
  });
  const payload = JSON.parse(decrypt(job.payload, `email:${job.id}`));
  const match = payload.text.match(/#token=([A-Za-z0-9_-]+)/);
  assert.ok(match);
  return { token: match[1] as string, job, payload };
}
async function verified(email = "client@example.test") {
  const a = await account(email);
  const { token } = await emailToken();
  assert.equal((await a.browser.post("verify-email", { token })).status, 200);
  return a;
}
async function full(email = "client@example.test") {
  const a = await verified(email);
  assert.equal(
    (await a.browser.post("sign-in", { email, password })).status,
    200,
  );
  const setup = await (await a.browser.get("/api/portal/totp-setup")).json();
  assert.equal(setup.enrollment, true);
  assert.match(setup.qrCode, /^data:image\/png/);
  const code = makeTotp(setup.secret, email).generate();
  assert.equal((await a.browser.post("confirm-totp", { code })).status, 200);
  return { ...a, secret: setup.secret as string };
}
async function freshCode(userId: string, secret: string, email: string) {
  /* Fixture-only new-window simulation. Replay tests never reset this record. */ await prisma.user.update(
    { where: { id: userId }, data: { totpLastStep: -1 } },
  );
  return makeTotp(secret, email).generate();
}

test("Default-disabled portal returns 404 for all methods/routes without creating cookies or requiring credentials", async () => {
  for (const path of [
    "/en/auth",
    "/ar/auth/sign-up",
    "/en/auth/sign-in",
    "/ar/auth/two-factor",
    "/en/portal",
    "/ar/portal/security",
    "/portal",
    "/auth",
    "/api/auth",
    "/api/auth/sign-up",
    "/api/portal/security",
    "/api/portal/cron",
  ])
    for (const method of ["GET", "POST", "HEAD"]) {
      const r = await fetch(off + path, { method, redirect: "manual" });
      assert.equal(r.status, 404, `${method} ${path}`);
      assert.equal(r.headers.get("set-cookie"), null);
      assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
    }
  assert.deepEqual(await (await fetch(off + "/api/client-access")).json(), {
    enabled: false,
  });
});
test("Auth pages are localized, noindex, no-store and have nonce-based CSP without inline script permission", async () => {
  for (const language of ["en", "ar"]) {
    const r = await fetch(`${base}/${language}/auth/sign-in`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
    assert.match(r.headers.get("cache-control") || "", /no-store/);
    const csp = r.headers.get("content-security-policy") || "";
    const scripts =
      csp.split(";").find((x) => x.trim().startsWith("script-src")) || "";
    assert.match(scripts, /nonce-/);
    assert.ok(!scripts.includes("unsafe-inline"));
    const html = await r.text();
    assert.match(html, new RegExp(`lang="${language}"`));
    assert.match(html, /noindex/);
    assert.match(html, /nonce="[^"]+"/);
  }
});
test("Missing CSRF, cross-origin and non-JSON mutations are rejected before account changes", async () => {
  const b = new Browser();
  const input = {
    name: "Test User",
    email: "test@example.test",
    password,
    locale: "en",
    consent: true,
  };
  assert.equal(
    (
      await fetch(base + "/api/auth/sign-up", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    ).status,
    403,
  );
  assert.equal(
    (await b.post("sign-up", input, { Origin: "https://evil.example" })).status,
    403,
  );
  assert.equal(
    (await b.post("sign-up", input, { "Content-Type": "text/plain" })).status,
    415,
  );
  assert.equal(await prisma.user.count(), 0);
});
test("Rejects role/account-type injection, missing consent, weak passwords and oversized requests", async () => {
  const b = new Browser();
  const input = {
    name: "Test User",
    email: "test@example.test",
    password,
    locale: "en",
    consent: true,
  };
  for (const extra of [
    { role: "ADMIN" },
    { accountType: "GOVERNMENT" },
    { consent: false },
    { password: "aaaaaaaaaaaa" },
    { password: "short" },
  ])
    assert.equal((await b.post("sign-up", { ...input, ...extra })).status, 400);
  assert.equal(
    (await b.post("sign-up", { ...input, name: "x".repeat(10000) })).status,
    413,
  );
  assert.equal(await prisma.user.count(), 0);
});
test("Registration stores Argon2id hashes, individual/client/pending defaults and encrypted verification mail", async () => {
  const { user } = await account();
  assert.match(user.passwordHash, /^\$argon2id\$/);
  assert.notEqual(user.passwordHash, password);
  assert.equal(user.role, "CLIENT");
  assert.equal(user.accountType, "INDIVIDUAL");
  assert.equal(user.status, "PENDING");
  const { token, job } = await emailToken();
  assert.ok(!job.payload.includes(token));
  const record = await prisma.actionToken.findUniqueOrThrow({
    where: { tokenHash: tokenHash(token) },
  });
  assert.equal(record.purpose, "VERIFY_EMAIL");
  assert.equal(user.emailVerifiedAt, null);
  assert.equal(
    await prisma.auditEvent.count({
      where: { userId: user.id, action: "PRIVACY_ACKNOWLEDGED_V1" },
    }),
    1,
  );
});
test("Existing-email registration returns the same response without creating a duplicate account", async () => {
  const { browser } = await account();
  const r = await browser.post("sign-up", {
    name: "Another",
    email: "client@example.test",
    password,
    locale: "ar",
    consent: true,
  });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).message, "CHECK_EMAIL");
  assert.equal(await prisma.user.count(), 1);
});
test("Verification links are single use; unverified accounts cannot start an MFA session", async () => {
  const a = await account();
  assert.equal(
    (await a.browser.post("sign-in", { email: a.user.email, password })).status,
    401,
  );
  const { token } = await emailToken();
  assert.equal((await a.browser.post("verify-email", { token })).status, 200);
  assert.equal((await a.browser.post("verify-email", { token })).status, 400);
  assert.equal(
    (await a.browser.post("verify-email", { token: "x".repeat(43) })).status,
    400,
  );
});
test("Expired and wrong-purpose tokens are rejected", async () => {
  const a = await account();
  const { token } = await emailToken();
  await prisma.actionToken.updateMany({
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal((await a.browser.post("verify-email", { token })).status, 400);
  assert.equal(
    (await a.browser.post("reset-password", { token, password })).status,
    400,
  );
});
test("Password-only sessions cannot access portal data or invoke session controls", async () => {
  const a = await verified();
  const r = await a.browser.post("sign-in", { email: a.user.email, password });
  assert.equal(r.status, 200);
  const cookie =
    r.headers
      .getSetCookie()
      .find((c) => c.startsWith("__Host-alabbas-session=")) || "";
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=strict/i);
  assert.match(cookie, /Path=\//);
  assert.equal((await a.browser.get("/api/portal/security")).status, 401);
  assert.equal((await a.browser.post("revoke-others", {})).status, 401);
  const protectedPage = await fetch(base + "/en/portal/security", {
    headers: { Cookie: a.browser.cookie() },
    redirect: "manual",
  });
  assert.equal(protectedPage.status, 307);
});
test("Mandatory TOTP enrollment rotates the session; encrypted secret and bearer hashes are not exposed", async () => {
  const a = await full();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: a.user.id },
  });
  assert.ok(user.totpEnabledAt);
  assert.ok(user.totpSecret && !user.totpSecret.includes(a.secret));
  const session = await prisma.session.findFirstOrThrow({
    where: { userId: user.id },
  });
  assert.equal(session.kind, "AUTHENTICATED");
  assert.notEqual(
    session.tokenHash,
    a.browser.cookies.get("__Host-alabbas-session"),
  );
  const r = await a.browser.get("/api/portal/security");
  const text = await r.text();
  assert.equal(r.status, 200);
  for (const field of ["passwordHash", "totpSecret", "tokenHash"])
    assert.ok(!text.includes(field));
  assert.equal((await a.browser.get("/api/portal/totp-setup")).status, 401);
});
test("Wrong TOTP does not authenticate and is audited", async () => {
  const a = await verified();
  await a.browser.post("sign-in", { email: a.user.email, password });
  const setup = await (await a.browser.get("/api/portal/totp-setup")).json();
  const totp = makeTotp(setup.secret, a.user.email);
  let invalidCode = "000000";
  while (totp.validate({ token: invalidCode, window: 1 }) !== null)
    invalidCode = String(Number(invalidCode) + 1).padStart(6, "0");
  assert.equal(
    (await a.browser.post("confirm-totp", { code: invalidCode })).status,
    400,
  );
  assert.equal((await a.browser.get("/api/portal/security")).status, 401);
  assert.equal(
    await prisma.auditEvent.count({ where: { action: "TOTP_FAILED" } }),
    1,
  );
});
test("A TOTP code cannot be replayed on a later challenge", async () => {
  const a = await full();
  const code = makeTotp(a.secret, a.user.email).generate();
  await a.browser.post("sign-out", {});
  await a.browser.post("sign-in", { email: a.user.email, password });
  assert.equal((await a.browser.post("confirm-totp", { code })).status, 400);
});
test("Parallel uses of one MFA challenge can create only one authenticated session", async () => {
  const a = await verified();
  await a.browser.post("sign-in", { email: a.user.email, password });
  const setup = await (await a.browser.get("/api/portal/totp-setup")).json();
  const csrf = await (await a.browser.get("/api/auth")).json();
  const cookie = a.browser.cookie();
  const code = makeTotp(setup.secret, a.user.email).generate();
  const attempts = await Promise.all(
    [1, 2].map(() =>
      fetch(base + "/api/auth/confirm-totp", {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: cookie,
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf.csrfToken,
        },
        body: JSON.stringify({ code }),
      }),
    ),
  );
  assert.equal(attempts.filter((r) => r.status === 200).length, 1);
  assert.equal(
    await prisma.session.count({ where: { kind: "AUTHENTICATED" } }),
    1,
  );
});
test("Challenge expiry, idle timeout and absolute expiry deny access", async () => {
  const a = await verified();
  await a.browser.post("sign-in", { email: a.user.email, password });
  await prisma.session.updateMany({
    data: { expiresAt: new Date(Date.now() - 1) },
  });
  assert.equal((await a.browser.get("/api/portal/totp-setup")).status, 401);
  const fullUser = await full("other@example.test");
  await prisma.session.updateMany({
    where: { userId: fullUser.user.id },
    data: { lastSeenAt: new Date(Date.now() - 16 * 60 * 1000) },
  });
  assert.equal(
    (await fullUser.browser.get("/api/portal/security")).status,
    401,
  );
  await prisma.session.updateMany({
    where: { userId: fullUser.user.id },
    data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() - 1) },
  });
  assert.equal(
    (await fullUser.browser.get("/api/portal/security")).status,
    401,
  );
});
test("Suspension and password-version changes invalidate sessions immediately", async () => {
  const a = await full();
  await prisma.user.update({
    where: { id: a.user.id },
    data: { status: "SUSPENDED" },
  });
  assert.equal((await a.browser.get("/api/portal/security")).status, 401);
  await prisma.user.update({
    where: { id: a.user.id },
    data: { status: "PENDING", passwordVersion: { increment: 1 } },
  });
  assert.equal((await a.browser.get("/api/portal/security")).status, 401);
});
test("Session revocation is scoped to the authenticated owner", async () => {
  const a = await full();
  const b = await full("other@example.test");
  const other = await prisma.session.findFirstOrThrow({
    where: { userId: b.user.id, kind: "AUTHENTICATED" },
  });
  assert.equal(
    (await a.browser.post("revoke-session", { sessionId: other.id })).status,
    404,
  );
  assert.equal((await b.browser.get("/api/portal/security")).status, 200);
  await a.browser.post("sign-out", {});
  assert.equal((await a.browser.get("/api/portal/security")).status, 401);
});
test("Revoke-others keeps the current session and invalidates another session", async () => {
  const a = await full();
  const second = new Browser();
  await second.post("sign-in", { email: a.user.email, password });
  const code = await freshCode(a.user.id, a.secret, a.user.email);
  await second.post("confirm-totp", { code });
  assert.equal((await a.browser.post("revoke-others", {})).status, 200);
  assert.equal((await a.browser.get("/api/portal/security")).status, 200);
  assert.equal((await second.get("/api/portal/security")).status, 401);
});
test("Password resets invalidate all sessions and tokens without disabling TOTP", async () => {
  const a = await full();
  await a.browser.post("forgot-password", {
    email: a.user.email,
    locale: "en",
  });
  const { token } = await emailToken();
  const newPassword = "New-test-passphrase-845!";
  assert.equal(
    (await a.browser.post("reset-password", { token, password: newPassword }))
      .status,
    200,
  );
  assert.equal((await a.browser.get("/api/portal/security")).status, 401);
  assert.equal(
    (await a.browser.post("reset-password", { token, password })).status,
    400,
  );
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: a.user.id },
  });
  assert.ok(user.totpEnabledAt);
  assert.equal(
    (await a.browser.post("sign-in", { email: a.user.email, password })).status,
    401,
  );
  assert.equal(
    (
      await a.browser.post("sign-in", {
        email: a.user.email,
        password: newPassword,
      })
    ).status,
    200,
  );
  assert.equal((await a.browser.get("/api/portal/security")).status, 401);
});
test("Forgot-password responses do not disclose account existence", async () => {
  const b = new Browser();
  assert.equal(
    (
      await b.post("forgot-password", {
        email: "absent@example.test",
        locale: "ar",
      })
    ).status,
    200,
  );
  assert.equal(await prisma.emailJob.count(), 0);
});
test("Password change and data-rights requests require step-up authentication", async () => {
  const a = await full();
  assert.equal(
    (
      await a.browser.post("change-password", {
        currentPassword: password,
        password: "Another-strong-password-741!",
        code: "000000",
      })
    ).status,
    400,
  );
  assert.equal(await prisma.dataRequest.count(), 0);
  const code = await freshCode(a.user.id, a.secret, a.user.email);
  assert.equal(
    (
      await a.browser.post("data-request", {
        kind: "EXPORT",
        currentPassword: password,
        code,
      })
    ).status,
    200,
  );
  const record = await prisma.dataRequest.findFirstOrThrow();
  assert.equal(record.userId, a.user.id);
  assert.equal(record.status, "PENDING");
  assert.equal(
    await prisma.auditEvent.count({ where: { action: "EXPORT_REQUESTED" } }),
    1,
  );
});
test("Password change signs out all sessions and preserves second-factor protection", async () => {
  const a = await full();
  const code = await freshCode(a.user.id, a.secret, a.user.email);
  assert.equal(
    (
      await a.browser.post("change-password", {
        currentPassword: password,
        password: "Changed-test-passphrase-618!",
        code,
      })
    ).status,
    200,
  );
  assert.equal(await prisma.session.count(), 0);
  assert.ok(
    (await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } }))
      .totpEnabledAt,
  );
});
test("Shared database rate limits enforce the maximum under concurrency", async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, () =>
      rateLimit("concurrent-test", "same-subject", 4, 60 * 1000),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 4);
  assert.equal(results.filter((r) => r.status === "rejected").length, 8);
  for (const result of results)
    if (result.status === "rejected") assert.equal(result.reason.status, 429);
});
test("Only the exact explicit true value enables the portal", () => {
  const saved = process.env.PORTAL_ENABLED;
  try {
    for (const value of [undefined, "", "false", "TRUE", "1"] as const) {
      if (value === undefined) delete process.env.PORTAL_ENABLED;
      else process.env.PORTAL_ENABLED = value;
      assert.equal(portalEnabled(), false);
    }
    process.env.PORTAL_ENABLED = "true";
    assert.equal(portalEnabled(), true);
  } finally {
    if (saved === undefined) delete process.env.PORTAL_ENABLED;
    else process.env.PORTAL_ENABLED = saved;
  }
});
test("Remote database configuration fails closed without verified TLS", () => {
  const saved = process.env.DATABASE_URL;
  try {
    for (const url of [
      "mysql://user:placeholder@remote.example.test/db",
      "mysql://user:placeholder@remote.example.test/db?sslaccept=accept_invalid_certs&sslcert=ca.pem",
      "mysql://user:placeholder@remote.example.test/db?sslaccept=strict",
    ]) {
      process.env.DATABASE_URL = url;
      assert.throws(() => portalConfig(), /configuration is incomplete/);
    }
    process.env.DATABASE_URL =
      "mysql://user:placeholder@remote.example.test/db?sslaccept=strict&sslcert=ca.pem";
    assert.equal(portalConfig().DATABASE_URL, process.env.DATABASE_URL);
  } finally {
    if (saved === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = saved;
  }
});
test("Portal configuration requires an HTTPS origin and TLS mail port", () => {
  const site = process.env.SITE_URL;
  const port = process.env.SMTP_PORT;
  try {
    for (const value of [
      "http://alabbas.sa",
      "https://alabbas.sa/other",
      "https://alabbas.sa?bad=true",
    ]) {
      process.env.SITE_URL = value;
      assert.throws(() => portalConfig());
    }
    process.env.SITE_URL = site;
    process.env.SMTP_PORT = "25";
    assert.throws(() => portalConfig());
  } finally {
    if (site === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = site;
    if (port === undefined) delete process.env.SMTP_PORT;
    else process.env.SMTP_PORT = port;
  }
});
test("Concurrent password sign-ins never replace an enrolled second factor", async () => {
  const a = await full();
  const before = await prisma.user.findUniqueOrThrow({
    where: { id: a.user.id },
  });
  const attempts = await Promise.all(
    Array.from({ length: 4 }, () =>
      new Browser().post("sign-in", { email: a.user.email, password }),
    ),
  );
  assert.ok(attempts.some((r) => r.status === 200));
  const after = await prisma.user.findUniqueOrThrow({
    where: { id: a.user.id },
  });
  assert.equal(after.totpSecret, before.totpSecret);
  assert.equal(after.totpEnabledAt?.getTime(), before.totpEnabledAt?.getTime());
  assert.equal(after.totpLastStep, before.totpLastStep);
});
test("Login failures are rate limited per account", async () => {
  const a = await verified();
  for (let i = 0; i < 8; i++)
    assert.equal(
      (
        await a.browser.post("sign-in", {
          email: a.user.email,
          password: "incorrect",
        })
      ).status,
      401,
    );
  assert.equal(
    (await a.browser.post("sign-in", { email: a.user.email, password })).status,
    429,
  );
});
test("TOTP brute-force attempts are rate limited before authentication", async () => {
  const a = await verified();
  await a.browser.post("sign-in", { email: a.user.email, password });
  const setup = await (await a.browser.get("/api/portal/totp-setup")).json();
  const totp = makeTotp(setup.secret, a.user.email);
  let invalidCode = "000000";
  while (totp.validate({ token: invalidCode, window: 1 }) !== null)
    invalidCode = String(Number(invalidCode) + 1).padStart(6, "0");
  for (let i = 0; i < 6; i++)
    assert.equal(
      (await a.browser.post("confirm-totp", { code: invalidCode })).status,
      400,
    );
  assert.equal(
    (await a.browser.post("confirm-totp", { code: totp.generate() })).status,
    429,
  );
  assert.equal((await a.browser.get("/api/portal/security")).status, 401);
  assert.equal(
    await prisma.auditEvent.count({ where: { action: "TOTP_FAILED" } }),
    6,
  );
});
test("Role checks do not promote clients into administrative roles", () => {
  assert.throws(() => requireRole("CLIENT", ["ADMIN", "COMPLIANCE_OFFICER"]));
  assert.doesNotThrow(() =>
    requireRole("COMPLIANCE_OFFICER", ["ADMIN", "COMPLIANCE_OFFICER"]),
  );
  assert.throws(() => requireRole("RELATIONSHIP_MANAGER", ["ADMIN"]));
});
test("Banking and order endpoints remain unavailable even after MFA", async () => {
  const a = await full();
  for (const action of ["bank-connections", "orders", "invest", "admin"])
    assert.equal((await a.browser.get(`/api/portal/${action}`)).status, 404);
});
test("Cron requires a bearer secret and purges expired records without a worker", async () => {
  assert.equal(
    (await fetch(base + "/api/portal/cron", { method: "POST" })).status,
    403,
  );
  await prisma.rateLimit.create({
    data: { id: "0".repeat(64), expiresAt: new Date(Date.now() - 1000) },
  });
  const r = await fetch(base + "/api/portal/cron", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PORTAL_CRON_SECRET}` },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { sent: 0, failed: 0 });
  assert.equal(await prisma.rateLimit.count(), 0);
});
test("Encryption rejects tampering and account-context swaps; passwords verify securely", async () => {
  const value = encrypt("sensitive-test-value", "account-a");
  assert.equal(decrypt(value, "account-a"), "sensitive-test-value");
  assert.throws(() => decrypt(value, "account-b"));
  assert.throws(() => decrypt(value.slice(0, -4) + "AAAA", "account-a"));
  const encoded = await hashPassword(password);
  assert.equal(await verifyPassword(encoded, password), true);
  assert.equal(await verifyPassword(encoded, "wrong"), false);
});
test("Mock Nafath never authenticates or claims verified identity", async () => {
  const provider = new MockNafathProvider();
  const result = await provider.start("fixture");
  assert.equal(result.status, "PENDING");
  assert.equal(await provider.status(result.requestId), "PENDING");
});
