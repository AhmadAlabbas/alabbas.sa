import "server-only";
import { db } from "./db";
import { privateHash } from "./crypto";
import { PortalError } from "./http";
export async function rateLimit(
  scope: string,
  subject: string,
  limit: number,
  windowMs = 60 * 1000,
) {
  const bucket = Math.floor(Date.now() / windowMs);
  const id = privateHash(`rate:${scope}:${subject}:${bucket}`);
  const attempts = await db().$transaction(async (tx) => {
    // InnoDB keeps the counter's write lock until this transaction commits.
    // Read inside that lock so concurrent increments cannot skip allowed slots.
    await tx.$executeRaw`INSERT INTO RateLimit (id, attempts, expiresAt)
      VALUES (${id}, 1, ${new Date((bucket + 1) * windowMs)})
      ON DUPLICATE KEY UPDATE attempts = attempts + 1`;
    return (await tx.rateLimit.findUniqueOrThrow({ where: { id } })).attempts;
  });
  if (attempts > limit) throw new PortalError(429, "RATE_LIMIT");
}
