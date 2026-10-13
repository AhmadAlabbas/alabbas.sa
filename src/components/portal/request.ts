export async function authRequest(action: string, data: unknown) {
  const csrfResponse = await fetch("/api/auth", { cache: "no-store" });
  if (!csrfResponse.ok) return { ok: false, error: "UNAVAILABLE" };
  const { csrfToken } = await csrfResponse.json();
  const response = await fetch(`/api/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  return { ...result, ok: response.ok };
}
