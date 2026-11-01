"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Locale } from "@/content/site";

type ApplicationView = {
  kind: "INSTITUTION" | "GOVERNMENT";
  accountStatus: "PENDING" | "APPROVED" | "SUSPENDED";
  application: null | {
    status: "SUBMITTED" | "CHANGES_REQUESTED" | "VERIFIED" | "REJECTED";
    submittedAt: string;
  };
};
export function EntityApplicationForm({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const [view, setView] = useState<ApplicationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/portal/entity-application", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json() as Promise<ApplicationView>;
      })
      .then(setView)
      .catch((error) => { if (error.name !== "AbortError") setMessage(t("Unable to load account status.", "تعذر تحميل حالة الحساب.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [locale]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const csrfResponse = await fetch("/api/auth", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("UNAVAILABLE");
      const { csrfToken } = await csrfResponse.json();
      const response = await fetch("/api/portal/entity-application", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({
          legalName: data.get("legalName"),
          registrationReference: data.get("registrationReference"),
          jurisdiction: "SA",
          representativeTitle: data.get("representativeTitle"),
          authorityAttestation: data.get("authorityAttestation") === "on",
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error === "ALREADY_SUBMITTED"
          ? t("An application already exists for this account.", "يوجد طلب مسجل بالفعل لهذا الحساب.")
          : t("The application could not be submitted. Check your entries or contact support.", "تعذر إرسال الطلب. تحقق من البيانات أو تواصل مع الدعم."));
        return;
      }
      setMessage(t("Application received for independent compliance review. No investment permissions have been granted.", "تم استلام الطلب للمراجعة المستقلة من فريق الامتثال. لم تُمنح أي صلاحيات استثمار."));
      setView((previous) => previous ? {
        ...previous,
        application: { status: "SUBMITTED", submittedAt: new Date().toISOString() },
      } : previous);
    } catch {
      setMessage(t("Application service unavailable.", "خدمة تقديم الطلب غير متاحة."));
    } finally { setBusy(false); }
  }
  if (loading) return <p role="status">{t("Loading account application…", "جارٍ تحميل طلب الحساب…")}</p>;
  return <section className="container portal-form-container section">
    <h1>{t("Institutional onboarding", "تسجيل الجهات والمؤسسات")}</h1>
    <p>{t("This application collects preliminary details only. An independent review must verify the organization, authorized representatives, beneficial owners and legal mandate before any account approval.", "يجمع هذا الطلب بيانات أولية فقط. يجب التحقق المستقل من الجهة والمفوضين والملاك المستفيدين وصلاحيتها النظامية قبل أي موافقة على الحساب.")}</p>
    {message && <p role="status" className="form-status">{message}</p>}
    {view?.application ? <div className="portal-card">
      <h2>{t("Application received", "تم استلام الطلب")}</h2>
      <p>{t("Review status", "حالة المراجعة")}: <strong>{view.application.status}</strong></p>
      <p>{t("No live investing or order placement is enabled for this account.", "لا تتوفر عمليات الاستثمار أو تنفيذ أوامر حقيقية لهذا الحساب.")}</p>
    </div> : view ? <form className="contact-form portal-form" onSubmit={submit}>
      <label>{t("Registered legal entity name", "الاسم القانوني المسجل")}
        <input name="legalName" required minLength={3} maxLength={180} autoComplete="organization" />
      </label>
      <label>{view.kind === "GOVERNMENT" ? t("Official mandate / entity reference", "مرجع الجهة أو التفويض الرسمي") : t("Commercial registration reference", "رقم السجل التجاري")}
        <input name="registrationReference" required minLength={3} maxLength={80} />
      </label>
      <label>{t("Representative's job title", "الصفة الوظيفية لممثل الجهة")}
        <input name="representativeTitle" required minLength={2} maxLength={100} />
      </label>
      <label className="checkbox-label">
        <input type="checkbox" name="authorityAttestation" required />
        <span>{t("I state that I am authorized to submit an application for this organization. This statement is subject to independent verification.", "أقر بأنني مخول بتقديم طلب لهذه الجهة، مع خضوع هذا الإقرار للتحقق المستقل.")}</span>
      </label>
      <button type="submit" className="button" disabled={busy}>{busy ? t("Submitting…", "جارٍ الإرسال…") : t("Submit for review", "إرسال الطلب للمراجعة")}</button>
      <p className="form-note">{t("Do not upload identity documents or bank information here. Future document verification must use an approved secure provider.", "لا ترفع وثائق الهوية أو المعلومات المصرفية هنا. يجب أن يتم التحقق من الوثائق عبر مزود آمن ومعتمد لاحقاً.")}</p>
    </form> : <p>{t("This account is not eligible for institutional onboarding.", "هذا الحساب غير مؤهل لتسجيل الجهات.")}</p>}
  </section>;
}
