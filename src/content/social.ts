export type SocialPlatform =
  "youtube" | "instagram" | "tiktok" | "x" | "linkedin" | "pinterest";

// Add verified profile URLs here when they are available.
export const socialProfiles: {
  platform: SocialPlatform;
  name: string;
  url?: string;
}[] = [
  { platform: "youtube", name: "YouTube" },
  { platform: "instagram", name: "Instagram" },
  { platform: "tiktok", name: "TikTok" },
  { platform: "x", name: "X" },
  { platform: "linkedin", name: "LinkedIn" },
  { platform: "pinterest", name: "Pinterest" },
];
