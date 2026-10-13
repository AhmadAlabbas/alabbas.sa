/** Browser-only sample data. No production auth, database or mail imports. */
export const demoAccount = {
  name: "Preview client",
  email: "preview@example.test",
  password: "Demo-passphrase-2026!",
  newPassword: "Updated-demo-passphrase-2026!",
  code: "123456",
};
export type DemoSession = { id: string; createdAt: string; userAgent: string };
export type DemoHistory = DemoSession & { action: string };
export type DemoRequest = {
  id: string;
  kind: "EXPORT" | "DELETION";
  status: "PENDING";
  createdAt: string;
};
export function newDemoState() {
  return {
    password: demoAccount.password,
    sequence: 0,
    sessions: [] as DemoSession[],
    history: [] as DemoHistory[],
    requests: [] as DemoRequest[],
  };
}
export type DemoState = ReturnType<typeof newDemoState>;
export function demoSecurity(state: DemoState) {
  if (!state.sessions.length)
    state.sessions.push({
      id: "sample-current",
      createdAt: new Date().toISOString(),
      userAgent: "Current demo browser",
    });
  return {
    account: {
      name: demoAccount.name,
      email: demoAccount.email,
      status: "PENDING",
    },
    currentSessionId: "sample-current",
    sessions: state.sessions,
    history: state.history,
    requests: state.requests,
  };
}
export function demoAction(state: DemoState, action: string, input: unknown) {
  const data =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const success = (message: string) => ({ ok: true, message });
  const invalid = (error: string) => ({ ok: false, error });
  if (["sign-up", "forgot-password", "resend-verification"].includes(action))
    return success("CHECK_EMAIL");
  if (action === "verify-email") return success("EMAIL_VERIFIED");
  if (action === "sign-in") return success("TOTP_REQUIRED");
  if (action === "confirm-totp") {
    if (data.code !== demoAccount.code) return invalid("TOTP_INVALID");
    const createdAt = new Date().toISOString();
    state.sessions = [
      { id: "sample-current", createdAt, userAgent: "Current demo browser" },
      { id: "sample-other", createdAt, userAgent: "Other sample browser" },
    ];
    state.history.unshift({
      id: `sample-event-${++state.sequence}`,
      action: "LOGIN_SUCCESS",
      createdAt,
      userAgent: "Current demo browser",
    });
    return success("SIGNED_IN");
  }
  if (action === "reset-password" || action === "change-password") {
    if (action === "change-password" && data.code !== demoAccount.code)
      return invalid("TOTP_INVALID");
    state.password = demoAccount.newPassword;
    state.sessions = [];
    return success("PASSWORD_UPDATED");
  }
  if (action === "sign-out") {
    state.sessions = [];
    return success("SIGNED_OUT");
  }
  if (action === "revoke-session") {
    if (!state.sessions.some((s) => s.id === data.sessionId))
      return invalid("NOT_FOUND");
    state.sessions = state.sessions.filter((s) => s.id !== data.sessionId);
    return success("SESSION_REVOKED");
  }
  if (action === "revoke-others") {
    state.sessions = state.sessions.filter((s) => s.id === "sample-current");
    return success("SESSION_REVOKED");
  }
  if (action === "data-request") {
    if (data.code !== demoAccount.code) return invalid("TOTP_INVALID");
    if (data.kind !== "EXPORT" && data.kind !== "DELETION")
      return invalid("INVALID");
    state.requests.unshift({
      id: `sample-request-${++state.sequence}`,
      kind: data.kind,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });
    return success("REQUEST_RECORDED");
  }
  return invalid("NOT_FOUND");
}
