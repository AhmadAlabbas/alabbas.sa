export type SocialPlatform =
  "youtube" | "instagram" | "tiktok" | "x" | "linkedin" | "pinterest";

// Add verified profile URLs here when they are available.
export const socialProfiles: {
  platform: SocialPlatform;
  name: string;
  url?: string;
}[] = [
  {
    platform: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/@AlabbasCompany",
  },
  {
    platform: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com/alabbascompany/",
  },
  {
    platform: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com/@alabbascompany",
  },
  {
    platform: "x",
    name: "X",
    url: "https://x.com/alabbas_company",
  },
  {
    platform: "linkedin",
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/alabbascompany/",
  },
];
