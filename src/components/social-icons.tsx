import { socialProfiles, type SocialPlatform } from "@/content/social";
import type { Locale } from "@/content/site";

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {platform === "youtube" && (
        <path
          fill="currentColor"
          stroke="none"
          fillRule="evenodd"
          d="M21.6 5.9a3 3 0 0 0-2.1-2.1C17.6 3.3 12 3.3 12 3.3s-5.6 0-7.5.5a3 3 0 0 0-2.1 2.1C1.9 7.8 1.9 12 1.9 12s0 4.2.5 6.1a3 3 0 0 0 2.1 2.1c1.9.5 7.5.5 7.5.5s5.6 0 7.5-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-6.1.5-6.1s0-4.2-.5-6.1ZM10 16.3V7.7l7 4.3-7 4.3Z"
          clipRule="evenodd"
        />
      )}
      {platform === "tiktok" && (
        <path
          fill="currentColor"
          stroke="none"
          d="M16.8 1h-3.9v14.9a3.3 3.3 0 1 1-2.8-3.3V8.7a7.2 7.2 0 1 0 6.7 7.2V8.2a9.1 9.1 0 0 0 5.5 1.9V6.2A5.5 5.5 0 0 1 16.8 1Z"
        />
      )}
      {platform === "linkedin" && (
        <path
          fill="currentColor"
          stroke="none"
          fillRule="evenodd"
          d="M3 2h18a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm2 7v10h3V9H5Zm1.5-4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM10 9v10h3v-5.5c0-1.4.7-2.2 1.8-2.2 1.2 0 1.7.8 1.7 2.2V19h3v-6.2c0-2.7-1.5-4-3.6-4-1.4 0-2.4.6-3 1.5V9H10Z"
          clipRule="evenodd"
        />
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
      {platform === "pinterest" && (
        <path
          fill="currentColor"
          stroke="none"
          d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.936 1.407-5.965 1.407-5.965s-.359-.719-.359-1.781c0-1.669.967-2.914 2.171-2.914 1.024 0 1.518.769 1.518 1.69 0 1.03-.656 2.569-.994 3.995-.283 1.194.599 2.169 1.776 2.169 2.131 0 3.769-2.247 3.769-5.491 0-2.872-2.063-4.88-5.008-4.88-3.41 0-5.412 2.558-5.412 5.2 0 1.03.397 2.135.893 2.735a.36.36 0 0 1 .083.345c-.091.378-.293 1.194-.333 1.36-.053.225-.174.271-.402.165-1.499-.698-2.436-2.888-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.966 7.398 6.931 0 4.137-2.608 7.467-6.227 7.467-1.216 0-2.359-.631-2.75-1.378l-.747 2.848c-.271 1.041-1.002 2.346-1.492 3.14A12.013 12.013 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0Z"
        />
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
