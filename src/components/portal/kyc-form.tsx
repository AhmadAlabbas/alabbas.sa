"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/content/site";
import { kycCopy, kycConsents, kycConsentVersion } from "@/content/kyc";
import { portalCopy } from "@/content/portal";
import type { KycData } from "@/lib/portal/kyc-validation";
import { kycRequest } from "./kyc-request";
export const kycGroups = {
  personal: [
    "legalName",
    "dateOfBirth",
    "nationality",
    "city",
    "occupation",
    "idKind",
    "idNumber",
  ],
  funds: [
    "sourceOfFunds",
    "sourceDetails",
    "annualIncome",
    "investableAssets",
    "politicallyExposed",
  ],
  risk: ["objective", "horizon", "experience", "lossTolerance"],
} as const;
const choices: Partial<Record<keyof KycData, string[]>> = {
  idKind: ["NATIONAL_ID", "IQAMA"],
  sourceOfFunds: ["SALARY", "BUSINESS", "SAVINGS", "INHERITANCE", "OTHER"],
  annualIncome: ["UNDER_100K", "100K_300K", "300K_1M", "OVER_1M"],
  investableAssets: ["UNDER_100K", "100K_500K", "500K_2M", "OVER_2M"],
  politicallyExposed: ["NO", "YES"],
  objective: ["PRESERVATION", "INCOME", "GROWTH"],
  horizon: ["UNDER_1Y", "1_3Y", "OVER_3Y"],
  experience: ["NONE", "LIMITED", "EXPERIENCED"],
  lossTolerance: ["LOW", "MEDIUM", "HIGH"],
};
export function kycDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
    calendar: "gregory",
  }).format(new Date(value));
}
type KycRecord = {
  version: number;
  status: keyof typeof kycCopy.en.status;
  data: KycData | null;
  feedback: string | null;
  history: {
    version: number;
    createdAt: string;
    riskBand: keyof typeof kycCopy.en.bands;
    consents: {
      kind: string;
      version: string;
      text: string;
      acceptedAt: string;
    }[];
  }[];
};
export function KycForm({ locale }: { locale: Locale }) {
  const c = kycCopy[locale],
    common = portalCopy[locale];
  const router = useRouter();
  const [record, setRecord] = useState<KycRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/portal/kyc", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (r.status === 401) {
          router.replace(`/${locale}/auth/sign-in`);
          return;
        }
        if (!r.ok) throw new Error();
        setRecord(await r.json());
      })
      .catch(() => {
        if (!controller.signal.aborted) setNotice(common.errors.UNAVAILABLE);
      });
    return () => controller.abort();
  }, [locale, router, common.errors.UNAVAILABLE]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || busy) return;
    const form = new FormData(event.currentTarget);
    const sending =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "submit";
    const data: Record<string, unknown> = Object.fromEntries(
      Object.values(kycGroups)
        .flat()
        .map((field) => [field, form.get(field)]),
    );
    data.politicallyExposed = form.get("politicallyExposed") === "YES";
    data.residenceCountry = "SA";
    const payload = {
      version: record.version,
      data,
      ...(sending
        ? {
            locale,
            consentVersion: kycConsentVersion,
            privacyConsent: form.has("privacyConsent"),
            accuracyConsent: form.has("accuracyConsent"),
          }
        : {}),
    };
    setBusy(true);
    setNotice("");
    try {
      const result = await kycRequest(
        sending ? "/api/portal/kyc/submit" : "/api/portal/kyc",
        payload,
      );
      if (!result.ok) {
        if (result.error === "SIGN_IN")
          router.replace(`/${locale}/auth/sign-in`);
        setNotice(
          result.error === "CONFLICT"
            ? c.conflict
            : result.error === "INVALID"
              ? c.invalid
              : common.errors[result.error as keyof typeof common.errors] ||
                common.errors.UNAVAILABLE,
        );
        return;
      }
      const response = await fetch("/api/portal/kyc", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setRecord(await response.json());
      setNotice(sending ? c.submitted : c.saved);
    } catch {
      setNotice(common.errors.UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }
  if (!record) return <p role="status">{notice || c.loading}</p>;
  const editable = ["DRAFT", "CHANGES_REQUESTED"].includes(record.status);
  return (
    <div className="portal-security portal-kyc">
      <div className="portal-account-card">
        <h2>{c.status[record.status]}</h2>
        <p>{c.help}</p>
        {record.feedback && (
          <p>
            <strong>{c.feedback}: </strong>
            {record.feedback}
          </p>
        )}
      </div>
      <form key={record.version} className="contact-form" onSubmit={submit}>
        {Object.entries(kycGroups).map(([group, fields]) => (
          <fieldset key={group} disabled={!editable || busy}>
            <legend>{c[group as keyof typeof kycGroups]}</legend>
            {group === "risk" && <p className="form-note">{c.riskHelp}</p>}
            {fields.map((field) => {
              const value =
                field === "politicallyExposed"
                  ? record.data?.politicallyExposed
                    ? "YES"
                    : "NO"
                  : record.data?.[field];
              return (
                <label key={field}>
                  {c.fields[field]}
                  {choices[field] ? (
                    <select
                      name={field}
                      defaultValue={String(value ?? choices[field]![0])}
                    >
                      {choices[field]!.map((option) => (
                        <option key={option} value={option}>
                          {c.options[option as keyof typeof c.options]}
                        </option>
                      ))}
                    </select>
                  ) : field === "sourceDetails" ? (
                    <textarea
                      name={field}
                      defaultValue={String(value ?? "")}
                      minLength={2}
                      maxLength={500}
                      required
                    />
                  ) : (
                    <input
                      name={field}
                      type={field === "dateOfBirth" ? "date" : "text"}
                      defaultValue={String(
                        value ?? (field === "nationality" ? "SA" : ""),
                      )}
                      required
                      minLength={
                        field === "idNumber"
                          ? 10
                          : field === "nationality"
                            ? 2
                            : 2
                      }
                      maxLength={
                        field === "idNumber"
                          ? 10
                          : field === "nationality"
                            ? 2
                            : field === "legalName"
                              ? 120
                              : field === "occupation"
                                ? 100
                                : 80
                      }
                      pattern={
                        field === "idNumber"
                          ? "[12][0-9]{9}"
                          : field === "nationality"
                            ? "[A-Z]{2}"
                            : undefined
                      }
                      inputMode={field === "idNumber" ? "numeric" : undefined}
                      dir={
                        ["nationality", "idNumber", "dateOfBirth"].includes(
                          field,
                        )
                          ? "ltr"
                          : undefined
                      }
                      autoComplete="off"
                    />
                  )}
                </label>
              );
            })}
          </fieldset>
        ))}
        {editable && (
          <fieldset disabled={busy}>
            <legend>{c.consent}</legend>
            <Link
              className="underlined-link"
              href={`/${locale}/legal/privacy`}
              target="_blank"
              rel="noreferrer"
            >
              {c.privacy}
            </Link>
            <label className="consent-check">
              <input type="checkbox" name="privacyConsent" />
              {kycConsents[locale].privacy}
            </label>
            <label className="consent-check">
              <input type="checkbox" name="accuracyConsent" />
              {kycConsents[locale].accuracy}
            </label>
            <div className="portal-kyc-actions">
              <button
                className="button button-secondary"
                name="intent"
                value="save"
                disabled={busy}
              >
                {c.save}
              </button>
              <button
                className="button"
                name="intent"
                value="submit"
                disabled={busy}
              >
                {busy ? c.working : c.submit}
              </button>
            </div>
          </fieldset>
        )}
      </form>
      <p className="form-status" role="status">
        {notice}
      </p>
      <section>
        <h2>{c.history}</h2>
        {record.history.length ? (
          record.history.map((h) => (
            <article key={h.version} className="portal-account-card">
              <h3>
                {c.version} {h.version}
              </h3>
              <p>
                {kycDate(h.createdAt, locale)} · {c.bands[h.riskBand]}
              </p>
              {h.consents.map((consent) => (
                <div key={consent.kind}>
                  <p>{consent.text}</p>
                  <small>
                    {consent.version} · {kycDate(consent.acceptedAt, locale)}
                  </small>
                </div>
              ))}
            </article>
          ))
        ) : (
          <p>{c.empty}</p>
        )}
      </section>
    </div>
  );
}
