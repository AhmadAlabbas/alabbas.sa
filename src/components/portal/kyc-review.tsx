"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/content/site";
import { kycCopy } from "@/content/kyc";
import { portalCopy } from "@/content/portal";
import type { KycData } from "@/lib/portal/kyc-validation";
import { kycDate, kycGroups } from "./kyc-form";
import { kycRequest } from "./kyc-request";
type Status = keyof typeof kycCopy.en.status;
type Queue = {
  canReview: boolean;
  hasMore: boolean;
  profiles: {
    id: string;
    status: Status;
    version: number;
    updatedAt: string;
  }[];
};
type Detail = {
  id: string;
  version: number;
  status: Status;
  submittedVersion: number;
  data: KycData;
  riskBand: keyof typeof kycCopy.en.bands;
  createdAt: string;
  consents: {
    kind: string;
    text: string;
    version: string;
    acceptedAt: string;
  }[];
  feedback: string | null;
};
export function KycReview({ locale, id }: { locale: Locale; id?: string }) {
  const c = kycCopy[locale],
    common = portalCopy[locale];
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [queue, setQueue] = useState<Queue | null>(null),
    [detail, setDetail] = useState<Detail | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const path =
    "/api/portal/admin/kyc" +
    (id ? `?id=${encodeURIComponent(id)}` : `?page=${page}`);
  useEffect(() => {
    const controller = new AbortController();
    fetch(path, { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (r.status === 401) {
          router.replace(`/${locale}/auth/sign-in`);
          return;
        }
        if (!r.ok) {
          const error = await r.json();
          setNotice(
            common.errors[error.error as keyof typeof common.errors] ||
              common.errors.UNAVAILABLE,
          );
          return;
        }
        const data = await r.json();
        if (id) setDetail(data);
        else setQueue(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setNotice(common.errors.UNAVAILABLE);
      });
    return () => controller.abort();
  }, [path, id, locale, router, common]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || busy) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      profileId: detail.id,
      version: detail.version,
      decision: form.get("decision"),
      reason: form.get("reason"),
      checksConfirmed: form.has("checksConfirmed"),
      code: form.get("code"),
    };
    setBusy(true);
    setNotice("");
    try {
      const result = await kycRequest("/api/portal/admin/kyc", payload);
      if (!result.ok) {
        setNotice(
          result.error === "CONFLICT"
            ? c.conflict
            : common.errors[result.error as keyof typeof common.errors] ||
                common.errors.UNAVAILABLE,
        );
        return;
      }
      const r = await fetch(path, { cache: "no-store" });
      if (!r.ok) throw new Error();
      setDetail(await r.json());
      setNotice(c.reviewed);
    } catch {
      setNotice(common.errors.UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="portal-security portal-kyc">
      <p>{c.accessHelp}</p>
      {!id && queue && (
        <div className="portal-records">
          {queue.profiles.length ? (
            queue.profiles.map((p) => (
              <div key={p.id}>
                <p>
                  {c.version}{" "}
                  <span className="portal-case-id" dir="ltr">
                    {p.id}
                  </span>
                  <br />
                  {c.status[p.status]} · {kycDate(p.updatedAt, locale)}
                </p>
                {queue.canReview && (
                  <Link
                    className="button button-secondary"
                    href={`/${locale}/portal/admin/kyc/${p.id}`}
                  >
                    {c.open}
                  </Link>
                )}
              </div>
            ))
          ) : (
            <p>{c.empty}</p>
          )}
        </div>
      )}
      {!id && queue && (
        <div className="portal-kyc-actions">
          {page > 0 && (
            <button
              className="button button-secondary"
              onClick={() => {
                setQueue(null);
                setPage((p) => p - 1);
              }}
            >
              {locale === "ar" ? "السابق" : "Previous"}
            </button>
          )}
          {queue.hasMore && (
            <button
              className="button button-secondary"
              onClick={() => {
                setQueue(null);
                setPage((p) => p + 1);
              }}
            >
              {locale === "ar" ? "التالي" : "Next"}
            </button>
          )}
        </div>
      )}
      {id && (
        <Link className="underlined-link" href={`/${locale}/portal/admin/kyc`}>
          {c.back}
        </Link>
      )}
      {detail && (
        <>
          <div className="portal-account-card">
            <h2>{c.status[detail.status]}</h2>
            <p>
              {c.submittedAt}: {kycDate(detail.createdAt, locale)}
            </p>
            <p>
              {c.riskBand}: {c.bands[detail.riskBand]}
            </p>
            <p className="form-note">{c.riskHelp}</p>
            {detail.feedback && (
              <p>
                {c.feedback}: {detail.feedback}
              </p>
            )}
          </div>
          {Object.entries(kycGroups).map(([group, fields]) => (
            <section key={group}>
              <h2>{c[group as keyof typeof kycGroups]}</h2>
              <dl className="portal-kyc-details">
                {fields.map((field) => {
                  const value = detail.data[field];
                  return (
                    <div key={field}>
                      <dt>{c.fields[field]}</dt>
                      <dd
                        dir={
                          ["idNumber", "dateOfBirth", "nationality"].includes(
                            field,
                          )
                            ? "ltr"
                            : undefined
                        }
                      >
                        {typeof value === "boolean"
                          ? c.options[value ? "YES" : "NO"]
                          : c.options[value as keyof typeof c.options] || value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
          <section>
            <h2>{c.consent}</h2>
            {detail.consents.map((consent) => (
              <article key={consent.kind}>
                <p>{consent.text}</p>
                <small>
                  {consent.version} · {kycDate(consent.acceptedAt, locale)}
                </small>
              </article>
            ))}
          </section>
          {detail.status === "SUBMITTED" && (
            <section>
              <form className="contact-form" onSubmit={submit}>
                <label>
                  {c.decision}
                  <select name="decision" defaultValue="CHANGES_REQUESTED">
                    <option value="CHANGES_REQUESTED">{c.changes}</option>
                    <option value="REJECTED">{c.reject}</option>
                    <option value="APPROVED">{c.approve}</option>
                  </select>
                </label>
                <label>
                  {c.reason}
                  <textarea
                    name="reason"
                    minLength={2}
                    maxLength={1000}
                    required
                  />
                </label>
                <label className="consent-check">
                  <input type="checkbox" name="checksConfirmed" />
                  {c.checks}
                </label>
                <label>
                  {c.code}
                  <input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    dir="ltr"
                    required
                  />
                </label>
                <button className="button" disabled={busy}>
                  {busy ? c.working : c.record}
                </button>
              </form>
            </section>
          )}
        </>
      )}
      <p className="form-status" role="status">
        {notice || (!queue && !detail ? c.loading : "")}
      </p>
    </div>
  );
}
