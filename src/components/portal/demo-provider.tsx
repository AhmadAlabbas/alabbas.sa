"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/content/site";
import { portalCopy } from "@/content/portal";
import {
  demoAccount,
  demoAction,
  demoSecurity,
  newDemoState,
} from "@/lib/portal-demo/model";
import { PortalRuntimeContext, type PortalRuntime } from "./runtime";
const demoAuthPath = (lang: Locale, screen: string) =>
  `/${lang}/demo/portal/${screen}`;
const demoSecurityPath = (lang: Locale) => `/${lang}/demo/portal/security`;

export function PortalDemoProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const ar = locale === "ar";
  const c = portalCopy[locale];
  const router = useRouter();
  const state = useRef(newDemoState());
  const [mail, setMail] = useState<"verify-email" | "reset-password" | null>(
    null,
  );
  const [resetNotice, setResetNotice] = useState(false);
  const runtime = useMemo<PortalRuntime>(
    () => ({
      demo: true,
      sampleInputs: demoAccount,
      authPath: demoAuthPath,
      securityPath: demoSecurityPath,
      get: async (path) =>
        Response.json(
          path.endsWith("totp-setup")
            ? { enrollment: false }
            : demoSecurity(state.current),
        ),
      request: async (action, data) => {
        const result = demoAction(state.current, action, data);
        if (
          result.ok &&
          ["sign-up", "forgot-password", "resend-verification"].includes(action)
        )
          setMail(
            action === "forgot-password" ? "reset-password" : "verify-email",
          );
        if (
          result.ok &&
          [
            "verify-email",
            "reset-password",
            "confirm-totp",
            "sign-out",
            "change-password",
          ].includes(action)
        )
          setMail(null);
        return result;
      },
      messages: {
        CHECK_EMAIL: ar
          ? "البريد التجريبي جاهز. افتح صندوق البريد التجريبي أسفل الصفحة."
          : "Your demo email is ready. Open the sample inbox below.",
        EMAIL_VERIFIED: ar
          ? "تمت محاكاة تأكيد البريد. يمكنك تجربة تسجيل الدخول."
          : "Email verification simulated. You can try signing in.",
        PASSWORD_UPDATED: ar
          ? "تمت محاكاة تغيير كلمة المرور وتسجيل الخروج."
          : "Password update and sign-out simulated.",
        REQUEST_RECORDED: ar
          ? "تمت إضافة طلب تجريبي. لم يُرسل أي طلب حقيقي."
          : "A sample request was added. No real request was submitted.",
      },
    }),
    [ar],
  );
  useEffect(() => {
    if (mail)
      document
        .getElementById("demo-inbox")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [mail]);
  return (
    <PortalRuntimeContext.Provider value={runtime}>
      <aside
        className="portal-demo-banner"
        aria-label={ar ? "عرض تجريبي" : "Demo notice"}
      >
        <div className="container">
          <p className="eyebrow">{ar ? "عرض تجريبي فقط" : "DEMO ONLY"}</p>
          <p>
            {ar
              ? "جرّب البوابة ببيانات وهمية ثابتة. لا تُنشأ حسابات حقيقية، ولا تُرسل رسائل أو طلبات، ولا تتم أي حركة أموال."
              : "Explore the portal with fixed sample data. No real accounts, emails, requests or money movement."}
          </p>
          <p>
            {ar ? "رمز المصادقة التجريبي:" : "Demo authenticator code:"}{" "}
            <strong dir="ltr">{demoAccount.code}</strong>
          </p>
          <nav
            className="portal-demo-nav"
            aria-label={ar ? "التنقل في العرض التجريبي" : "Demo navigation"}
          >
            <Link href={demoAuthPath(locale, "sign-in")}>{c.signIn}</Link>
            <Link href={demoAuthPath(locale, "sign-up")}>{c.signUp}</Link>
            <Link href={demoAuthPath(locale, "two-factor")}>{c.twoFactor}</Link>
            <Link href={demoSecurityPath(locale)}>{c.security}</Link>
            <button
              type="button"
              onClick={() => {
                state.current = newDemoState();
                setMail(null);
                setResetNotice(true);
                router.push(runtime.authPath(locale, "sign-in"));
                router.refresh();
              }}
            >
              {ar ? "إعادة بدء التجربة" : "Reset demo"}
            </button>
          </nav>
          {resetNotice && (
            <p role="status">
              {ar
                ? "أُعيدت البيانات التجريبية إلى حالتها الأولى."
                : "Sample data reset."}
            </p>
          )}
        </div>
      </aside>
      {children}
      {mail && (
        <aside
          className="container portal-demo-inbox"
          id="demo-inbox"
          aria-label={ar ? "صندوق البريد التجريبي" : "Sample inbox"}
        >
          <h2>{ar ? "صندوق البريد التجريبي" : "Sample inbox"}</h2>
          <p>
            {ar
              ? "هذه رسالة وهمية داخل العرض التجريبي. لم يُرسل بريد إلكتروني."
              : "This sample message stays inside the demo. No email was sent."}
          </p>
          <Link className="button" href={demoAuthPath(locale, mail)}>
            {mail === "verify-email" ? c.verify : c.reset}
          </Link>
        </aside>
      )}
    </PortalRuntimeContext.Provider>
  );
}
