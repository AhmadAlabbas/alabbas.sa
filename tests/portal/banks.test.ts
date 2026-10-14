import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient, type Role, type SessionKind } from "@prisma/client";
import { issueSession } from "../../src/lib/portal/sessions";
import { privateHash, decrypt } from "../../src/lib/portal/crypto";
import {
  connectBank,
  disconnectBank,
  bankAccounts,
  retryBankRevocations,
} from "../../src/lib/portal/banks";
import { MockProvider } from "../../src/lib/portal/providers/mock-bank";
import type { BankConnectionProvider } from "../../src/lib/portal/providers/bank";
import { bankConsentVersion, bankConsentText } from "../../src/content/banks";
const url = new URL(process.env.DATABASE_URL || "");
assert.ok(
  ["127.0.0.1", "localhost"].includes(url.hostname) &&
    url.pathname.endsWith("_test"),
  "Requires disposable loopback _test database",
);
const prisma = new PrismaClient({ log: [] }),
  base = process.env.PORTAL_TEST_URL || "http://localhost:3020",
  off = process.env.PORTAL_OFF_TEST_URL || "http://localhost:3021";
const ctx = {
  networkHash: privateHash("bank-test-fixture"),
  userAgent: "Synthetic bank fixture",
};
const input = {
  bankId: "sample-bank-a",
  locale: "en",
  consentVersion: bankConsentVersion,
  accepted: true,
  scopes: ["ACCOUNTS", "BALANCES", "TRANSACTIONS"],
};
const path = (id: string, action: string) =>
  `/api/portal/bank-connections/${id}/${action}`;
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
    for (const h of r.headers.getSetCookie()) {
      const p = h.split(";")[0],
        i = p.indexOf("=");
      this.cookies.set(p.slice(0, i), p.slice(i + 1));
    }
    return r;
  }
  async post(
    path: string,
    data: unknown,
    headers: Record<string, string> = {},
  ) {
    const csrf = await (await this.get("/api/auth")).json();
    return fetch(base + path, {
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
  for (const model of [
    prisma.bankEvent,
    prisma.bankConsent,
    prisma.bankConnection,
    prisma.notificationRead,
    prisma.kycConsent,
    prisma.kycReview,
    prisma.kycEvent,
    prisma.kycSubmission,
    prisma.kycProfile,
    prisma.dataRequest,
    prisma.auditEvent,
    prisma.session,
    prisma.actionToken,
    prisma.emailJob,
    prisma.rateLimit,
    prisma.user,
  ])
    await (model.deleteMany as () => Promise<unknown>)();
});
after(() => prisma.$disconnect());
async function account(
  email = "bank@example.test",
  role: Role = "CLIENT",
  kind: SessionKind = "AUTHENTICATED",
) {
  const user = await prisma.user.create({
    data: {
      email,
      name: "Synthetic fixture",
      passwordHash: "Fixture-only-no-password-login",
      role,
      emailVerifiedAt: new Date(),
      totpEnabledAt: new Date(),
    },
  });
  const issued = await prisma.$transaction((tx) =>
      issueSession(tx, user, kind, ctx),
    ),
    browser = new Browser();
  browser.cookies.set("__Host-alabbas-session", issued.token);
  return { user, browser, token: issued.token, session: issued.session };
}
async function connected(a: Awaited<ReturnType<typeof account>>, data = input) {
  const r = await a.browser.post("/api/portal/bank-connections", data);
  assert.equal(r.status, 200);
  return (await r.json()).id as string;
}
test("Disabled bank pages and APIs return noindex 404 before credentials", async () => {
  for (const p of [
    "/en/portal/banks",
    "/ar/portal/banks",
    "/api/portal/bank-connections",
    path("anything", "accounts"),
    path("anything", "disconnect"),
    "/api/portal/cron",
  ])
    for (const method of ["GET", "POST", "HEAD"]) {
      const r = await fetch(off + p, { method, redirect: "manual" });
      assert.equal(r.status, 404);
      assert.equal(r.headers.get("set-cookie"), null);
      assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
    }
});
test("Anonymous and password-only challenge sessions cannot connect or list banks", async () => {
  const a = await account("challenge@example.test", "CLIENT", "CHALLENGE");
  for (const b of [new Browser(), a.browser]) {
    assert.equal((await b.get("/api/portal/bank-connections")).status, 401);
    assert.equal(
      (await b.post("/api/portal/bank-connections", input)).status,
      401,
    );
  }
});
test("Staff roles cannot use client bank APIs", async () => {
  for (const role of [
    "ADMIN",
    "COMPLIANCE_OFFICER",
    "RELATIONSHIP_MANAGER",
  ] as Role[]) {
    const a = await account(`${role}@example.test`, role);
    assert.equal(
      (await a.browser.get("/api/portal/bank-connections")).status,
      403,
    );
    assert.equal(
      (await a.browser.post("/api/portal/bank-connections", input)).status,
      403,
    );
  }
});
test("Suspension and non-individual account types deny bank access", async () => {
  const a = await account();
  await prisma.user.update({
    where: { id: a.user.id },
    data: { status: "SUSPENDED" },
  });
  assert.equal(
    (await a.browser.get("/api/portal/bank-connections")).status,
    401,
  );
  await prisma.user.update({
    where: { id: a.user.id },
    data: { status: "PENDING", accountType: "INSTITUTION" },
  });
  assert.equal(
    (await a.browser.post("/api/portal/bank-connections", input)).status,
    403,
  );
});
test("Revoked or expired authenticated sessions cannot read existing connections", async () => {
  const a = await account(),
    id = await connected(a);
  await prisma.session.update({
    where: { id: a.session.id },
    data: { expiresAt: new Date(0) },
  });
  assert.equal((await a.browser.get(path(id, "accounts"))).status, 401);
});
test("Consent must be explicit, versioned, bilingual and restricted to known scopes and fictional banks", async () => {
  const a = await account();
  for (const change of [
    { accepted: false },
    { consentVersion: "old" },
    { locale: "xx" },
    { scopes: ["BALANCES"] },
    { scopes: ["ACCOUNTS", "ACCOUNTS"] },
    { scopes: ["ACCOUNTS", "PAYMENTS"] },
    { bankId: "real-bank" },
    { credentials: "secret" },
    { userId: "other" },
    { provider: "REAL" },
    { redirectUrl: "https://evil.example" },
  ])
    assert.equal(
      (
        await a.browser.post("/api/portal/bank-connections", {
          ...input,
          ...change,
        })
      ).status,
      400,
    );
  assert.equal(await prisma.bankConsent.count(), 0);
});
test("Bank mutations require canonical origin and valid double-submit CSRF", async () => {
  const a = await account();
  for (const headers of [
    { Origin: "https://evil.example" },
    { "X-CSRF-Token": "wrong" },
  ] as Record<string, string>[])
    assert.equal(
      (await a.browser.post("/api/portal/bank-connections", input, headers))
        .status,
      403,
    );
  assert.equal(await prisma.bankConnection.count(), 0);
});
test("Exact Arabic consent is durable; provider reference is encrypted and never returned", async () => {
  const a = await account(),
    id = await connected(a, { ...input, locale: "ar" }),
    row = await prisma.bankConnection.findUniqueOrThrow({
      where: { id },
      include: { consents: true },
    }),
    consent = row.consents[0];
  assert.equal(consent.text, bankConsentText.ar);
  assert.equal(consent.textVersion, bankConsentVersion);
  assert.equal(consent.locale, "ar");
  assert.deepEqual(consent.scopes, input.scopes);
  assert.ok(
    consent.expiresAt.getTime() - consent.acceptedAt.getTime() > 29 * 86400000,
  );
  assert.ok(row.encryptedReference);
  assert.equal(
    JSON.parse(decrypt(row.encryptedReference!, `bank:${id}`)).bankId,
    "sample-bank-a",
  );
  assert.throws(() => decrypt(row.encryptedReference!, `bank:another`));
  const r = await a.browser.get("/api/portal/bank-connections"),
    data = await r.json();
  assert.match(r.headers.get("cache-control") || "", /no-store/);
  assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
  assert.equal(data.mock, true);
  assert.ok(!JSON.stringify(data).includes("encryptedReference"));
  assert.ok(!JSON.stringify(data).includes("networkHash"));
  assert.ok(!JSON.stringify(data).includes(a.user.email));
  assert.equal(
    await prisma.bankEvent.count({
      where: { actorId: a.user.id, actorKind: "CLIENT" },
    }),
    2,
  );
});
test("Read-only mock balances and paginated transactions use integer SAR cents", async () => {
  const a = await account(),
    id = await connected(a),
    accounts = await (await a.browser.get(path(id, "accounts"))).json();
  assert.equal(accounts.accounts.length, 2);
  assert.equal(accounts.accounts[0].balance.availableCents, 4250000);
  assert.match(accounts.accounts[0].maskedIdentifier, /SAMPLE/);
  const p1 = await (
      await a.browser.get(
        path(id, "transactions") + "?accountId=sample-current",
      )
    ).json(),
    p2 = await (
      await a.browser.get(
        path(id, "transactions") + "?accountId=sample-current&cursor=3",
      )
    ).json();
  assert.equal(p1.items.length, 3);
  assert.equal(p1.nextCursor, "3");
  assert.equal(p2.items.length, 3);
  assert.equal(p2.nextCursor, null);
  const items = [...p1.items, ...p2.items];
  assert.equal(new Set(items.map((t) => t.id)).size, 6);
  assert.ok(
    items.every((t) => Number.isInteger(t.amountCents) && t.currency === "SAR"),
  );
  assert.ok(
    items.some((t) => t.amountCents < 0) &&
      items.some((t) => t.amountCents > 0),
  );
});
test("Accounts-only consent grants neither balances nor transaction access", async () => {
  const a = await account(),
    id = await connected(a, { ...input, scopes: ["ACCOUNTS"] }),
    data = await (await a.browser.get(path(id, "accounts"))).json();
  assert.ok(
    data.accounts.every((a: { balance: unknown }) => a.balance === null),
  );
  assert.equal(
    (
      await a.browser.get(
        path(id, "transactions") + "?accountId=sample-current",
      )
    ).status,
    403,
  );
});
test("Unknown accounts, cursors and selectors are rejected", async () => {
  const a = await account(),
    id = await connected(a);
  assert.equal(
    (
      await a.browser.get(
        path(id, "transactions") + "?accountId=another-account",
      )
    ).status,
    404,
  );
  for (const q of [
    "?accountId=sample-current&cursor=99",
    "?accountId=sample-current&userId=other",
    "?accountId=sample-current&role=ADMIN",
  ])
    assert.equal(
      (await a.browser.get(path(id, "transactions") + q)).status,
      400,
    );
  assert.equal(
    (await a.browser.get(path(id, "accounts") + "?userId=other")).status,
    400,
  );
  assert.equal(
    (await a.browser.get("/api/portal/bank-connections?userId=other")).status,
    400,
  );
});
test("Another client cannot inspect or disconnect an owned connection", async () => {
  const a = await account(),
    b = await account("other@example.test"),
    id = await connected(a);
  assert.equal(
    (await (await b.browser.get("/api/portal/bank-connections")).json())
      .connections.length,
    0,
  );
  assert.equal((await b.browser.get(path(id, "accounts"))).status, 404);
  assert.equal(
    (
      await b.browser.get(
        path(id, "transactions") + "?accountId=sample-current",
      )
    ).status,
    404,
  );
  assert.equal((await b.browser.post(path(id, "disconnect"), {})).status, 404);
});
test("Concurrent duplicate connects create only one consent and one connection", async () => {
  const a = await account();
  const results = await Promise.all(
    [connectBank(a.token, input, ctx), connectBank(a.token, input, ctx)].map(
      (p) =>
        p.then(
          () => 200,
          (e) => e.status,
        ),
    ),
  );
  assert.deepEqual(results.sort(), [200, 409]);
  assert.equal(await prisma.bankConsent.count(), 1);
  assert.equal(await prisma.bankConnection.count(), 1);
});
test("Clients can connect both fictional banks independently", async () => {
  const a = await account();
  await connected(a);
  await connected(a, { ...input, bankId: "sample-bank-b" });
  assert.equal(
    (await (await a.browser.get("/api/portal/bank-connections")).json())
      .connections.length,
    2,
  );
});
test("Disconnect stops access, clears the reference only after acknowledgement and is idempotent", async () => {
  const a = await account(),
    id = await connected(a);
  for (let i = 0; i < 2; i++) {
    const r = await a.browser.post(path(id, "disconnect"), {});
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), {
      status: "REVOKED",
      localAccessStopped: true,
      providerRevoked: true,
    });
  }
  assert.equal((await a.browser.get(path(id, "accounts"))).status, 403);
  const row = await prisma.bankConnection.findUniqueOrThrow({ where: { id } });
  assert.equal(row.encryptedReference, null);
  assert.equal(
    await prisma.bankEvent.count({
      where: { action: "BANK_DISCONNECT_REQUESTED" },
    }),
    1,
  );
  assert.equal(
    await prisma.bankEvent.count({ where: { action: "BANK_DISCONNECTED" } }),
    1,
  );
  assert.equal(await prisma.bankConsent.count(), 1);
});
test("Expiry blocks reads and reconnect requires disconnect followed by fresh consent", async () => {
  const a = await account(),
    id = await connected(a);
  await prisma.bankConnection.update({
    where: { id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal((await a.browser.get(path(id, "accounts"))).status, 403);
  assert.equal(
    (await (await a.browser.get("/api/portal/bank-connections")).json())
      .connections[0].status,
    "EXPIRED",
  );
  assert.equal(
    (await a.browser.post("/api/portal/bank-connections", input)).status,
    409,
  );
  await a.browser.post(path(id, "disconnect"), {});
  assert.equal(
    await connected(a, { ...input, locale: "ar", scopes: ["ACCOUNTS"] }),
    id,
  );
  const consents = await prisma.bankConsent.findMany({
    orderBy: { revision: "asc" },
  });
  assert.equal(consents.length, 2);
  assert.equal(consents[0].text, bankConsentText.en);
  assert.equal(consents[1].text, bankConsentText.ar);
  assert.ok(consents[1].revision > consents[0].revision);
});
class FailedRevoke extends MockProvider {
  override async revokeConsent() {
    return { revoked: false };
  }
}
test("Provider failure leaves local access stopped and protected cron retries with system attribution", async () => {
  const a = await account(),
    id = await connected(a),
    result = await disconnectBank(a.token, id, ctx, new FailedRevoke());
  assert.equal(result.status, "REVOKING");
  assert.equal(result.providerRevoked, false);
  assert.equal(result.localAccessStopped, true);
  await assert.rejects(bankAccounts(a.token, id), { status: 403 });
  let row = await prisma.bankConnection.findUniqueOrThrow({ where: { id } });
  assert.ok(row.encryptedReference);
  assert.equal(row.revocationAttempts, 1);
  assert.ok(row.nextRevocationAt.getTime() > Date.now());
  await prisma.bankConnection.update({
    where: { id },
    data: { nextRevocationAt: new Date(Date.now() - 1000) },
  });
  assert.deepEqual(await retryBankRevocations(), {
    bankRevocationAttempts: 1,
    bankRevoked: 1,
  });
  row = await prisma.bankConnection.findUniqueOrThrow({ where: { id } });
  assert.equal(row.status, "REVOKED");
  assert.equal(row.encryptedReference, null);
  const event = await prisma.bankEvent.findFirstOrThrow({
    where: { action: "BANK_DISCONNECTED" },
  });
  assert.equal(event.actorKind, "SYSTEM");
  assert.equal(event.actorId, null);
});
test("Exhausted retries remain blocked without fabricated provider acknowledgement", async () => {
  const a = await account(),
    id = await connected(a);
  await disconnectBank(a.token, id, ctx, new FailedRevoke());
  await prisma.bankConnection.update({
    where: { id },
    data: { revocationAttempts: 5, nextRevocationAt: new Date(0) },
  });
  assert.deepEqual(await retryBankRevocations(), {
    bankRevocationAttempts: 0,
    bankRevoked: 0,
  });
  assert.equal(
    (await prisma.bankConnection.findUniqueOrThrow({ where: { id } })).status,
    "REVOKING",
  );
  assert.equal(
    await prisma.bankEvent.count({ where: { action: "BANK_DISCONNECTED" } }),
    0,
  );
});
test("Disconnect during provider creation wins and never activates the connection", async () => {
  const a = await account();
  let ready!: () => void, release!: () => void;
  const started = new Promise<void>((r) => (ready = r)),
    gate = new Promise<void>((r) => (release = r));
  class Deferred extends MockProvider {
    override async createConsent(
      ...args: Parameters<MockProvider["createConsent"]>
    ) {
      ready();
      await gate;
      return super.createConsent(...args);
    }
  }
  const task = connectBank(a.token, input, ctx, new Deferred());
  await started;
  const row = await prisma.bankConnection.findFirstOrThrow();
  const disconnected = await disconnectBank(a.token, row.id, ctx);
  assert.equal(disconnected.status, "REVOKING");
  assert.equal(disconnected.providerRevoked, false);
  release();
  assert.equal((await task).status, "REVOKED");
  assert.equal(
    await prisma.bankEvent.count({ where: { action: "BANK_CONNECTED" } }),
    0,
  );
});
test("An in-flight read cannot return data after a disconnect", async () => {
  const a = await account(),
    id = await connected(a);
  let ready!: () => void, release!: () => void;
  const started = new Promise<void>((r) => (ready = r)),
    gate = new Promise<void>((r) => (release = r));
  class Deferred extends MockProvider {
    override async listAccounts(
      ...args: Parameters<MockProvider["listAccounts"]>
    ) {
      ready();
      await gate;
      return super.listAccounts(...args);
    }
  }
  const result = bankAccounts(a.token, id, new Deferred()).then(
    () => null,
    (e) => e,
  );
  await started;
  await disconnectBank(a.token, id, ctx);
  release();
  assert.equal((await result).status, 403);
});
test("Provider creation failure records failed consent without exposing data", async () => {
  const a = await account();
  class Failed extends MockProvider {
    override async createConsent(
      ...args: Parameters<MockProvider["createConsent"]>
    ): ReturnType<MockProvider["createConsent"]> {
      void args;
      throw Error("synthetic provider failure");
    }
  }
  await assert.rejects(connectBank(a.token, input, ctx, new Failed()), {
    status: 503,
  });
  assert.equal(
    (await prisma.bankConnection.findFirstOrThrow()).status,
    "FAILED",
  );
  assert.equal(await prisma.bankConsent.count(), 1);
  assert.equal(
    await prisma.bankEvent.count({ where: { action: "BANK_CONNECT_FAILED" } }),
    1,
  );
});
test("Unreviewed real providers fail closed even when injected on the server", async () => {
  const a = await account(),
    provider = Object.assign(new MockProvider(), {
      id: "REAL",
      mock: false,
    }) as BankConnectionProvider;
  await assert.rejects(connectBank(a.token, input, ctx, provider), {
    status: 503,
  });
  assert.equal(await prisma.bankConnection.count(), 0);
});
test("A pending provider grant cannot be read and can still be revoked", async () => {
  const a = await account();
  class Pending extends MockProvider {
    override async createConsent(
      ...args: Parameters<MockProvider["createConsent"]>
    ) {
      return {
        ...(await super.createConsent(...args)),
        status: "PENDING" as const,
      };
    }
  }
  const row = await connectBank(a.token, input, ctx, new Pending());
  assert.equal(row.status, "PENDING");
  await assert.rejects(bankAccounts(a.token, row.id), { status: 403 });
  assert.equal((await disconnectBank(a.token, row.id, ctx)).status, "REVOKED");
});
test("Upstream revoked consent prevents reads even when local status is active", async () => {
  const a = await account(),
    id = await connected(a);
  class Revoked extends MockProvider {
    override async getConsentStatus() {
      return "REVOKED" as const;
    }
  }
  await assert.rejects(bankAccounts(a.token, id, new Revoked()), {
    status: 403,
  });
});
test("Connection rate limits apply before duplicate work", async () => {
  const a = await account();
  await connected(a);
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await a.browser.post("/api/portal/bank-connections", input)).status,
      409,
    );
  assert.equal(
    (await a.browser.post("/api/portal/bank-connections", input)).status,
    429,
  );
  assert.equal(await prisma.bankConsent.count(), 1);
});
test("Cron requires its secret and bank records prevent unreviewed cascading deletion", async () => {
  const a = await account(),
    id = await connected(a);
  assert.equal(
    (await fetch(base + "/api/portal/cron", { method: "POST" })).status,
    403,
  );
  await assert.rejects(prisma.user.delete({ where: { id: a.user.id } }));
  assert.equal(
    await prisma.bankConsent.count({ where: { connectionId: id } }),
    1,
  );
});

test("Concurrent disconnects produce one local transition and one provider acknowledgement", async () => {
  const a = await account(),
    id = await connected(a);
  await Promise.all([
    disconnectBank(a.token, id, ctx),
    disconnectBank(a.token, id, ctx),
  ]);
  assert.equal(
    (await prisma.bankConnection.findUniqueOrThrow({ where: { id } })).status,
    "REVOKED",
  );
  assert.equal(
    await prisma.bankEvent.count({
      where: { action: "BANK_DISCONNECT_REQUESTED" },
    }),
    1,
  );
  assert.equal(
    await prisma.bankEvent.count({ where: { action: "BANK_DISCONNECTED" } }),
    1,
  );
});
test("Ungrantable balances are not requested from the provider", async () => {
  const a = await account(),
    id = await connected(a, { ...input, scopes: ["ACCOUNTS"] });
  class ForbiddenBalances extends MockProvider {
    override async getBalances(): ReturnType<MockProvider["getBalances"]> {
      throw Error("Unrequested scope");
    }
  }
  assert.ok(
    (await bankAccounts(a.token, id, new ForbiddenBalances())).accounts.every(
      (a) => a.balance === null,
    ),
  );
});
test("A malformed provider grant cannot extend consent beyond the accepted maximum", async () => {
  const a = await account();
  class InvalidGrant extends MockProvider {
    override async createConsent(
      ...args: Parameters<MockProvider["createConsent"]>
    ) {
      return {
        ...(await super.createConsent(...args)),
        expiresAt: new Date(Date.now() + 60 * 86400000),
      };
    }
  }
  await assert.rejects(connectBank(a.token, input, ctx, new InvalidGrant()), {
    status: 503,
  });
  assert.equal(
    (await prisma.bankConnection.findFirstOrThrow()).status,
    "FAILED",
  );
  assert.equal(
    await prisma.bankEvent.count({ where: { action: "BANK_CONNECTED" } }),
    0,
  );
});
test("Protected HTTP cron retries revocation without deleting durable consent history", async () => {
  const a = await account(),
    id = await connected(a);
  await disconnectBank(a.token, id, ctx, new FailedRevoke());
  await prisma.bankConnection.update({
    where: { id },
    data: { nextRevocationAt: new Date(0) },
  });
  const r = await fetch(base + "/api/portal/cron", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PORTAL_CRON_SECRET}` },
  });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).bankRevoked, 1);
  assert.equal(
    await prisma.bankConsent.count({ where: { connectionId: id } }),
    1,
  );
  assert.equal(
    await prisma.bankEvent.count({ where: { connectionId: id } }),
    5,
  );
});
