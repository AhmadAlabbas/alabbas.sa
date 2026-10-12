"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { copy, type Locale } from "@/content/site";
const key = "alabbas-cookie-consent";
let sessionChoice = false;
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("consent-changed", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("consent-changed", listener);
  };
}
function needsChoice() {
  try {
    return !localStorage.getItem(key) && !sessionChoice;
  } catch {
    return !sessionChoice;
  }
}
export function Consent({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const missing = useSyncExternalStore(subscribe, needsChoice, () => false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener("cookie-preferences", reopen);
    return () => window.removeEventListener("cookie-preferences", reopen);
  }, []);
  function choose(value: string) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          choice: value,
          date: new Date().toISOString(),
        }),
      );
    } catch {
      /* Browsing remains available without storage. */
    }
    sessionChoice = true;
    window.dispatchEvent(new Event("consent-changed"));
    setOpen(false);
  }
  if (!missing && !open) return null;
  return (
    <section className="cookie-banner" aria-label={c.cookieTitle}>
      <div>
        <h2>{c.cookieTitle}</h2>
        <p>{c.cookieText}</p>
      </div>
      <div className="cookie-actions">
        <button
          onClick={() => choose("essential")}
          className="button button-secondary"
        >
          {c.essential}
        </button>
        <button onClick={() => choose("optional")} className="button">
          {c.accept}
        </button>
      </div>
    </section>
  );
}
export function CookiePreferences({ locale }: { locale: Locale }) {
  return (
    <button
      className="text-button"
      onClick={() => window.dispatchEvent(new Event("cookie-preferences"))}
    >
      {copy[locale].preferences}
    </button>
  );
}
