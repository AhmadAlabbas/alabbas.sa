import "server-only";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { encrypt, decrypt } from "./crypto";
import { PortalError, ensureEnabled } from "./http";
import {
  sessionFromToken,
  requireRole,
  audit,
  type RequestContext,
} from "./sessions";
import { rateLimit } from "./limits";
import { useTotp } from "./service";
import {
  kycSaveSchema,
  kycSubmitSchema,
  kycReviewSchema,
  riskBand,
} from "./kyc-validation";
import { kycConsents, kycConsentVersion } from "@/content/kyc";
const staffRoles = [
  "ADMIN",
  "COMPLIANCE_OFFICER",
  "RELATIONSHIP_MANAGER",
] as const;
const reviewers = ["ADMIN", "COMPLIANCE_OFFICER"] as const;
const recordId = () => randomUUID().replace(/-/g, "").slice(0, 30);
function writeConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (["P2002", "P2034"].includes(error.code) ||
      (error.code === "P2010" &&
        ["1020", "1213"].includes(String(error.meta?.code))))
  );
}
async function actor(token: string | undefined) {
  ensureEnabled();
  return sessionFromToken(token);
}
async function event(
  tx: Prisma.TransactionClient,
  profileId: string,
  actorId: string,
  action: string,
  version: number,
  ctx: RequestContext,
) {
  await tx.kycEvent.create({
    data: { profileId, actorId, action, version, ...ctx },
  });
  await audit(tx, actorId, action, ctx);
}
export async function ownKyc(token: string | undefined) {
  const session = await actor(token);
  requireRole(session.user.role, ["CLIENT"]);
  if (session.user.accountType !== "INDIVIDUAL")
    throw new PortalError(403, "FORBIDDEN");
  const profile = await db().kycProfile.findUnique({
    where: { userId: session.userId },
    include: {
      submissions: {
        orderBy: { version: "desc" },
        include: {
          consents: {
            select: {
              kind: true,
              version: true,
              locale: true,
              text: true,
              acceptedAt: true,
            },
          },
          review: true,
        },
      },
    },
  });
  if (!profile)
    return {
      version: 0,
      status: "DRAFT",
      data: null,
      history: [],
      feedback: null,
    };
  return {
    version: profile.version,
    status: profile.status,
    data: JSON.parse(decrypt(profile.encryptedData, `kyc:${profile.id}`)),
    feedback: profile.submissions[0]?.review
      ? decrypt(
          profile.submissions[0].review.encryptedReason,
          `kyc-review:${profile.submissions[0].id}`,
        )
      : null,
    history: profile.submissions.map((s) => ({
      version: s.version,
      createdAt: s.createdAt,
      riskBand: s.riskBand,
      consents: s.consents,
      decision: s.review?.decision ?? null,
    })),
  };
}
export async function saveKyc(
  token: string | undefined,
  input: unknown,
  submit: boolean,
  ctx: RequestContext,
) {
  const session = await actor(token);
  requireRole(session.user.role, ["CLIENT"]);
  const parsed = (submit ? kycSubmitSchema : kycSaveSchema).safeParse(input);
  if (!parsed.success) throw new PortalError(400, "INVALID");
  await rateLimit("kyc-write", session.userId, 20);
  const data = parsed.data;
  try {
    return await db().$transaction(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: session.userId },
        });
        requireRole(user.role, ["CLIENT"]);
        if (user.accountType !== "INDIVIDUAL" || user.status !== "PENDING")
          throw new PortalError(403, "FORBIDDEN");
        const previous = await tx.kycProfile.findUnique({
          where: { userId: user.id },
        });
        if (
          (previous?.version ?? 0) !== data.version ||
          (previous &&
            !["DRAFT", "CHANGES_REQUESTED"].includes(previous.status))
        )
          throw new PortalError(409, "CONFLICT");
        const id = previous?.id ?? recordId();
        const version = data.version + 1;
        const encryptedData = encrypt(JSON.stringify(data.data), `kyc:${id}`);
        const status = submit ? "SUBMITTED" : (previous?.status ?? "DRAFT");
        if (previous) {
          // A single SQL compare-and-set avoids ORM read/write races on MySQL/MariaDB.
          const changed = await tx.$executeRaw`UPDATE KycProfile
          SET version = ${version}, encryptedData = ${encryptedData}, status = ${status}, updatedAt = ${new Date()}
          WHERE id = ${id} AND version = ${data.version} AND status = ${previous.status}`;
          if (changed !== 1) throw new PortalError(409, "CONFLICT");
        } else
          await tx.kycProfile.create({
            data: { id, userId: user.id, version, encryptedData, status },
          });
        if (submit) {
          const consent = kycSubmitSchema.parse(input);
          const submissionId = recordId();
          await tx.kycSubmission.create({
            data: {
              id: submissionId,
              profileId: id,
              version,
              encryptedData: encrypt(
                JSON.stringify(data.data),
                `kyc-submission:${submissionId}`,
              ),
              riskBand: riskBand(data.data),
            },
          });
          await tx.kycConsent.createMany({
            data: (["privacy", "accuracy"] as const).map((kind) => ({
              submissionId,
              kind,
              version: kycConsentVersion,
              locale: consent.locale,
              text: kycConsents[consent.locale][kind],
              ...ctx,
            })),
          });
          await event(tx, id, user.id, "KYC_CONSENTS_RECORDED", version, ctx);
        }
        await event(
          tx,
          id,
          user.id,
          submit ? "KYC_SUBMITTED" : "KYC_SAVED",
          version,
          ctx,
        );
        return { version, status };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  } catch (error) {
    if (writeConflict(error)) throw new PortalError(409, "CONFLICT");
    throw error;
  }
}
export async function reviewQueue(token: string | undefined, page = 0) {
  const session = await actor(token);
  requireRole(session.user.role, [...staffRoles]);
  const profiles = await db().kycProfile.findMany({
    where: { status: { not: "DRAFT" } },
    select: { id: true, status: true, version: true, updatedAt: true },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: page * 50,
    take: 51,
  });
  return {
    canReview: reviewers.includes(
      session.user.role as (typeof reviewers)[number],
    ),
    profiles: profiles.slice(0, 50),
    hasMore: profiles.length > 50,
  };
}
export async function reviewDetail(
  token: string | undefined,
  id: string,
  ctx: RequestContext,
) {
  const session = await actor(token);
  requireRole(session.user.role, [...reviewers]);
  await rateLimit("kyc-read", session.userId, 60);
  return db().$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: session.userId },
    });
    requireRole(user.role, [...reviewers]);
    if (user.status === "SUSPENDED") throw new PortalError(401, "SIGN_IN");
    const profile = await tx.kycProfile.findUnique({
      where: { id },
      include: {
        submissions: {
          orderBy: { version: "desc" },
          take: 1,
          include: {
            consents: {
              select: {
                kind: true,
                version: true,
                locale: true,
                text: true,
                acceptedAt: true,
              },
            },
            review: true,
          },
        },
      },
    });
    if (!profile || profile.status === "DRAFT" || !profile.submissions[0])
      throw new PortalError(404, "NOT_FOUND");
    if (profile.userId === session.userId)
      throw new PortalError(403, "FORBIDDEN");
    const submission = profile.submissions[0];
    await event(tx, id, session.userId, "KYC_VIEWED", submission.version, ctx);
    return {
      id,
      version: profile.version,
      status: profile.status,
      submittedVersion: submission.version,
      createdAt: submission.createdAt,
      riskBand: submission.riskBand,
      data: JSON.parse(
        decrypt(submission.encryptedData, `kyc-submission:${submission.id}`),
      ),
      consents: submission.consents,
      feedback: submission.review
        ? decrypt(
            submission.review.encryptedReason,
            `kyc-review:${submission.id}`,
          )
        : null,
    };
  });
}
export async function reviewKyc(
  token: string | undefined,
  input: unknown,
  ctx: RequestContext,
) {
  const session = await actor(token);
  requireRole(session.user.role, [...reviewers]);
  const parsed = kycReviewSchema.safeParse(input);
  if (!parsed.success) throw new PortalError(400, "INVALID");
  await rateLimit("kyc-review", session.userId, 6);
  const data = parsed.data;
  try {
    return await db().$transaction(
      async (tx) => {
        const reviewer = await tx.user.findUniqueOrThrow({
          where: { id: session.userId },
        });
        requireRole(reviewer.role, [...reviewers]);
        if (reviewer.status === "SUSPENDED")
          throw new PortalError(401, "SIGN_IN");
        if (reviewer.passwordVersion !== session.passwordVersion)
          throw new PortalError(401, "SIGN_IN");
        const profile = await tx.kycProfile.findUnique({
          where: { id: data.profileId },
          include: {
            user: true,
            submissions: { orderBy: { version: "desc" }, take: 1 },
          },
        });
        if (!profile) throw new PortalError(404, "NOT_FOUND");
        if (profile.userId === reviewer.id)
          throw new PortalError(403, "FORBIDDEN");
        const submission = profile.submissions[0];
        if (
          profile.status !== "SUBMITTED" ||
          profile.version !== data.version ||
          submission?.version !== data.version
        )
          throw new PortalError(409, "CONFLICT");
        if (
          profile.user.status !== "PENDING" ||
          profile.user.accountType !== "INDIVIDUAL"
        )
          throw new PortalError(403, "FORBIDDEN");
        // Serialize competing decisions on the profile before consuming MFA or approving the account.
        const changed = await tx.$executeRaw`UPDATE KycProfile
        SET status = ${data.decision}, version = version + 1, updatedAt = ${new Date()}
        WHERE id = ${profile.id} AND version = ${data.version} AND status = 'SUBMITTED'`;
        if (changed !== 1) throw new PortalError(409, "CONFLICT");
        await useTotp(tx, reviewer, data.code);
        await tx.kycReview.create({
          data: {
            submissionId: submission.id,
            reviewerId: reviewer.id,
            decision: data.decision,
            checksConfirmed: data.checksConfirmed,
            encryptedReason: encrypt(
              data.reason,
              `kyc-review:${submission.id}`,
            ),
          },
        });
        if (data.decision === "APPROVED") {
          const approved =
            await tx.$executeRaw`UPDATE User SET status = 'APPROVED', updatedAt = ${new Date()}
          WHERE id = ${profile.userId} AND status = 'PENDING' AND accountType = 'INDIVIDUAL'`;
          if (approved !== 1) throw new PortalError(409, "CONFLICT");
        }
        await event(
          tx,
          profile.id,
          reviewer.id,
          `KYC_${data.decision}`,
          data.version,
          ctx,
        );
        return { status: data.decision, version: data.version + 1 };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  } catch (error) {
    if (writeConflict(error)) throw new PortalError(409, "CONFLICT");
    throw error;
  }
}
