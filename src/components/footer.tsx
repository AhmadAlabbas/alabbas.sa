import Link from "next/link";
import { copy, capabilities, type Locale, text } from "@/content/site";
import { CookiePreferences } from "./consent";
import { Brand } from "./brand";
import { SocialIcons } from "./social-icons";
export function Footer({ locale }: { locale: Locale }) {
  const c = copy[locale];
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="wordmark" href={`/${locale}`}>
              <Brand dark />
            </Link>
            <p>{c.footerText}</p>
            <p>{c.office}</p>
            <small>{c.officeNote}</small>
            <SocialIcons locale={locale} />
          </div>
          <div>
            <h2>{c.company}</h2>
            {[
              ["about", c.about],
              ["clients", c.clients],
              ["insights", c.insights],
              ["careers", c.careers],
              ["contact", c.contact],
            ].map(([p, t]) => (
              <Link key={p} href={`/${locale}/${p}`}>
                {t}
              </Link>
            ))}
          </div>
          <div>
            <h2>{c.investment}</h2>
            {capabilities.map((item) => (
              <Link key={item.slug} href={`/${locale}/solutions/${item.slug}`}>
                {text(item, locale)}
              </Link>
            ))}
          </div>
          <div>
            <h2>{c.legal}</h2>
            {[
              ["privacy", c.privacy],
              ["terms", c.terms],
              ["cookies", c.cookies],
              ["disclosures", c.disclosures],
            ].map(([p, t]) => (
              <Link key={p} href={`/${locale}/legal/${p}`}>
                {t}
              </Link>
            ))}
            <CookiePreferences locale={locale} />
          </div>
        </div>
        <div className="disclaimer">
          <p>{c.risk}</p>
          <p>{c.regulatory}</p>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getUTCFullYear()} {c.copyright}
          </span>
          <span>{c.review}</span>
        </div>
      </div>
    </footer>
  );
}
