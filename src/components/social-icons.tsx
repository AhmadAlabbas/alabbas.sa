import { socialProfiles, type SocialPlatform } from "@/content/social";
import type { Locale } from "@/content/site";

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {platform === "linkedin" && (
        <>
          <path d="M6 10v10M11 20V10m0 4a4 4 0 0 1 8 0v6" />
          <circle cx="6" cy="5" r="1" fill="currentColor" stroke="none" />
        </>
      )}
      {platform === "x" && (
        <>
          <path d="M4 3h4l12 18h-4L4 3Z" />
          <path d="m20 3-6.5 7.5M10.5 13.5 4 21" />
        </>
      )}
      {platform === "instagram" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle
            cx="17.5"
            cy="6.5"
            r="0.8"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}
    </svg>
  );
}

export function SocialIcons({ locale }: { locale: Locale }) {
  return (
    <div
      className="social-icons"
      role="group"
      aria-label={locale === "en" ? "Social media" : "التواصل الاجتماعي"}
    >
      {socialProfiles.map((profile) =>
        profile.url ? (
          <a
            key={profile.platform}
            className="social-icon"
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
              locale === "en"
                ? `Alabbas on ${profile.name} (opens in a new tab)`
                : `العباس على ${profile.name} (يفتح في علامة تبويب جديدة)`
            }
          >
            <SocialIcon platform={profile.platform} />
          </a>
        ) : (
          <span
            key={profile.platform}
            className="social-icon"
            role="img"
            aria-label={profile.name}
            title={profile.name}
          >
            <SocialIcon platform={profile.platform} />
          </span>
        ),
      )}
    </div>
  );
}
