import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient, type Role, type SessionKind } from "@prisma/client";
import { issueSession } from "../../src/lib/portal/sessions";
import type { ownDashboard } from "../../src/lib/portal/dashboard";
type DashboardData = Awaited<ReturnType<typeof ownDashboard>>;
import {
  encrypt,
  newTotpSecret,
  privateHash,
} from "../../src/lib/portal/crypto";
import {
  sampleHoldings,
  samplePortfolioCents,
  sampleCashCents,
  sampleHistory,
  samplePerformance,
  sampleStatement,
  periods,
  statementMonths,
} from "../../src/lib/portal/dashboard-model";
const database = new URL(process.env.DATABASE_URL || "");
assert.ok(
  ["127.0.0.1", "localhost"].includes(database.hostname) &&
    database.pathname.endsWith("_test"),
  "Dashboard tests require a disposable loopback _test database.",
);
const prisma = new PrismaClient({ log: [] }),
  base = process.env.PORTAL_TEST_URL || "http://localhost:3020",
  off = process.env.PORTAL_OFF_TEST_URL || "http://localhost:3021";
const ctx = {
  networkHash: privateHash("dashboard-test-fixture"),
  userAgent: "Synthetic dashboard fixture",
};
class Browser {
  cookies = new Map<string, string>();
  cookie() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async get(path: string) {
    const r = await fetch(base + path, {
      headers: { Cookie: this.cookie() },
      redirect: "manual",
    });
    for (const header of r.headers.getSetCookie()) {
      const p = header.split(";")[0],
        i = p.indexOf("=");
      this.cookies.set(p.slice(0, i), p.slice(i + 1));
    }
    return r;
  }
  async post(data: unknown, headers: Record<string, string> = {}) {
    const csrf = await (await this.get("/api/auth")).json();
    return fetch(base + "/api/portal/notifications/read", {
      method: "POST",
      headers: {
        Cookie: this.cookie(),
        Origin: process.env.SITE_URL!,
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf.csrfToken,
        ...headers,
      },
      body: JSON.stringify(data),
    });
  }
}
beforeEach(async () => {
  await prisma.notificationRead.deleteMany();
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
after(() => prisma.$disconnect());
async function account(
  email = "dashboard@example.test",
  role: Role = "CLIENT",
  kind: SessionKind = "AUTHENTICATED",
) {
  const user = await prisma.user.create({
    data: {
      email,
      name: "Synthetic private name",
      passwordHash: "Fixture-only-no-password-login",
      role,
      emailVerifiedAt: new Date(),
      totpEnabledAt: new Date(),
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: encrypt(newTotpSecret(), `totp:${user.id}`) },
  });
  const issued = await prisma.$transaction((tx) =>
      issueSession(tx, user, kind, ctx),
    ),
    browser = new Browser();
  browser.cookies.set("__Host-alabbas-session", issued.token);
  return { user, browser, session: issued.session };
}
test("Fixed sample balances and every statement reconcile in integer SAR cents", () => {
  assert.equal(
    sampleHoldings.reduce((sum, h) => sum + h.valueCents, 0) + sampleCashCents,
    samplePortfolioCents,
  );
  assert.equal(samplePortfolioCents, 26750000);
  assert.equal(sampleHistory.at(-1)!.valueCents, samplePortfolioCents);
  for (const month of statementMonths) {
    const s = sampleStatement(month)!;
    assert.equal(
      s.holdings.reduce((sum, h) => sum + h.valueCents, 0) + s.cashCents,
      s.closingCents,
    );
    assert.ok(s.start.startsWith(month));
    assert.ok(s.end.startsWith(month));
  }
  assert.equal(sampleStatement("2026-10"), null);
});
test("Period charts use actual calendar windows, ordered dates and fictional declines as well as gains", () => {
  const counts = { "1M": 30, "3M": 92, "1Y": 365 };
  for (const period of periods) {
    const p = samplePerformance(period);
    assert.equal(p.points.length, counts[period]);
    assert.equal(p.points.at(-1)!.date, "2026-09-30");
    assert.equal(
      p.changeCents,
      p.points.at(-1)!.valueCents - p.points[0].valueCents,
    );
    assert.ok(
      p.points.some(
        (v, i) => i > 0 && v.valueCents < p.points[i - 1].valueCents,
      ),
    );
    assert.ok(
      p.points.every((v, i) => i === 0 || v.date > p.points[i - 1].date),
    );
  }
});
test("Disabled dashboard, notification and PDF routes return genuine 404s before credentials", async () => {
  for (const path of [
    "/en/portal/dashboard",
    "/ar/portal/dashboard",
    "/api/portal/dashboard",
    "/api/portal/notifications/read",
    "/api/portal/statements/2026-09?locale=ar",
  ])
    for (const method of ["GET", "POST", "HEAD"]) {
      const r = await fetch(off + path, { method, redirect: "manual" });
      assert.equal(r.status, 404, `${method} ${path}`);
      assert.equal(r.headers.get("set-cookie"), null);
      assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
    }
});
test("Anonymous and password-only sessions cannot read dashboard, download PDFs or change notifications", async () => {
  const challenge = await account(
    "challenge@example.test",
    "CLIENT",
    "CHALLENGE",
  );
  for (const browser of [new Browser(), challenge.browser]) {
    assert.equal((await browser.get("/api/portal/dashboard")).status, 401);
    assert.equal(
      (await browser.get("/api/portal/statements/2026-09")).status,
      401,
    );
    assert.equal((await browser.post({ id: "sample-welcome" })).status, 401);
  }
});
test("Pending clients see samples with actual account/KYC status and no personal identity fields", async () => {
  const a = await account(),
    r = await a.browser.get("/api/portal/dashboard"),
    data: DashboardData = await r.json();
  assert.equal(r.status, 200);
  assert.match(r.headers.get("cache-control") || "", /no-store/);
  assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
  assert.equal(data.sample, true);
  assert.equal(data.asOf, "2026-09-30");
  assert.equal(data.currency, "SAR");
  assert.deepEqual(data.account, { status: "PENDING", kycStatus: "DRAFT" });
  assert.ok(!JSON.stringify(data).includes(a.user.email));
  assert.ok(!JSON.stringify(data).includes(a.user.name));
  assert.equal(data.notifications.filter((n) => !n.sample).length, 1);
  assert.equal(await prisma.kycProfile.count(), 0);
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).status,
    "PENDING",
  );
});
test("Approved clients still receive fictional data, without an investment endpoint", async () => {
  const a = await account();
  await prisma.user.update({
    where: { id: a.user.id },
    data: { status: "APPROVED" },
  });
  const data: DashboardData = await (
    await a.browser.get("/api/portal/dashboard?period=1M")
  ).json();
  assert.equal(data.account.status, "APPROVED");
  assert.equal(data.sample, true);
  assert.equal(data.performance.points.length, 30);
  assert.equal((await a.browser.get("/api/portal/orders")).status, 404);
});
test("Strict range and statement query validation prevents account selectors or arbitrary files", async () => {
  const a = await account();
  for (const query of [
    "period=all",
    "period=1W",
    "userId=another-account",
    "period=1Y&role=ADMIN",
  ])
    assert.equal(
      (await a.browser.get(`/api/portal/dashboard?${query}`)).status,
      400,
    );
  for (const path of [
    "/api/portal/statements/2026-10",
    "/api/portal/statements/not-a-statement",
  ])
    assert.equal((await a.browser.get(path)).status, 404);
  for (const query of [
    "locale=xx",
    "userId=another-account",
    "path=private.env",
  ])
    assert.equal(
      (await a.browser.get(`/api/portal/statements/2026-09?${query}`)).status,
      400,
    );
});
test("Staff roles cannot access a client's dashboard, statements or notification actions", async () => {
  for (const role of [
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "RELATIONSHIP_MANAGER",
  ] as const) {
    const a = await account(`${role}@example.test`, role);
    assert.equal((await a.browser.get("/api/portal/dashboard")).status, 403);
    assert.equal(
      (await a.browser.get("/api/portal/statements/2026-09")).status,
      403,
    );
    assert.equal((await a.browser.post({ id: "sample-welcome" })).status, 403);
  }
});
test("Institutional and government clients are excluded from the individual dashboard", async () => {
  const a = await account();
  for (const accountType of ["INSTITUTION", "GOVERNMENT"] as const) {
    await prisma.user.update({
      where: { id: a.user.id },
      data: { accountType },
    });
    assert.equal((await a.browser.get("/api/portal/dashboard")).status, 403);
    assert.equal(
      (await a.browser.get("/api/portal/statements/2026-09")).status,
      403,
    );
  }
});
test("Revoked, expired and suspended sessions lose dashboard and statement access", async () => {
  const a = await account();
  await prisma.session.update({
    where: { id: a.session.id },
    data: { expiresAt: new Date(0) },
  });
  assert.equal((await a.browser.get("/api/portal/dashboard")).status, 401);
  const b = await account("revoked@example.test");
  await prisma.session.delete({ where: { id: b.session.id } });
  assert.equal(
    (await b.browser.get("/api/portal/statements/2026-09")).status,
    401,
  );
  const c = await account("suspended@example.test");
  await prisma.user.update({
    where: { id: c.user.id },
    data: { status: "SUSPENDED" },
  });
  assert.equal((await c.browser.get("/api/portal/dashboard")).status, 401);
  assert.equal((await c.browser.post({ id: "sample-welcome" })).status, 401);
});
test("Notification read state persists per owner and repeated marking keeps the original timestamp", async () => {
  const a = await account(),
    b = await account("second@example.test");
  assert.equal((await a.browser.post({ id: "sample-welcome" })).status, 200);
  const first = await prisma.notificationRead.findFirstOrThrow();
  assert.equal(first.userId, a.user.id);
  assert.equal((await a.browser.post({ id: "sample-welcome" })).status, 200);
  assert.equal(await prisma.notificationRead.count(), 1);
  assert.equal(
    await prisma.auditEvent.count({ where: { action: "NOTIFICATION_READ" } }),
    1,
  );
  const own: DashboardData = await (
      await a.browser.get("/api/portal/dashboard")
    ).json(),
    other: DashboardData = await (
      await b.browser.get("/api/portal/dashboard")
    ).json();
  assert.equal(
    own.notifications.find((n) => n.id === "sample-welcome")!.readAt,
    first.readAt.toISOString(),
  );
  assert.equal(
    other.notifications.find((n) => n.id === "sample-welcome")!.readAt,
    null,
  );
});
test("Concurrent marking is idempotent with one state row and audit event", async () => {
  const a = await account();
  await a.browser.get("/api/auth");
  const results = await Promise.all([
    a.browser.post({ id: "sample-welcome" }),
    a.browser.post({ id: "sample-welcome" }),
  ]);
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(await prisma.notificationRead.count(), 1);
  assert.equal(
    await prisma.auditEvent.count({ where: { action: "NOTIFICATION_READ" } }),
    1,
  );
});
test("Changed KYC status creates a new unread notification without pretending it is a sample approval", async () => {
  const a = await account();
  assert.equal((await a.browser.post({ id: "kyc-draft-0" })).status, 200);
  await prisma.kycProfile.create({
    data: {
      userId: a.user.id,
      status: "SUBMITTED",
      version: 1,
      encryptedData: "Synthetic fixture; never read by dashboard",
    },
  });
  const data: DashboardData = await (
    await a.browser.get("/api/portal/dashboard")
  ).json();
  assert.equal(data.account.kycStatus, "SUBMITTED");
  const n = data.notifications.find((n) => !n.sample);
  assert.ok(n);
  assert.equal(n.id, "kyc-submitted-1");
  assert.equal(n.readAt, null);
  assert.equal(data.account.status, "PENDING");
  assert.equal((await a.browser.post({ id: "kyc-draft-0" })).status, 404);
});
test("Notification changes reject owner injection, unknown notices, CSRF and unbounded payloads", async () => {
  const a = await account();
  assert.equal(
    (await a.browser.post({ id: "sample-welcome", userId: "other" })).status,
    400,
  );
  assert.equal((await a.browser.post({ id: "unknown" })).status, 404);
  assert.equal(
    (
      await a.browser.post(
        { id: "sample-welcome" },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await a.browser.post({ id: "sample-welcome" }, { "X-CSRF-Token": "" }))
      .status,
    403,
  );
  assert.equal(
    (
      await a.browser.post(
        { id: "sample-welcome" },
        { "Content-Type": "text/plain" },
      )
    ).status,
    415,
  );
  assert.equal((await a.browser.post({ id: "x".repeat(9000) })).status, 413);
  assert.equal(await prisma.notificationRead.count(), 0);
});
test("English and Arabic PDF downloads are private attachments with embedded fonts and no client identity", async () => {
  const a = await account();
  for (const locale of ["en", "ar"]) {
    const r = await a.browser.get(
      `/api/portal/statements/2026-09?locale=${locale}`,
    );
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), "application/pdf");
    assert.equal(
      r.headers.get("content-disposition"),
      `attachment; filename="alabbas-sample-2026-09-${locale}.pdf"`,
    );
    assert.match(r.headers.get("cache-control") || "", /no-store/);
    assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
    const pdf = Buffer.from(await r.arrayBuffer());
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf.toString("latin1").trimEnd().endsWith("%%EOF"));
    assert.match(pdf.toString("latin1"), /\/FontFile2/);
    assert.ok(!pdf.includes(Buffer.from(a.user.email)));
    assert.equal(Number(r.headers.get("content-length")), pdf.length);
  }
  assert.equal(
    await prisma.auditEvent.count({
      where: { userId: a.user.id, action: "SAMPLE_STATEMENT_GENERATED" },
    }),
    2,
  );
});
test("Statement generation is rate limited per authenticated account", async () => {
  const a = await account();
  for (let i = 0; i < 6; i++)
    assert.equal(
      (await a.browser.get("/api/portal/statements/2026-09")).status,
      200,
    );
  assert.equal(
    (await a.browser.get("/api/portal/statements/2026-09")).status,
    429,
  );
});
test("Notification changes have a database-backed rate limit even for duplicate reads", async () => {
  const a = await account();
  for (let i = 0; i < 30; i++)
    assert.equal((await a.browser.post({ id: "sample-welcome" })).status, 200);
  assert.equal((await a.browser.post({ id: "sample-welcome" })).status, 429);
});
test("Portal entry routes clients to the sample dashboard, staff to review and unauthenticated visitors to sign-in", async () => {
  const client = await account(),
    staff = await account("staff@example.test", "ADMIN");
  for (const locale of ["en", "ar"]) {
    for (const [browser, destination] of [
      [client.browser, "dashboard"],
      [staff.browser, "admin/kyc"],
    ] as const) {
      const r = await browser.get(`/${locale}/portal`);
      assert.equal(r.status, 307);
      assert.equal(
        r.headers.get("location"),
        `/${locale}/portal/${destination}`,
      );
    }
    const anonymous = await new Browser().get(`/${locale}/portal`);
    assert.equal(anonymous.status, 307);
    assert.equal(anonymous.headers.get("location"), `/${locale}/auth/sign-in`);
  }
});
test("Dashboard pages in both languages are private, noindex and use the portal CSP", async () => {
  const a = await account();
  for (const locale of ["en", "ar"]) {
    const r = await a.browser.get(`/${locale}/portal/dashboard`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
    assert.match(r.headers.get("cache-control") || "", /no-store/);
    assert.match(r.headers.get("content-security-policy") || "", /nonce-/);
    assert.match(await r.text(), new RegExp(`lang="${locale}"`));
  }
});
