import Link from "next/link";
import { type ReactNode } from "react";
export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      className="arrow"
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d={diagonal ? "M5 19 19 5M5 5h14v14" : "M3 12h17m-7-7 7 7-7 7"} />
    </svg>
  );
}
export function Button({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={`button ${secondary ? "button-secondary" : ""}`}
      href={href}
    >
      {children}
      <Arrow />
    </Link>
  );
}
export function Heading({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{label}</p>
      <h2>{title}</h2>
      {description && <p className="lede">{description}</p>}
    </div>
  );
}
export function PageHero({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="page-hero">
      <div className="container">
        <p className="eyebrow gold">{label}</p>
        <h1>{title}</h1>
        {description && <p className="lede">{description}</p>}
      </div>
      <span className="hero-line" aria-hidden="true" />
    </section>
  );
}
