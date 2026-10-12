import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const paths = [
  "",
  "about",
  "solutions",
  "solutions/real-estate",
  "solutions/private-equity",
  "solutions/public-markets",
  "solutions/infrastructure",
  "solutions/alternatives",
  "clients",
  "clients/individuals",
  "clients/institutions",
  "clients/governments",
  "insights",
  "insights/real-estate",
  "insights/patient-capital",
  "insights/risk",
  "careers",
  "contact",
  "legal/privacy",
  "legal/terms",
  "legal/cookies",
  "legal/disclosures",
];
test("All bilingual pages return localized HTML and page-specific metadata", async () => {
  for (const locale of ["en", "ar"])
    for (const path of paths) {
      const suffix = path ? `/${path}` : "";
      const r = await fetch(`${base}/${locale}${suffix}`);
      assert.equal(r.status, 200, `${locale}/${path}`);
      const html = await r.text();
      assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`));
      assert.match(
        html,
        new RegExp(`dir="${locale === "ar" ? "rtl" : "ltr"}"`),
      );
      assert.match(html, /<h1[\s>]/);
      assert.ok(html.includes(`https://alabbas.sa/${locale}${suffix}`));
      assert.match(html, /hrefLang="ar"/);
      assert.match(html, /application\/ld\+json/);
    }
});
test("Unknown routes return 404 and root redirects to English", async () => {
  assert.equal((await fetch(`${base}/en/not-a-page`)).status, 404);
  assert.equal((await fetch(`${base}/fr`)).status, 404);
  const r = await fetch(base, { redirect: "manual" });
  assert.equal(r.status, 307);
  assert.equal(r.headers.get("location"), "/en");
});
test("SEO endpoints contain bilingual URLs and exclude API routes from crawlers", async () => {
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  assert.equal((sitemap.match(/<loc>/g) || []).length, 44);
  assert.match(sitemap, /hreflang="ar"/);
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  assert.match(robots, /Disallow: \/api\//);
});
test("Security headers protect HTML responses", async () => {
  const r = await fetch(`${base}/en`);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  assert.ok(
    r.headers
      .get("content-security-policy")
      ?.includes("frame-ancestors 'none'"),
  );
});
const payload = {
  name: "Test User",
  email: "test@example.com",
  organization: "Example",
  clientType: "individuals",
  message: "A test enquiry about investment objectives.",
  consent: true,
  locale: "en",
  website: "",
};
let ip = 10;
function post(data, headers = {}) {
  return fetch(`${base}/api/contact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `192.0.2.${ip++}`,
      ...headers,
    },
    body: typeof data === "string" ? data : JSON.stringify(data),
  });
}
test("Contact rejects invalid data, malformed JSON and cross-origin requests", async () => {
  assert.equal((await post({ ...payload, email: "invalid" })).status, 400);
  assert.equal((await post({ ...payload, consent: false })).status, 400);
  assert.equal((await post("{invalid")).status, 400);
  assert.equal(
    (await post(payload, { Origin: "https://evil.example" })).status,
    403,
  );
  assert.equal(
    (await post(payload, { "Content-Type": "text/plain" })).status,
    415,
  );
  assert.equal(
    (await post({ ...payload, message: "x".repeat(22000) })).status,
    413,
  );
});
test("Contact traps bots and reports missing delivery integration honestly", async () => {
  assert.equal(
    (await post({ ...payload, website: "https://bot.example" })).status,
    200,
  );
  assert.equal((await post(payload)).status, 503);
  assert.equal((await post(payload, { Origin: base })).status, 503);
});
test("Contact throttles repeated submissions", async () => {
  const headers = { "x-forwarded-for": "192.0.2.200" };
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await post({ ...payload, website: "bot" }, headers)).status,
      200,
    );
  const r = await post(payload, headers);
  assert.equal(r.status, 429);
  assert.ok(r.headers.get("retry-after"));
});
