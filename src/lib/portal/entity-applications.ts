import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { encrypt } from "./crypto";
import { ensureEnabled, PortalError } from "./http";
import { sessionFromToken, audit, type RequestContext } from "./sessions";
import { rateLimit } from "./limits";

// This is only a legal-entity APPLICATION. It does not certify an entity's
// authority, KYC/KYB completion, suitability or eligibility to invest.
export const entityApplicationSchema = z.strictObject({
  legalName: z.string().trim().min(3).max(180),
  registrationReference: z.string().trim().min(3).max(80).regex(/^[\p{L}\p{N}\s\-\/.]+$/u),
  jurisdiction: z.literal("SA"),
  representativeTitle: z.string().trim().min(2).max(100),
  authorityAttestation: z.literal(true),
});
export async function ownEntityApplication(token: string | undefined) {
  ensureEnabled();
  const session = await sessionFromToken(token);
  if (session.user.role !== "CLIENT" || session.user.accountType === "INDIVIDUAL")
    throw new PortalError(403, "FORBIDDEN");
  const app = await db().entityApplication.findUnique({
    where: { userId: session.userId },
    select: { kind: true, status: true, submittedAt: true, updatedAt: true },
  });
  return { kind: session.user.accountType, accountStatus: session.user.status, application: app };
}
export async function submitEntityApplication(token: string | undefined, input: unknown, ctx: RequestContext) {
  ensureEnabled();
  const session = await sessionFromToken(token);
  if (session.user.role !== "CLIENT" || session.user.accountType === "INDIVIDUAL" || session.user.status !== "PENDING")
    throw new PortalError(403, "FORBIDDEN");
  const parsed = entityApplicationSchema.safeParse(input);
  if (!parsed.success) throw new PortalError(400, "INVALID");
  await rateLimit("entity-application", session.userId, 3, 60 * 60 * 1000);
  const encryptedData = encrypt(JSON.stringify(parsed.data), "entity:" + session.userId);
  try {
    await db().$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId }, select: { accountType: true, role: true, status: true } });
      if (user.role !== "CLIENT" || user.accountType === "INDIVIDUAL" || user.status !== "PENDING")
        throw new PortalError(403, "FORBIDDEN");
      await tx.entityApplication.create({ data: { userId: session.userId, kind: user.accountType, encryptedData, status: "SUBMITTED" } });
      await audit(tx, session.userId, "ENTITY_APPLICATION_SUBMITTED", ctx);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new PortalError(409, "ALREADY_SUBMITTED");
    throw error;
  }
  return { status: "SUBMITTED", message: "Received for independent review; no account approval or investment permissions granted." };
}
