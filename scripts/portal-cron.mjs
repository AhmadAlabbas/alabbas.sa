// Short-lived scheduler entry point. Load secrets from a private .env or
// the hosting environment; never place the bearer token in a command or URL.
if (process.env.PORTAL_ENABLED !== "true") {
  throw new Error("Portal cron requires an enabled, configured deployment.");
}
const origin = new URL(process.env.SITE_URL || "");
const secret = process.env.PORTAL_CRON_SECRET || "";
if (
  origin.protocol !== "https:" ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash ||
  origin.username ||
  origin.password ||
  secret.length < 32
) {
  throw new Error("Portal cron configuration is incomplete.");
}
try {
  const response = await fetch(new URL("/api/portal/cron", origin), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    redirect: "error",
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error();
  const result = await response.json();
  console.log(
    `Portal maintenance completed: ${Number(result.sent) || 0} submitted, ${Number(result.failed) || 0} failed.`,
  );
} catch {
  console.error(
    "Portal maintenance failed; check configuration and delivery monitoring.",
  );
  process.exitCode = 1;
}
