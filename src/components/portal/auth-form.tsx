"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/content/site";
import { portalCopy } from "@/content/portal";
import { authRequest } from "./request";
export function AuthForm({
  locale,
  screen,
}: {
  locale: Locale;
  screen: string;
}) {
  const c = portalCopy[locale];
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [linkToken, setLinkToken] = useState("");
  const [setup, setSetup] = useState<{
    enrollment: boolean;
    secret?: string;
    qrCode?: string;
  } | null>(null);
  useEffect(() => {
    if (screen === "verify-email" || screen === "reset-password") {
      const token =
        new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
      queueMicrotask(() => {
        setLinkToken(token);
        if (!token) setNotice(c.errors.INVALID_TOKEN);
      });
      if (token)
        window.history.replaceState(null, "", window.location.pathname);
    }
    if (screen === "two-factor") {
      fetch("/api/portal/totp-setup", { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then(setSetup)
        .catch(() => setNotice(c.errors.SIGN_IN));
    }
  }, [screen, c.errors.SIGN_IN, c.errors.INVALID_TOKEN]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const form = new FormData(event.currentTarget);
    const action = screen === "two-factor" ? "confirm-totp" : screen;
    const data: Record<string, unknown> = {};
    for (const [key, value] of form) data[key] = value;
    if (screen === "sign-up") {
      data.locale = locale;
      data.consent = form.get("consent") === "on";
    }
    if (screen === "forgot-password" || screen === "resend-verification")
      data.locale = locale;
    if (screen === "verify-email" || screen === "reset-password")
      data.token = linkToken;
    try {
      const result = await authRequest(action, data);
      if (!result.ok) {
        setNotice(
          c.errors[result.error as keyof typeof c.errors] ||
            c.errors.UNAVAILABLE,
        );
        return;
      }
      if (result.message === "TOTP_REQUIRED") {
        router.push(`/${locale}/auth/two-factor`);
        return;
      }
      if (result.message === "SIGNED_IN") {
        router.push(`/${locale}/portal/security`);
        router.refresh();
        return;
      }
      setNotice(c.messages[result.message as keyof typeof c.messages] || "");
    } catch {
      setNotice(c.errors.UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }
  const showEmail = [
    "sign-in",
    "sign-up",
    "forgot-password",
    "resend-verification",
  ].includes(screen);
  const showPassword = ["sign-in", "sign-up", "reset-password"].includes(
    screen,
  );
  return (
    <form className="contact-form portal-form" onSubmit={submit}>
      {screen === "sign-up" && (
        <label>
          {c.name}
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
          />
        </label>
      )}
      {showEmail && (
        <label>
          {c.email}
          <input
            name="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            required
            maxLength={254}
          />
        </label>
      )}
      {showPassword && (
        <label>
          {screen === "reset-password" ? c.newPassword : c.password}
          <input
            name="password"
            type="password"
            autoComplete={
              screen === "sign-in" ? "current-password" : "new-password"
            }
            required
            minLength={screen === "sign-in" ? 1 : 12}
            maxLength={128}
          />
        </label>
      )}
      {showPassword && screen !== "sign-in" && (
        <p className="form-note">{c.passwordHelp}</p>
      )}
      {screen === "sign-up" && (
        <label className="checkbox-label">
          <input name="consent" type="checkbox" required />
          <span>
            {c.consent}{" "}
            <Link href={`/${locale}/legal/privacy`}>{c.privacy}</Link>
          </span>
        </label>
      )}
      {screen === "two-factor" && (
        <>
          {setup?.enrollment && (
            <div className="totp-setup">
              <h2>{c.setup}</h2>
              <p>{c.setupHelp}</p>
              {setup.qrCode && (
                <Image
                  src={setup.qrCode}
                  width={220}
                  height={220}
                  alt={c.setup}
                  unoptimized
                />
              )}
              <p>{c.secret}</p>
              <code dir="ltr">{setup.secret}</code>
            </div>
          )}
          <label>
            {c.code}
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              dir="ltr"
              required
            />
          </label>
          <p className="form-note">{c.totpHelp}</p>
        </>
      )}
      <button
        className="button"
        disabled={
          busy ||
          ((screen === "verify-email" || screen === "reset-password") &&
            !linkToken)
        }
      >
        {busy
          ? c.working
          : screen === "verify-email"
            ? c.verify
            : screen === "reset-password"
              ? c.reset
              : c.submit}
      </button>
      <p className="form-status" role="status">
        {notice}
      </p>
      <div className="portal-form-links">
        {screen === "sign-in" ? (
          <>
            <Link href={`/${locale}/auth/forgot-password`}>{c.forgot}</Link>
            <Link href={`/${locale}/auth/sign-up`}>{c.signUp}</Link>
          </>
        ) : (
          <Link href={`/${locale}/auth/sign-in`}>{c.signIn}</Link>
        )}
        <Link href={`/${locale}/auth/resend-verification`}>{c.resend}</Link>
      </div>
    </form>
  );
}
