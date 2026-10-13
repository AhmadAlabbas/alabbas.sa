"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { portalCopy } from "@/content/portal";
import type { Locale } from "@/content/site";
import { authRequest } from "./request";
type SecurityData = {
  account: { name: string; email: string; status: string };
  currentSessionId: string;
  sessions: { id: string; createdAt: string; userAgent: string }[];
  history: {
    id: string;
    action: string;
    createdAt: string;
    userAgent: string;
  }[];
  requests: { id: string; kind: string; status: string; createdAt: string }[];
};
export function AccountSecurity({ locale }: { locale: Locale }) {
  const c = portalCopy[locale];
  const router = useRouter();
  const [data, setData] = useState<SecurityData | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch("/api/portal/security", { cache: "no-store" });
    if (r.status === 401) {
      router.replace(`/${locale}/auth/sign-in`);
      return;
    }
    if (!r.ok) throw new Error();
    setData(await r.json());
  }, [locale, router]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/portal/security", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace(`/${locale}/auth/sign-in`);
          return null;
        }
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((result) => {
        if (result) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setNotice(c.errors.UNAVAILABLE);
      });
    return () => controller.abort();
  }, [locale, router, c.errors.UNAVAILABLE]);
  async function action(name: string, payload: unknown) {
    setBusy(true);
    setNotice("");
    try {
      const r = await authRequest(name, payload);
      if (!r.ok) {
        setNotice(
          c.errors[r.error as keyof typeof c.errors] || c.errors.UNAVAILABLE,
        );
        return;
      }
      if (
        ["sign-out", "change-password"].includes(name) ||
        (name === "revoke-session" &&
          (payload as { sessionId: string }).sessionId ===
            data?.currentSessionId)
      ) {
        router.replace(`/${locale}/auth/sign-in`);
        router.refresh();
        return;
      }
      setNotice(c.messages[r.message as keyof typeof c.messages] || "");
      await load();
    } catch {
      setNotice(c.errors.UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }
  function submit(name: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void action(name, Object.fromEntries(new FormData(event.currentTarget)));
  }
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
      calendar: "gregory",
    }).format(new Date(value));
  if (!data) return <p role="status">{notice || c.loading}</p>;
  return (
    <div className="portal-security">
      <div className="portal-account-card">
        <h2>{c.account}</h2>
        <p>{data.account.name}</p>
        <p dir="ltr">{data.account.email}</p>
        <p>{c.securityReady}</p>
        <p>
          {data.account.status === "PENDING" ? c.pending : data.account.status}
        </p>
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={() => action("sign-out", {})}
        >
          {c.signOut}
        </button>
      </div>
      <section>
        <h2>{c.sessions}</h2>
        <div className="portal-records">
          {data.sessions.map((s) => (
            <div key={s.id}>
              <div>
                <p>{s.userAgent}</p>
                <small>
                  {date(s.createdAt)}
                  {s.id === data.currentSessionId
                    ? ` · ${c.currentSession}`
                    : ""}
                </small>
              </div>
              <button
                className="button button-secondary"
                disabled={busy}
                onClick={() => action("revoke-session", { sessionId: s.id })}
              >
                {c.revoke}
              </button>
            </div>
          ))}
        </div>
        <button
          className="underlined-link"
          disabled={busy}
          onClick={() => action("revoke-others", {})}
        >
          {c.revokeOthers}
        </button>
      </section>
      <section>
        <h2>{c.history}</h2>
        <div className="portal-records">
          {data.history.map((h) => (
            <div key={h.id}>
              <div>
                <p>{h.action === "LOGIN_SUCCESS" ? c.success : c.failed}</p>
                <small>
                  {date(h.createdAt)} · {h.userAgent}
                </small>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>{c.change}</h2>
        <form
          className="contact-form"
          onSubmit={(e) => submit("change-password", e)}
        >
          <label>
            {c.currentPassword}
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </label>
          <label>
            {c.newPassword}
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <p className="form-note">{c.passwordHelp}</p>
          <label>
            {c.code}
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              dir="ltr"
              maxLength={6}
              required
            />
          </label>
          <button className="button" disabled={busy}>
            {c.change}
          </button>
        </form>
      </section>
      <section>
        <h2>{c.rights}</h2>
        <p>{c.rightsHelp}</p>
        <form
          className="contact-form"
          onSubmit={(e) => submit("data-request", e)}
        >
          <label>
            {c.kind}
            <select name="kind">
              <option value="EXPORT">{c.export}</option>
              <option value="DELETION">{c.deletion}</option>
            </select>
          </label>
          <label>
            {c.currentPassword}
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </label>
          <label>
            {c.code}
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              dir="ltr"
              maxLength={6}
              required
            />
          </label>
          <button className="button" disabled={busy}>
            {c.request}
          </button>
        </form>
        <h3>{c.requests}</h3>
        {data.requests.length ? (
          data.requests.map((r) => (
            <p key={r.id}>
              {r.kind === "EXPORT" ? c.export : c.deletion} ·{" "}
              {date(r.createdAt)} ·{" "}
              {r.status === "PENDING" ? c.pending : r.status}
            </p>
          ))
        ) : (
          <p>{c.empty}</p>
        )}
      </section>
      <p className="form-status" role="status">
        {notice}
      </p>
    </div>
  );
}
