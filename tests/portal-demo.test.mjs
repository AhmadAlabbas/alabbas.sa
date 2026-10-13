import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../src/lib/portal-demo/model.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const { demoAccount, newDemoState, demoAction, demoSecurity } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
test("Demo registration ignores supplied personal details and creates no real account", () => {
  const state = newDemoState();
  assert.deepEqual(
    demoAction(state, "sign-up", {
      name: "PRIVATE VALUE",
      email: "private@example.org",
      password: "PRIVATE PASSWORD",
      role: "ADMIN",
    }),
    { ok: true, message: "CHECK_EMAIL" },
  );
  const result = JSON.stringify({ state, security: demoSecurity(state) });
  assert.ok(!result.includes("PRIVATE"));
  assert.ok(!result.includes("private@example.org"));
  assert.equal(demoSecurity(state).account.email, demoAccount.email);
});
test("Demo code validation leads to sample sessions and login history", () => {
  const state = newDemoState();
  assert.equal(demoAction(state, "confirm-totp", { code: "000000" }).ok, false);
  assert.equal(state.sessions.length, 0);
  assert.equal(
    demoAction(state, "confirm-totp", { code: demoAccount.code }).message,
    "SIGNED_IN",
  );
  assert.equal(state.sessions.length, 2);
  assert.equal(state.history[0].action, "LOGIN_SUCCESS");
});
test("Demo session controls revoke the chosen sample session", () => {
  const state = newDemoState();
  demoAction(state, "confirm-totp", { code: demoAccount.code });
  assert.equal(
    demoAction(state, "revoke-session", { sessionId: "unknown" }).ok,
    false,
  );
  demoAction(state, "revoke-session", { sessionId: "sample-other" });
  assert.deepEqual(
    state.sessions.map((s) => s.id),
    ["sample-current"],
  );
  demoAction(state, "sign-out", {});
  assert.equal(state.sessions.length, 0);
});
test("Sample data requests require the demo code and store only request metadata", () => {
  const state = newDemoState();
  assert.equal(
    demoAction(state, "data-request", { kind: "EXPORT", code: "000000" }).ok,
    false,
  );
  assert.equal(
    demoAction(state, "data-request", { kind: "ADMIN", code: demoAccount.code })
      .ok,
    false,
  );
  assert.equal(
    demoAction(state, "data-request", {
      kind: "EXPORT",
      code: demoAccount.code,
      currentPassword: "PRIVATE PASSWORD",
    }).ok,
    true,
  );
  assert.equal(state.requests[0].kind, "EXPORT");
  assert.ok(!JSON.stringify(state.requests).includes("PRIVATE PASSWORD"));
});
test("Password update, reset and restarting the demo affect only browser sample state", () => {
  const state = newDemoState();
  demoAction(state, "confirm-totp", { code: demoAccount.code });
  assert.equal(
    demoAction(state, "change-password", { code: "000000" }).ok,
    false,
  );
  assert.equal(state.sessions.length, 2);
  assert.equal(
    demoAction(state, "change-password", { code: demoAccount.code }).message,
    "PASSWORD_UPDATED",
  );
  assert.equal(state.sessions.length, 0);
  assert.equal(newDemoState().requests.length, 0);
  assert.equal(newDemoState().password, demoAccount.password);
});
test("Unknown simulation actions fail without changing sample data", () => {
  const state = newDemoState();
  assert.deepEqual(demoAction(state, "approve-kyc", {}), {
    ok: false,
    error: "NOT_FOUND",
  });
  assert.deepEqual(state, newDemoState());
});
test("All online demo views are localized and noindex, while real auth and portal APIs remain 404", async () => {
  for (const lang of ["en", "ar"]) {
    for (const screen of [
      "",
      "sign-in",
      "sign-up",
      "two-factor",
      "verify-email",
      "forgot-password",
      "reset-password",
      "resend-verification",
      "security",
    ]) {
      const r = await fetch(
        `${base}/${lang}/demo/portal${screen ? "/" + screen : ""}`,
      );
      assert.equal(r.status, 200);
      assert.match(r.headers.get("x-robots-tag"), /noindex/);
      const html = await r.text();
      assert.match(html, new RegExp(`lang="${lang}"`));
      assert.match(html, /noindex/);
      assert.match(html, lang === "ar" ? /عرض تجريبي فقط/ : /DEMO ONLY/);
    }
    for (const path of [
      `/${lang}/auth/sign-in`,
      `/${lang}/portal/security`,
      `/${lang}/demo/portal/unknown`,
    ]) {
      assert.equal(
        (await fetch(base + path, { redirect: "manual" })).status,
        404,
      );
    }
  }
  for (const path of [
    "/api/auth",
    "/api/auth/sign-up",
    "/api/portal/security",
    "/api/portal/cron",
  ])
    for (const method of ["GET", "POST"])
      assert.equal((await fetch(base + path, { method })).status, 404);
  const sitemap = await (await fetch(base + "/sitemap.xml")).text();
  assert.ok(!sitemap.includes("demo/portal"));
});
