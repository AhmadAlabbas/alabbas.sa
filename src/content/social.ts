export type SocialPlatform = "linkedin" | "x" | "instagram";

// Add verified profile URLs here when they are available.
export const socialProfiles: {
  platform: SocialPlatform;
  name: string;
  url?: string;
}[] = [
  { platform: "linkedin", name: "LinkedIn" },
  { platform: "x", name: "X" },
  { platform: "instagram", name: "Instagram" },
];
