export async function kycRequest(path: string, data: unknown) {
  const csrf = await fetch("/api/auth", { cache: "no-store" });
  if (!csrf.ok) return { ok: false, error: "SIGN_IN" };
  const { csrfToken } = await csrf.json();
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(data),
  });
  return { ...(await response.json()), ok: response.ok };
}
