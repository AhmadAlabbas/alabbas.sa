import "server-only";
import { Prisma, type User } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { portalConfig } from "./config";
import {
  decrypt,
  encrypt,
  hashPassword,
  newTotpSecret,
  randomToken,
  tokenHash,
  validateTotp,
  verifyPassword,
} from "./crypto";
import {
  audit,
  issueSession,
  sessionFromToken,
  type RequestContext,
} from "./sessions";
import { queueEmail } from "./email";
import { rateLimit } from "./limits";
import { PortalError } from "./http";
const email = z
  .email()
  .max(254)
  .transform((value) => value.trim().toLowerCase());
const password = z
  .string()
  .min(12)
  .max(128)
  .refine(
    (value) =>
      value.trim().length >= 12 &&
      !/^(.)\1+$/.test(value) &&
      !["password1234", "123456789012", "qwerty123456"].includes(
        value.toLowerCase(),
      ),
  );
let dummyPasswordHash: Promise<string> | undefined;
const locale = z.enum(["en", "ar"]);
const schemas = {
  "sign-up": z
    .object({
      name: z.string().trim().min(2).max(120),
      email,
      password,
      locale,
      consent: z.literal(true),
    })
    .strict(),
  "sign-in": z.object({ email, password: z.string().min(1).max(128) }).strict(),
  "verify-email": z
    .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
    .strict(),
  "forgot-password": z.object({ email, locale }).strict(),
  "resend-verification": z.object({ email, locale }).strict(),
  "reset-password": z
    .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password })
    .strict(),
  "confirm-totp": z.object({ code: z.string().regex(/^\d{6}$/) }).strict(),
  "sign-out": z.object({}).strict(),
  "revoke-session": z.object({ sessionId: z.string().min(1).max(30) }).strict(),
  "revoke-others": z.object({}).strict(),
  "change-password": z
    .object({
      currentPassword: z.string().min(1).max(128),
      password,
      code: z.string().regex(/^\d{6}$/),
    })
    .strict(),
  "data-request": z
    .object({
      kind: z.enum(["EXPORT", "DELETION"]),
      currentPassword: z.string().min(1).max(128),
      code: z.string().regex(/^\d{6}$/),
    })
    .strict(),
};
export type AuthAction = keyof typeof schemas;
export const authActions = Object.keys(schemas);
async function addToken(
  tx: Prisma.TransactionClient,
  user: User,
  purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
  lang: string,
) {
  const token = randomToken();
  await tx.actionToken.create({
    data: {
      tokenHash: tokenHash(token),
      userId: user.id,
      purpose,
      passwordVersion: user.passwordVersion,
      expiresAt: new Date(
        Date.now() +
          (purpose === "VERIFY_EMAIL" ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000),
      ),
    },
  });
  const config = portalConfig();
  const path = purpose === "VERIFY_EMAIL" ? "verify-email" : "reset-password";
  await queueEmail(
    tx,
    user.email,
    `${config.SITE_URL}/${lang}/auth/${path}#token=${token}`,
    purpose,
    lang,
  );
}
async function consumeToken(
  tx: Prisma.TransactionClient,
  value: string,
  purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
) {
  const token = await tx.actionToken.findUnique({
    where: { tokenHash: tokenHash(value) },
    include: { user: true },
  });
  if (
    !token ||
    token.purpose !== purpose ||
    token.expiresAt <= new Date() ||
    token.consumedAt ||
    token.passwordVersion !== token.user.passwordVersion ||
    token.user.status === "SUSPENDED"
  )
    throw new PortalError(400, "INVALID_TOKEN");
  const changed = await tx.actionToken.updateMany({
    where: { id: token.id, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });
  if (changed.count !== 1) throw new PortalError(400, "INVALID_TOKEN");
  return token;
}
export async function useTotp(
  tx: Prisma.TransactionClient,
  user: User,
  code: string,
) {
  if (!user.totpSecret) throw new PortalError(400, "TOTP_INVALID");
  const step = validateTotp(
    decrypt(user.totpSecret, `totp:${user.id}`),
    user.email,
    code,
  );
  if (step === null) throw new PortalError(400, "TOTP_INVALID");
  const used = await tx.user.updateMany({
    where: {
      id: user.id,
      totpLastStep: { lt: step },
      passwordVersion: user.passwordVersion,
      status: { not: "SUSPENDED" },
      role: user.role,
    },
    data: { totpLastStep: step },
  });
  if (used.count !== 1) throw new PortalError(400, "TOTP_INVALID");
}
export async function performAuth(
  action: AuthAction,
  input: unknown,
  token: string | undefined,
  ctx: RequestContext,
) {
  const data = schemas[action].safeParse(input);
  if (!data.success) throw new PortalError(400, "INVALID");
  await rateLimit(action, ctx.networkHash, 30);
  const client = db();
  switch (action) {
    case "sign-up": {
      const d = schemas["sign-up"].parse(input);
      await rateLimit("signup-email", d.email, 3, 60 * 60 * 1000);
      const encoded = await hashPassword(d.password);
      try {
        await client.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { email: d.email, name: d.name, passwordHash: encoded },
          });
          await addToken(tx, user, "VERIFY_EMAIL", d.locale);
          await audit(tx, user.id, "ACCOUNT_CREATED", ctx);
          await audit(tx, user.id, "PRIVACY_ACKNOWLEDGED_V1", ctx);
        });
      } catch (error) {
        if (!(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ))
          throw error;
      }
      return { message: "CHECK_EMAIL" };
    }
    case "forgot-password":
    case "resend-verification": {
      const d = schemas[action].parse(input) as {
        email: string;
        locale: string;
      };
      await rateLimit("email-link", d.email, 3, 60 * 60 * 1000);
      const user = await client.user.findUnique({ where: { email: d.email } });
      if (
        user &&
        user.status !== "SUSPENDED" &&
        (action === "forgot-password" || !user.emailVerifiedAt)
      )
        await client.$transaction(async (tx) => {
          await addToken(
            tx,
            user,
            action === "forgot-password" ? "RESET_PASSWORD" : "VERIFY_EMAIL",
            d.locale,
          );
          await audit(
            tx,
            user.id,
            action === "forgot-password"
              ? "PASSWORD_RESET_REQUESTED"
              : "EMAIL_VERIFICATION_REQUESTED",
            ctx,
          );
        });
      return { message: "CHECK_EMAIL" };
    }
    case "verify-email": {
      const d = schemas[action].parse(input) as { token: string };
      await client.$transaction(async (tx) => {
        const item = await consumeToken(tx, d.token, "VERIFY_EMAIL");
        await tx.user.update({
          where: { id: item.userId },
          data: { emailVerifiedAt: new Date() },
        });
        await tx.actionToken.updateMany({
          where: {
            userId: item.userId,
            purpose: "VERIFY_EMAIL",
            consumedAt: null,
          },
          data: { consumedAt: new Date() },
        });
        await audit(tx, item.userId, "EMAIL_VERIFIED", ctx);
      });
      return { message: "EMAIL_VERIFIED" };
    }
    case "reset-password": {
      const d = schemas[action].parse(input) as {
        token: string;
        password: string;
      };
      const encoded = await hashPassword(d.password);
      await client.$transaction(async (tx) => {
        const item = await consumeToken(tx, d.token, "RESET_PASSWORD");
        await tx.user.update({
          where: { id: item.userId },
          data: { passwordHash: encoded, passwordVersion: { increment: 1 } },
        });
        await tx.session.deleteMany({ where: { userId: item.userId } });
        await tx.actionToken.updateMany({
          where: { userId: item.userId, consumedAt: null },
          data: { consumedAt: new Date() },
        });
        await audit(tx, item.userId, "PASSWORD_RESET", ctx);
      });
      return { message: "PASSWORD_UPDATED", clearSession: true };
    }
    case "sign-in": {
      const d = schemas[action].parse(input) as {
        email: string;
        password: string;
      };
      await rateLimit("login-email", d.email, 8, 15 * 60 * 1000);
      const user = await client.user.findUnique({ where: { email: d.email } });
      const encoded =
        user?.passwordHash ||
        (await (dummyPasswordHash ??= hashPassword(
          "constant-dummy-password-for-timing",
        )));
      const valid = await verifyPassword(encoded, d.password);
      if (!valid || !user || user.status === "SUSPENDED") {
        await client.$transaction((tx) =>
          audit(tx, user?.id ?? null, "LOGIN_FAILED", ctx),
        );
        throw new PortalError(401, "INVALID_CREDENTIALS");
      }
      if (!user.emailVerifiedAt) {
        await client.$transaction((tx) =>
          audit(tx, user.id, "LOGIN_UNVERIFIED", ctx),
        );
        throw new PortalError(401, "INVALID_CREDENTIALS");
      }
      const result = await client.$transaction(async (tx) => {
        const current = await tx.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        if (
          current.passwordVersion !== user.passwordVersion ||
          current.status === "SUSPENDED" ||
          !current.emailVerifiedAt
        )
          throw new PortalError(401, "INVALID_CREDENTIALS");
        await tx.session.deleteMany({
          where: { userId: user.id, kind: "CHALLENGE" },
        });
        if (!current.totpEnabledAt)
          await tx.user.updateMany({
            where: {
              id: user.id,
              totpEnabledAt: null,
              passwordVersion: user.passwordVersion,
              status: { not: "SUSPENDED" },
              emailVerifiedAt: { not: null },
            },
            data: {
              totpSecret: encrypt(newTotpSecret(), `totp:${user.id}`),
              totpLastStep: -1,
            },
          });
        await audit(tx, user.id, "PASSWORD_CONFIRMED", ctx);
        return issueSession(tx, current, "CHALLENGE", ctx);
      });
      return {
        message: "TOTP_REQUIRED",
        sessionToken: result.token,
        sessionSeconds: 300,
      };
    }
    case "confirm-totp": {
      const d = schemas[action].parse(input) as { code: string };
      const challenge = await sessionFromToken(token, "CHALLENGE");
      await rateLimit("totp-user", challenge.userId, 6, 5 * 60 * 1000);
      const result = await client
        .$transaction(async (tx) => {
          const active = await tx.session.findUnique({
            where: { id: challenge.id },
            include: { user: true },
          });
          if (
            !active ||
            active.kind !== "CHALLENGE" ||
            active.expiresAt <= new Date() ||
            active.passwordVersion !== active.user.passwordVersion
          )
            throw new PortalError(401, "SIGN_IN");
          await useTotp(tx, active.user, d.code);
          if (!active.user.totpEnabledAt) {
            await tx.user.update({
              where: { id: active.userId },
              data: { totpEnabledAt: new Date() },
            });
            await audit(tx, active.userId, "TOTP_ENROLLED", ctx);
          }
          const consumed = await tx.session.deleteMany({
            where: { id: active.id, kind: "CHALLENGE" },
          });
          if (consumed.count !== 1) throw new PortalError(401, "SIGN_IN");
          await audit(tx, active.userId, "LOGIN_SUCCESS", ctx);
          return issueSession(tx, active.user, "AUTHENTICATED", ctx);
        })
        .catch(async (error) => {
          if (error instanceof PortalError && error.code === "TOTP_INVALID")
            await client.auditEvent.create({
              data: { userId: challenge.userId, action: "TOTP_FAILED", ...ctx },
            });
          throw error;
        });
      return {
        message: "SIGNED_IN",
        sessionToken: result.token,
        sessionSeconds: 8 * 60 * 60,
      };
    }
    case "sign-out": {
      if (token) {
        const existing = await client.session.findUnique({
          where: { tokenHash: tokenHash(token) },
        });
        if (existing)
          await client.$transaction(async (tx) => {
            await tx.session.deleteMany({ where: { id: existing.id } });
            await audit(tx, existing.userId, "SIGNED_OUT", ctx);
          });
      }
      return { message: "SIGNED_OUT", clearSession: true };
    }
    default: {
      const session = await sessionFromToken(token);
      if (action === "revoke-session") {
        const d = schemas[action].parse(input) as { sessionId: string };
        await client.$transaction(async (tx) => {
          const changed = await tx.session.deleteMany({
            where: { id: d.sessionId, userId: session.userId },
          });
          if (!changed.count) throw new PortalError(404, "NOT_FOUND");
          await audit(tx, session.userId, "SESSION_REVOKED", ctx);
        });
        return {
          message: "SESSION_REVOKED",
          clearSession: session.id === d.sessionId,
        };
      }
      if (action === "revoke-others") {
        await client.$transaction(async (tx) => {
          await tx.session.deleteMany({
            where: { userId: session.userId, id: { not: session.id } },
          });
          await audit(tx, session.userId, "OTHER_SESSIONS_REVOKED", ctx);
        });
        return { message: "SESSION_REVOKED" };
      }
      const d = schemas[action].parse(input) as {
        currentPassword: string;
        password?: string;
        code: string;
        kind?: "EXPORT" | "DELETION";
      };
      await rateLimit("stepup-user", session.userId, 6, 5 * 60 * 1000);
      if (!(await verifyPassword(session.user.passwordHash, d.currentPassword)))
        throw new PortalError(401, "INVALID_CREDENTIALS");
      const encoded = d.password ? await hashPassword(d.password) : undefined;
      await client.$transaction(async (tx) => {
        const current = await tx.user.findUniqueOrThrow({
          where: { id: session.userId },
        });
        if (current.passwordVersion !== session.passwordVersion)
          throw new PortalError(401, "SIGN_IN");
        await useTotp(tx, current, d.code);
        if (action === "change-password") {
          await tx.user.update({
            where: { id: current.id },
            data: { passwordHash: encoded, passwordVersion: { increment: 1 } },
          });
          await tx.session.deleteMany({ where: { userId: current.id } });
          await tx.actionToken.updateMany({
            where: { userId: current.id, consumedAt: null },
            data: { consumedAt: new Date() },
          });
          await audit(tx, current.id, "PASSWORD_CHANGED", ctx);
        } else {
          await tx.dataRequest.create({
            data: { userId: current.id, kind: d.kind! },
          });
          await audit(tx, current.id, `${d.kind}_REQUESTED`, ctx);
        }
      });
      return {
        message:
          action === "change-password"
            ? "PASSWORD_UPDATED"
            : "REQUEST_RECORDED",
        clearSession: action === "change-password",
      };
    }
  }
}
