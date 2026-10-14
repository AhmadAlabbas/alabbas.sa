import "server-only";
import { z } from "zod";
const schema = z.object({
  SITE_URL: z
    .url()
    .refine(
      (value) =>
        new URL(value).protocol === "https:" &&
        new URL(value).pathname === "/" &&
        !new URL(value).search &&
        !new URL(value).hash &&
        !new URL(value).username &&
        !new URL(value).password,
      "An HTTPS origin is required",
    )
    .transform((value) => new URL(value).origin),
  DATABASE_URL: z
    .string()
    .startsWith("mysql://")
    .refine((value) => {
      try {
        const url = new URL(value);
        const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
          url.hostname,
        );
        return (
          url.pathname.length > 1 &&
          !url.hash &&
          (loopback ||
            (url.searchParams.get("sslaccept") === "strict" &&
              !!url.searchParams.get("sslcert")))
        );
      } catch {
        return false;
      }
    }, "Remote MySQL requires a trusted CA certificate and strict TLS verification"),
  PORTAL_ENCRYPTION_KEY: z
    .string()
    .refine(
      (value) =>
        /^[A-Za-z0-9+/]{43}=$/.test(value) &&
        Buffer.from(value, "base64").length === 32,
    ),
  PORTAL_CRON_SECRET: z.string().min(32),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce
    .number()
    .refine((value) => value === 465 || value === 587),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.email(),
  PORTAL_TRUSTED_IP_HEADER: z
    .enum(["", "x-real-ip", "x-forwarded-for"])
    .default(""),
});
export function portalConfig() {
  const result = schema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      "Portal configuration is incomplete; see PORTAL.md. No configuration values are logged.",
    );
  return result.data;
}
