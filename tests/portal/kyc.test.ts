import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient, type Role } from "@prisma/client";
import { decrypt, makeTotp } from "../../src/lib/portal/crypto";
import {
  kycDataSchema,
  riskBand,
  validSaudiId,
} from "../../src/lib/portal/kyc-validation";
import { kycConsents } from "../../src/content/kyc";
const database = new URL(process.env.DATABASE_URL || "");
assert.ok(
  ["127.0.0.1", "localhost"].includes(database.hostname) &&
    database.pathname.endsWith("_test"),
  "Requires a disposable loopback _test database.",
);
const prisma = new PrismaClient({ log: [] });
const base = process.env.PORTAL_TEST_URL || "http://localhost:3020";
const off = process.env.PORTAL_OFF_TEST_URL || "http://localhost:3021";
const password = "Phase2-test-password-927!";
const input = {
  legalName: "Synthetic Client",
  dateOfBirth: "1990-01-15",
  nationality: "SA",
  residenceCountry: "SA",
  city: "Riyadh",
  occupation: "Engineer",
  idKind: "NATIONAL_ID",
  idNumber: "1000000008",
  sourceOfFunds: "SALARY",
  sourceDetails: "Synthetic salary only",
  annualIncome: "100K_300K",
  investableAssets: "100K_500K",
  politicallyExposed: false,
  objective: "INCOME",
  horizon: "1_3Y",
  experience: "LIMITED",
  lossTolerance: "MEDIUM",
};
class Browser {
  cookies = new Map<string, string>();
  cookie() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  capture(r: Response) {
    for (const line of r.headers.getSetCookie()) {
      const pair = line.split(";")[0];
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  async get(path: string) {
    const r = await fetch(base + path, {
      headers: { Cookie: this.cookie() },
      redirect: "manual",
    });
    this.capture(r);
    return r;
  }
  async post(
    path: string,
    data: unknown,
    headers: Record<string, string> = {},
  ) {
    const csrf = await (await this.get("/api/auth")).json();
    const r = await fetch(base + path, {
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
after(() => prisma.$disconnect());
async function account(
  email = "kyc@example.test",
  role: Role = "CLIENT",
  mfa = true,
) {
  const browser = new Browser();
  assert.equal(
    (
      await browser.post("/api/auth/sign-up", {
        name: "Synthetic Test Account",
        email,
        password,
        locale: "en",
        consent: true,
      })
    ).status,
    200,
  );
  const job = await prisma.emailJob.findFirstOrThrow({
    orderBy: { createdAt: "desc" },
  });
  const token = JSON.parse(decrypt(job.payload, `email:${job.id}`)).text.match(
    /#token=([A-Za-z0-9_-]+)/,
  )[1];
  assert.equal(
    (await browser.post("/api/auth/verify-email", { token })).status,
    200,
  );
  assert.equal(
    (await browser.post("/api/auth/sign-in", { email, password })).status,
    200,
  );
  const setup = await (await browser.get("/api/portal/totp-setup")).json();
  if (mfa)
    assert.equal(
      (
        await browser.post("/api/auth/confirm-totp", {
          code: makeTotp(setup.secret, email).generate(),
        })
      ).status,
      200,
    );
  const user = await prisma.user.update({ where: { email }, data: { role } });
  return { browser, user, secret: setup.secret as string };
}
type Account = Awaited<ReturnType<typeof account>>;
async function code(a: Account) {
  await prisma.user.update({
    where: { id: a.user.id },
    data: { totpLastStep: -1 },
  });
  return makeTotp(a.secret, a.user.email).generate();
}
async function submit(a: Account, version = 0, data = input, locale = "en") {
  return a.browser.post("/api/portal/kyc/submit", {
    version,
    data,
    locale,
    consentVersion: "kyc-v1",
    privacyConsent: true,
    accuracyConsent: true,
  });
}
async function profile(a: Account) {
  return prisma.kycProfile.findUniqueOrThrow({ where: { userId: a.user.id } });
}
async function review(
  staff: Account,
  p: { id: string; version: number },
  decision = "APPROVED",
  extra: Record<string, unknown> = {},
) {
  return staff.browser.post("/api/portal/admin/kyc", {
    profileId: p.id,
    version: p.version,
    decision,
    reason: "Synthetic compliance review completed",
    checksConfirmed: true,
    code: await code(staff),
    ...extra,
  });
}
test("KYC pages and APIs are 404 when disabled, without cookies or a database dependency", async () => {
  for (const path of [
    "/en/portal/kyc",
    "/ar/portal/kyc",
    "/en/portal/admin/kyc",
    "/ar/portal/admin/kyc/case123",
    "/api/portal/kyc",
    "/api/portal/kyc/submit",
    "/api/portal/admin/kyc",
  ])
    for (const method of ["GET", "POST", "HEAD"]) {
      const r = await fetch(off + path, { method, redirect: "manual" });
      assert.equal(r.status, 404, `${method} ${path}`);
      assert.equal(r.headers.get("set-cookie"), null);
      assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
    }
});
test("Anonymous and pre-MFA sessions cannot access KYC or staff data", async () => {
  for (const browser of [
    new Browser(),
    (await account("challenge@example.test", "CLIENT", false)).browser,
  ]) {
    assert.equal((await browser.get("/api/portal/kyc")).status, 401);
    assert.equal((await browser.get("/api/portal/admin/kyc")).status, 401);
    assert.equal(
      (await browser.post("/api/portal/kyc", { version: 0, data: input }))
        .status,
      401,
    );
  }
});
test("Saudi identity validation checks checksum and document type without asserting verification", () => {
  assert.equal(validSaudiId("1000000008", "NATIONAL_ID"), true);
  assert.equal(validSaudiId("2000000006", "IQAMA"), true);
  assert.equal(validSaudiId("1000000009", "NATIONAL_ID"), false);
  assert.equal(validSaudiId("2000000006", "NATIONAL_ID"), false);
  assert.equal(
    kycDataSchema.safeParse({
      ...input,
      idKind: "IQAMA",
      idNumber: "2000000006",
      nationality: "AE",
    }).success,
    true,
  );
});
test("Risk profiling respects conservative constraints and is independent of account approval", () => {
  const data = kycDataSchema.parse(input);
  assert.equal(riskBand(data), "BALANCED");
  assert.equal(
    riskBand({
      ...data,
      objective: "GROWTH",
      lossTolerance: "HIGH",
      horizon: "OVER_3Y",
      experience: "EXPERIENCED",
    }),
    "GROWTH",
  );
  for (const extra of [
    { lossTolerance: "LOW" },
    { horizon: "UNDER_1Y" },
    { experience: "NONE" },
  ])
    assert.equal(
      riskBand(kycDataSchema.parse({ ...input, ...extra })),
      "CONSERVATIVE",
    );
});
test("Validation rejects minors, invalid dates, IDs, unsupported residents and injected privileges", async () => {
  const a = await account();
  for (const extra of [
    { dateOfBirth: "2020-01-01" },
    { dateOfBirth: "1990-02-31" },
    { idNumber: "1000000009" },
    { nationality: "AE" },
    { residenceCountry: "AE" },
    { politicallyExposed: "false" },
    { role: "ADMIN" },
    { status: "APPROVED" },
    { sourceDetails: "x".repeat(501) },
  ])
    assert.equal(
      (
        await a.browser.post("/api/portal/kyc", {
          version: 0,
          data: { ...input, ...extra },
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await a.browser.post("/api/portal/kyc", {
        version: 0,
        data: input,
        userId: "another-user",
      })
    ).status,
    400,
  );
  assert.equal(await prisma.kycProfile.count(), 0);
});
test("KYC writes enforce CSRF, origin checks, JSON and bounded requests", async () => {
  const a = await account();
  for (const path of [
    "/api/portal/kyc",
    "/api/portal/kyc/submit",
    "/api/portal/admin/kyc",
  ]) {
    assert.equal(
      (await a.browser.post(path, {}, { Origin: "https://evil.example" }))
        .status,
      403,
    );
    assert.equal(
      (await a.browser.post(path, {}, { "X-CSRF-Token": "" })).status,
      403,
    );
    assert.equal(
      (await a.browser.post(path, {}, { "Content-Type": "text/plain" })).status,
      415,
    );
    assert.equal(
      (await a.browser.post(path, { data: "x".repeat(9000) })).status,
      413,
    );
  }
});
test("Drafts encrypt personal details and cannot expose another client's data", async () => {
  const a = await account(),
    b = await account("other@example.test");
  assert.equal(
    (await a.browser.post("/api/portal/kyc", { version: 0, data: input }))
      .status,
    200,
  );
  const p = await profile(a);
  assert.match(p.encryptedData, /^v1:/);
  assert.ok(!p.encryptedData.includes(input.idNumber));
  assert.ok(!p.encryptedData.includes(input.legalName));
  assert.deepEqual(JSON.parse(decrypt(p.encryptedData, `kyc:${p.id}`)), input);
  assert.throws(() => decrypt(p.encryptedData, "kyc:other-account"));
  const own = await (await a.browser.get("/api/portal/kyc")).json();
  assert.equal(own.data.idNumber, input.idNumber);
  const other = await (
    await b.browser.get(`/api/portal/kyc?userId=${a.user.id}&id=${p.id}`)
  ).json();
  assert.equal(other.data, null);
  assert.equal(
    (await b.browser.get(`/api/portal/admin/kyc?id=${p.id}`)).status,
    403,
  );
});
test("Concurrent draft creation admits one revision and returns a conflict to the other writer", async () => {
  const a = await account();
  const r = await Promise.all([
    a.browser.post("/api/portal/kyc", { version: 0, data: input }),
    a.browser.post("/api/portal/kyc", {
      version: 0,
      data: { ...input, city: "Jeddah" },
    }),
  ]);
  assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
  assert.equal(await prisma.kycProfile.count(), 1);
  assert.equal(
    await prisma.kycEvent.count({ where: { action: "KYC_SAVED" } }),
    1,
  );
});
test("Stale draft versions cannot overwrite details", async () => {
  const a = await account();
  assert.equal(
    (await a.browser.post("/api/portal/kyc", { version: 0, data: input }))
      .status,
    200,
  );
  assert.equal(
    (
      await a.browser.post("/api/portal/kyc", {
        version: 0,
        data: { ...input, city: "Jeddah" },
      })
    ).status,
    409,
  );
  assert.equal((await profile(a)).version, 1);
});
test("Submission requires the current consent version and both explicit acknowledgements", async () => {
  const a = await account();
  for (const extra of [
    { privacyConsent: false },
    { accuracyConsent: false },
    { consentVersion: "kyc-v0" },
    { locale: "xx" },
    { status: "APPROVED" },
  ])
    assert.equal(
      (
        await a.browser.post("/api/portal/kyc/submit", {
          version: 0,
          data: input,
          locale: "en",
          consentVersion: "kyc-v1",
          privacyConsent: true,
          accuracyConsent: true,
          ...extra,
        })
      ).status,
      400,
    );
  assert.equal(await prisma.kycConsent.count(), 0);
  assert.equal(await prisma.kycProfile.count(), 0);
});
test("Arabic submission stores immutable encrypted snapshot, exact consents and timestamps, leaving account pending", async () => {
  const a = await account();
  assert.equal((await submit(a, 0, input, "ar")).status, 200);
  const p = await profile(a);
  const s = await prisma.kycSubmission.findFirstOrThrow();
  assert.equal(p.status, "SUBMITTED");
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).status,
    "PENDING",
  );
  assert.deepEqual(
    JSON.parse(decrypt(s.encryptedData, `kyc-submission:${s.id}`)),
    input,
  );
  assert.notEqual(p.encryptedData, s.encryptedData);
  const consents = await prisma.kycConsent.findMany({
    orderBy: { kind: "asc" },
  });
  assert.equal(consents.length, 2);
  for (const c of consents) {
    assert.equal(c.locale, "ar");
    assert.equal(c.version, "kyc-v1");
    assert.equal(c.text, kycConsents.ar[c.kind as "privacy" | "accuracy"]);
    assert.ok(c.acceptedAt instanceof Date);
    assert.equal(c.networkHash.length, 64);
  }
  assert.equal(
    await prisma.kycEvent.count({ where: { action: "KYC_CONSENTS_RECORDED" } }),
    1,
  );
  assert.equal((await submit(a, 1)).status, 409);
  assert.equal(
    (await a.browser.post("/api/portal/kyc", { version: 1, data: input }))
      .status,
    409,
  );
});
test("Clients cannot review accounts or inject approval, and staff cannot submit client details", async () => {
  const a = await account(),
    staff = await account("staff@example.test", "ADMIN");
  await submit(a);
  const p = await profile(a);
  assert.equal((await review(a, p)).status, 403);
  assert.equal(
    (await staff.browser.post("/api/portal/kyc", { version: 0, data: input }))
      .status,
    403,
  );
  assert.equal((await staff.browser.get("/api/portal/kyc")).status, 403);
  assert.equal((await profile(a)).status, "SUBMITTED");
});
test("Relationship managers get status only and cannot read personal details or approve", async () => {
  const a = await account(),
    rm = await account("rm@example.test", "RELATIONSHIP_MANAGER");
  await submit(a);
  const p = await profile(a);
  const queue = await (await rm.browser.get("/api/portal/admin/kyc")).json();
  assert.equal(queue.canReview, false);
  assert.equal(queue.profiles.length, 1);
  assert.deepEqual(Object.keys(queue.profiles[0]).sort(), [
    "id",
    "status",
    "updatedAt",
    "version",
  ]);
  assert.equal(
    (await rm.browser.get(`/api/portal/admin/kyc?id=${p.id}`)).status,
    403,
  );
  assert.equal((await review(rm, p)).status, 403);
});
test("Admins and compliance officers can read submitted snapshots, and reads are audited", async () => {
  const a = await account();
  await submit(a);
  const p = await profile(a);
  for (const role of ["ADMIN", "COMPLIANCE_OFFICER"] as const) {
    const staff = await account(`${role}@example.test`, role);
    const r = await staff.browser.get(`/api/portal/admin/kyc?id=${p.id}`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("cache-control") || "", /no-store/);
    assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
    assert.equal((await r.json()).data.idNumber, input.idNumber);
  }
  assert.equal(
    await prisma.kycEvent.count({
      where: { profileId: p.id, action: "KYC_VIEWED" },
    }),
    2,
  );
});
test("Drafts are excluded from staff queue and cannot be inspected by staff", async () => {
  const a = await account(),
    staff = await account("staff@example.test", "ADMIN");
  await a.browser.post("/api/portal/kyc", { version: 0, data: input });
  const p = await profile(a);
  assert.equal(
    (await staff.browser.get(`/api/portal/admin/kyc?id=${p.id}`)).status,
    404,
  );
  assert.deepEqual(
    (await (await staff.browser.get("/api/portal/admin/kyc")).json()).profiles,
    [],
  );
});
test("Review requires a fresh MFA code, explicit approval checks and a reason", async () => {
  const a = await account(),
    staff = await account("staff@example.test", "COMPLIANCE_OFFICER");
  await submit(a);
  const p = await profile(a);
  for (const extra of [
    { code: "000000" },
    { reason: "" },
    { checksConfirmed: false },
    { role: "ADMIN" },
  ])
    assert.equal((await review(staff, p, "APPROVED", extra)).status, 400);
  assert.equal(await prisma.kycReview.count(), 0);
  assert.equal((await profile(a)).status, "SUBMITTED");
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).status,
    "PENDING",
  );
});
test("Approval updates the account atomically and locks client edits without allowing investments", async () => {
  const a = await account(),
    staff = await account("staff@example.test", "ADMIN");
  await submit(a);
  const p = await profile(a);
  assert.equal((await review(staff, p)).status, 200);
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).status,
    "APPROVED",
  );
  assert.equal((await profile(a)).status, "APPROVED");
  const r = await prisma.kycReview.findFirstOrThrow();
  assert.equal(r.reviewerId, staff.user.id);
  assert.equal(r.checksConfirmed, true);
  assert.ok(!r.encryptedReason.includes("Synthetic"));
  assert.equal(
    (await a.browser.post("/api/portal/kyc", { version: 2, data: input }))
      .status,
    403,
  );
  assert.equal((await a.browser.get("/api/portal/orders")).status, 404);
});
test("Requested changes allow a new submission without changing earlier consents or snapshots", async () => {
  const a = await account(),
    staff = await account("staff@example.test", "COMPLIANCE_OFFICER");
  await submit(a);
  const p = await profile(a);
  const old = await prisma.kycSubmission.findFirstOrThrow();
  const consents = await prisma.kycConsent.findMany({
    orderBy: { kind: "asc" },
  });
  assert.equal(
    (
      await review(staff, p, "CHANGES_REQUESTED", {
        reason: "Please clarify source of funds",
        checksConfirmed: false,
      })
    ).status,
    200,
  );
  const own = await (await a.browser.get("/api/portal/kyc")).json();
  assert.equal(own.feedback, "Please clarify source of funds");
  assert.equal(own.version, 2);
  assert.equal(
    (
      await submit(a, 2, {
        ...input,
        sourceDetails: "Updated synthetic salary",
      })
    ).status,
    200,
  );
  assert.equal((await profile(a)).status, "SUBMITTED");
  assert.equal(await prisma.kycSubmission.count(), 2);
  assert.equal(await prisma.kycConsent.count(), 4);
  assert.deepEqual(
    await prisma.kycSubmission.findUnique({ where: { id: old.id } }),
    old,
  );
  assert.deepEqual(
    await prisma.kycConsent.findMany({
      where: { submissionId: old.id },
      orderBy: { kind: "asc" },
    }),
    consents,
  );
  assert.equal((await review(staff, p)).status, 409);
});
test("Rejected submissions stay pending and are not editable", async () => {
  const a = await account(),
    staff = await account("staff@example.test", "ADMIN");
  await submit(a);
  assert.equal((await review(staff, await profile(a), "REJECTED")).status, 200);
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).status,
    "PENDING",
  );
  assert.equal((await submit(a, 2)).status, 409);
});
test("A reviewer cannot inspect or approve their own earlier client submission", async () => {
  const a = await account();
  await submit(a);
  const p = await profile(a);
  await prisma.user.update({
    where: { id: a.user.id },
    data: { role: "ADMIN" },
  });
  assert.equal(
    (await a.browser.get(`/api/portal/admin/kyc?id=${p.id}`)).status,
    403,
  );
  assert.equal((await review(a, p)).status, 403);
});
test("Competing reviewers cannot record duplicate or contradictory decisions", async () => {
  const a = await account(),
    admin = await account("admin@example.test", "ADMIN"),
    compliance = await account("compliance@example.test", "COMPLIANCE_OFFICER");
  await submit(a);
  const p = await profile(a);
  const responses = await Promise.all([
    review(admin, p),
    review(compliance, p, "CHANGES_REQUESTED"),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await prisma.kycReview.count(), 1);
  const final = await profile(a);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: a.user.id },
  });
  assert.equal(
    user.status,
    final.status === "APPROVED" ? "APPROVED" : "PENDING",
  );
});
test("Suspended accounts and revoked staff roles cannot be approved or access personal details", async () => {
  const a = await account(),
    staff = await account("staff@example.test", "ADMIN");
  await submit(a);
  const p = await profile(a);
  await prisma.user.update({
    where: { id: a.user.id },
    data: { status: "SUSPENDED" },
  });
  assert.equal((await review(staff, p)).status, 403);
  assert.equal((await a.browser.get("/api/portal/kyc")).status, 401);
  await prisma.user.update({
    where: { id: staff.user.id },
    data: { role: "RELATIONSHIP_MANAGER" },
  });
  assert.equal(
    (await staff.browser.get(`/api/portal/admin/kyc?id=${p.id}`)).status,
    403,
  );
});
test("Institutional and government accounts cannot use individual KYC", async () => {
  const a = await account();
  for (const accountType of ["INSTITUTION", "GOVERNMENT"] as const) {
    await prisma.user.update({
      where: { id: a.user.id },
      data: { accountType },
    });
    assert.equal((await a.browser.get("/api/portal/kyc")).status, 403);
    assert.equal((await submit(a)).status, 403);
  }
});
test("KYC writes and MFA review attempts have database-backed rate limits", async () => {
  const a = await account();
  for (let version = 0; version < 20; version++)
    assert.equal(
      (await a.browser.post("/api/portal/kyc", { version, data: input }))
        .status,
      200,
    );
  assert.equal(
    (await a.browser.post("/api/portal/kyc", { version: 20, data: input }))
      .status,
    429,
  );
  await prisma.rateLimit.deleteMany();
  await submit(a, 20);
  const staff = await account("staff@example.test", "ADMIN"),
    p = await profile(a);
  for (let i = 0; i < 6; i++)
    assert.equal(
      (await review(staff, p, "APPROVED", { code: "000000" })).status,
      400,
    );
  assert.equal((await review(staff, p)).status, 429);
});
test("KYC consents, reviews and audit events survive auth cleanup and block unaudited deletion", async () => {
  const a = await account(),
    staff = await account("staff@example.test", "ADMIN");
  await submit(a);
  await review(staff, await profile(a));
  await prisma.kycEvent.updateMany({
    data: { createdAt: new Date("2020-01-01") },
  });
  const r = await fetch(base + "/api/portal/cron", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PORTAL_CRON_SECRET}` },
  });
  assert.equal(r.status, 200);
  assert.equal(await prisma.kycConsent.count(), 2);
  assert.equal(await prisma.kycReview.count(), 1);
  assert.equal(await prisma.kycEvent.count(), 3);
  await assert.rejects(prisma.user.delete({ where: { id: a.user.id } }));
});
test("Review queues paginate without exposing personal details", async () => {
  const staff = await account("staff@example.test", "RELATIONSHIP_MANAGER");
  for (let i = 0; i < 51; i++) {
    const id = `queuefixture${String(i).padStart(3, "0")}`;
    await prisma.user.create({
      data: {
        id,
        email: `queue-${i}@example.test`,
        name: "Synthetic",
        passwordHash: "Fixture-only-no-login",
      },
    });
    await prisma.kycProfile.create({
      data: {
        id,
        userId: id,
        status: "SUBMITTED",
        encryptedData: "Fixture-only-no-personal-data",
      },
    });
  }
  const first = await (
    await staff.browser.get("/api/portal/admin/kyc?page=0")
  ).json();
  const second = await (
    await staff.browser.get("/api/portal/admin/kyc?page=1")
  ).json();
  assert.equal(first.profiles.length, 50);
  assert.equal(first.hasMore, true);
  assert.equal(second.profiles.length, 1);
  assert.equal(second.hasMore, false);
  assert.equal(
    new Set([...first.profiles, ...second.profiles].map((p) => p.id)).size,
    51,
  );
  assert.equal(
    (await staff.browser.get("/api/portal/admin/kyc?page=-1")).status,
    400,
  );
});
test("A consumed staff TOTP cannot approve another account in the same time window", async () => {
  const a = await account(),
    b = await account("second@example.test"),
    staff = await account("staff@example.test", "ADMIN");
  await submit(a);
  await submit(b);
  const p = await profile(a),
    q = await profile(b);
  const fresh = await code(staff);
  const payload = {
    decision: "APPROVED",
    reason: "Synthetic review completed",
    checksConfirmed: true,
    code: fresh,
  };
  assert.equal(
    (
      await staff.browser.post("/api/portal/admin/kyc", {
        ...payload,
        profileId: p.id,
        version: p.version,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await staff.browser.post("/api/portal/admin/kyc", {
        ...payload,
        profileId: q.id,
        version: q.version,
      })
    ).status,
    400,
  );
  assert.equal((await profile(b)).status, "SUBMITTED");
  assert.equal(await prisma.kycReview.count(), 1);
});
test("Bilingual client and review pages stay noindex, private and protected by nonce CSP", async () => {
  const a = await account(),
    staff = await account("staff@example.test", "ADMIN");
  for (const locale of ["en", "ar"]) {
    for (const [browser, path] of [
      [a.browser, `/${locale}/portal/kyc`],
      [staff.browser, `/${locale}/portal/admin/kyc`],
    ] as const) {
      const r = await browser.get(path);
      assert.equal(r.status, 200);
      assert.match(r.headers.get("x-robots-tag") || "", /noindex/);
      assert.match(r.headers.get("cache-control") || "", /no-store/);
      assert.match(r.headers.get("content-security-policy") || "", /nonce-/);
      assert.match(await r.text(), new RegExp(`lang="${locale}"`));
    }
  }
});
