"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Arrow } from "./ui";
import { audiences, copy, text, type Locale } from "@/content/site";
export function ContactForm({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const query = useSearchParams();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(data),
          consent: data.get("consent") === "on",
          locale,
        }),
      });
      if (response.ok) {
        setStatus(c.success);
        form.reset();
      } else {
        setStatus(response.status === 503 ? c.unavailable : c.error);
      }
    } catch {
      setStatus(c.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form key={query.toString()} onSubmit={submit} className="contact-form">
      <h2>{c.formTitle}</h2>
      <p className="form-note">* {c.required}</p>
      <div className="form-grid">
        <label>
          {c.name} *
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
          />
        </label>
        <label>
          {c.email} *
          <input
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
      </div>
      <label>
        {c.organization}
        <input
          name="organization"
          autoComplete="organization"
          maxLength={160}
        />
      </label>
      <label>
        {c.clientType} *
        <select
          name="clientType"
          defaultValue={
            query.get("type") === "investor-relations"
              ? "investor-relations"
              : query.get("type") === "careers"
                ? "careers"
                : ""
          }
          required
        >
          <option value="" disabled>
            {c.select}
          </option>
          {audiences.map((a) => (
            <option key={a.slug} value={a.slug}>
              {text(a, locale)}
            </option>
          ))}
          <option value="investor-relations">{c.investor}</option>
          <option value="careers">{c.careers}</option>
          <option value="general">
            {locale === "en" ? "General enquiry" : "استفسار عام"}
          </option>
        </select>
      </label>
      <label>
        {c.message} *
        <textarea
          name="message"
          rows={5}
          required
          minLength={20}
          maxLength={5000}
        />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" name="consent" required />
        <span>
          {c.consent} <Link href={`/${locale}/legal/privacy`}>{c.privacy}</Link>
        </span>
      </label>
      <p className="form-note">{c.formPrivacy}</p>
      <button className="button" type="submit" disabled={busy}>
        {busy ? c.sending : c.submit}
        <Arrow diagonal />
      </button>
      <p role="status" className="form-status">
        {status}
      </p>
    </form>
  );
}
