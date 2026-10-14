import "server-only";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { dashboardSession } from "./dashboard";
import { encrypt, decrypt, privateHash } from "./crypto";
import { PortalError } from "./http";
import { rateLimit } from "./limits";
import { audit, type RequestContext } from "./sessions";
import { bankConsentText, bankConsentVersion } from "@/content/banks";
import { mockBanks, bankScopes, type BankScope } from "./providers/bank-types";
import type { BankConnectionProvider } from "./providers/bank";
import { bankProvider } from "./providers/mock-bank";
const id = () => randomUUID().replace(/-/g, "").slice(0, 30);
export const bankConnectSchema = z.strictObject({
  bankId: z.enum(mockBanks),
  locale: z.enum(["en", "ar"]),
  consentVersion: z.literal(bankConsentVersion),
  accepted: z.literal(true),
  scopes: z
    .array(z.enum(bankScopes))
    .min(1)
    .max(3)
    .refine((v) => v.includes("ACCOUNTS") && new Set(v).size === v.length),
});
function onlyMock(provider: BankConnectionProvider) {
  // Real providers cannot be enabled by changing environment variables or client input.
  if (provider.id !== "MOCK" || !provider.mock)
    throw new PortalError(503, "UNAVAILABLE");
}
function conflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (["P2002", "P2034"].includes(error.code) ||
      (error.code === "P2010" &&
        ["1020", "1213"].includes(String(error.meta?.code))))
  );
}
async function event(
  tx: Prisma.TransactionClient,
  connectionId: string,
  userId: string,
  action: string,
  revision: number,
  ctx: RequestContext,
  system = false,
) {
  await tx.bankEvent.create({
    data: {
      connectionId,
      actorId: system ? null : userId,
      actorKind: system ? "SYSTEM" : "CLIENT",
      action,
      revision,
      ...ctx,
    },
  });
  await audit(tx, userId, action, ctx);
}
async function owned(userId: string, connectionId: string) {
  const record = await db().bankConnection.findFirst({
    where: { id: connectionId, userId },
    include: { consents: { orderBy: { revision: "desc" } } },
  });
  if (!record) throw new PortalError(404, "NOT_FOUND");
  return record;
}
export async function listBankConnections(token: string | undefined) {
  const session = await dashboardSession(token);
  await rateLimit("bank-list", session.userId, 90);
  const records = await db().bankConnection.findMany({
    where: { userId: session.userId },
    include: {
      consents: { orderBy: { revision: "desc" } },
      events: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { action: true, revision: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return {
    mock: true,
    banks: mockBanks,
    connections: records.map((r) => ({
      id: r.id,
      bankId: r.bankId,
      status:
        r.status === "ACTIVE" && r.expiresAt.getTime() <= Date.now()
          ? "EXPIRED"
          : r.status,
      expiresAt: r.expiresAt,
      version: r.version,
      revokedAt: r.revokedAt,
      scopes: r.consents[0]?.scopes ?? [],
      consents: r.consents.map((c) => ({
        revision: c.revision,
        textVersion: c.textVersion,
        locale: c.locale,
        text: c.text,
        scopes: c.scopes,
        acceptedAt: c.acceptedAt,
        expiresAt: c.expiresAt,
      })),
      events: r.events,
    })),
  };
}
export async function connectBank(
  token: string | undefined,
  input: unknown,
  ctx: RequestContext,
  provider: BankConnectionProvider = bankProvider(),
) {
  onlyMock(provider);
  const session = await dashboardSession(token),
    parsed = bankConnectSchema.safeParse(input);
  if (!parsed.success) throw new PortalError(400, "INVALID");
  await rateLimit("bank-connect", session.userId, 6);
  const data = parsed.data,
    expiresAt = new Date(Date.now() + 30 * 86400000);
  let record;
  try {
    record = await db().$transaction(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: session.userId },
        });
        if (
          user.role !== "CLIENT" ||
          user.accountType !== "INDIVIDUAL" ||
          user.status === "SUSPENDED" ||
          user.passwordVersion !== session.passwordVersion
        )
          throw new PortalError(403, "FORBIDDEN");
        const previous = await tx.bankConnection.findUnique({
          where: {
            userId_bankId: { userId: session.userId, bankId: data.bankId },
          },
        });
        if (previous && !["REVOKED", "FAILED"].includes(previous.status))
          throw new PortalError(409, "CONFLICT");
        const connectionId = previous?.id ?? id(),
          version = (previous?.version ?? 0) + 1;
        if (previous) {
          const changed =
            await tx.$executeRaw`UPDATE BankConnection SET status='PENDING', version=${version}, encryptedReference=NULL, expiresAt=${expiresAt}, revokedAt=NULL, revocationAttempts=0, leaseUntil=NULL, nextRevocationAt=${new Date()}, updatedAt=${new Date()}
          WHERE id=${connectionId} AND version=${previous.version} AND status IN ('REVOKED','FAILED')`;
          if (changed !== 1) throw new PortalError(409, "CONFLICT");
        } else
          await tx.bankConnection.create({
            data: {
              id: connectionId,
              userId: session.userId,
              bankId: data.bankId,
              providerId: provider.id,
              expiresAt,
              version,
            },
          });
        await tx.bankConsent.create({
          data: {
            connectionId,
            revision: version,
            textVersion: bankConsentVersion,
            locale: data.locale,
            text: bankConsentText[data.locale],
            scopes: data.scopes,
            expiresAt,
            ...ctx,
          },
        });
        await event(
          tx,
          connectionId,
          session.userId,
          "BANK_CONSENT_ACCEPTED",
          version,
          ctx,
        );
        return { id: connectionId, version };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  } catch (error) {
    if (conflict(error)) throw new PortalError(409, "CONFLICT");
    throw error;
  }
  let grant;
  try {
    grant = await provider.createConsent(
      {
        bankId: data.bankId,
        scopes: data.scopes,
        expiresAt,
        idempotencyKey: `${record.id}:${record.version}`,
      },
      AbortSignal.timeout(5000),
    );
    if (
      !grant.reference ||
      !Number.isFinite(grant.expiresAt.getTime()) ||
      grant.expiresAt.getTime() > expiresAt.getTime() ||
      grant.expiresAt.getTime() <= Date.now() ||
      !["ACTIVE", "PENDING"].includes(grant.status)
    )
      throw new Error("Invalid provider grant");
  } catch {
    await db().$transaction(async (tx) => {
      const changed =
        await tx.$executeRaw`UPDATE BankConnection SET status='FAILED',updatedAt=${new Date()} WHERE id=${record.id} AND version=${record.version} AND status='PENDING'`;
      if (changed === 1)
        await event(
          tx,
          record.id,
          session.userId,
          "BANK_CONNECT_FAILED",
          record.version,
          ctx,
        );
    });
    throw new PortalError(503, "UNAVAILABLE");
  }
  const reference = encrypt(grant.reference, `bank:${record.id}`);
  const result = await db().$transaction(async (tx) => {
    // A pending disconnect wins over activation. Attach its handle for revocation, never reactivate it.
    const changed =
      await tx.$executeRaw`UPDATE BankConnection SET encryptedReference=${reference}, expiresAt=${grant.expiresAt}, status=IF(status='PENDING',${grant.status},'REVOKING'), updatedAt=${new Date()}
      WHERE id=${record.id} AND encryptedReference IS NULL AND ((version=${record.version} AND status='PENDING') OR (version=${record.version + 1} AND status='REVOKING'))`;
    if (changed !== 1) throw new PortalError(409, "CONFLICT");
    const current = await tx.bankConnection.findUniqueOrThrow({
      where: { id: record.id },
    });
    if (current.status === "ACTIVE")
      await event(
        tx,
        record.id,
        session.userId,
        "BANK_CONNECTED",
        record.version,
        ctx,
      );
    return current;
  });
  if (result.status === "REVOKING")
    await revokeBankConnection(result.id, ctx, provider);
  const current = await db().bankConnection.findUniqueOrThrow({
    where: { id: record.id },
  });
  return { id: record.id, status: current.status, mock: true };
}
async function activeConnection(
  token: string | undefined,
  connectionId: string,
  scope: BankScope,
  provider: BankConnectionProvider,
) {
  onlyMock(provider);
  const session = await dashboardSession(token);
  await rateLimit("bank-data", session.userId, 60);
  const connection = await owned(session.userId, connectionId);
  if (connection.providerId !== provider.id)
    throw new PortalError(503, "UNAVAILABLE");
  if (
    connection.status !== "ACTIVE" ||
    connection.expiresAt.getTime() <= Date.now() ||
    !connection.encryptedReference
  )
    throw new PortalError(403, "CONSENT_INACTIVE");
  if (!(connection.consents[0]?.scopes as string[]).includes(scope))
    throw new PortalError(403, "FORBIDDEN");
  const reference = decrypt(
    connection.encryptedReference,
    `bank:${connection.id}`,
  );
  if (
    (await provider.getConsentStatus(reference, AbortSignal.timeout(5000))) !==
    "ACTIVE"
  )
    throw new PortalError(403, "CONSENT_INACTIVE");
  return { connection, reference };
}
async function stillActive(connection: { id: string; version: number }) {
  if (
    !(await db().bankConnection.findFirst({
      where: {
        id: connection.id,
        version: connection.version,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    }))
  )
    throw new PortalError(403, "CONSENT_INACTIVE");
}
export async function bankAccounts(
  token: string | undefined,
  connectionId: string,
  provider: BankConnectionProvider = bankProvider(),
) {
  const { connection, reference } = await activeConnection(
    token,
    connectionId,
    "ACCOUNTS",
    provider,
  );
  const accounts = await provider.listAccounts(
    reference,
    AbortSignal.timeout(5000),
  );
  const balances = (connection.consents[0].scopes as string[]).includes(
    "BALANCES",
  )
    ? await provider.getBalances(reference, AbortSignal.timeout(5000))
    : [];
  await stillActive(connection);
  await dashboardSession(token);
  return {
    mock: true,
    accounts: accounts.map((account) => ({
      ...account,
      balance: balances.find((b) => b.accountId === account.id) ?? null,
    })),
  };
}
export async function bankTransactions(
  token: string | undefined,
  connectionId: string,
  accountId: string,
  cursor: string | null,
  provider: BankConnectionProvider = bankProvider(),
) {
  const { connection, reference } = await activeConnection(
    token,
    connectionId,
    "TRANSACTIONS",
    provider,
  );
  if (
    !(await provider.listAccounts(reference, AbortSignal.timeout(5000))).some(
      (a) => a.id === accountId,
    )
  )
    throw new PortalError(404, "NOT_FOUND");
  const page = await provider.getTransactions(
    reference,
    accountId,
    cursor,
    AbortSignal.timeout(5000),
  );
  await stillActive(connection);
  await dashboardSession(token);
  return { mock: true, ...page };
}
export async function revokeBankConnection(
  connectionId: string,
  ctx: RequestContext,
  provider: BankConnectionProvider = bankProvider(),
  system = false,
) {
  onlyMock(provider);
  const now = new Date(),
    leaseUntil = new Date(Date.now() + 15000);
  const claimed = await db()
    .$executeRaw`UPDATE BankConnection SET leaseUntil=${leaseUntil},revocationAttempts=revocationAttempts+1
    WHERE id=${connectionId} AND status='REVOKING' AND encryptedReference IS NOT NULL AND providerId=${provider.id} AND revocationAttempts<5 AND nextRevocationAt<=${now} AND (leaseUntil IS NULL OR leaseUntil<${now})`;
  if (claimed !== 1) return false;
  const record = await db().bankConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });
  try {
    const result = await provider.revokeConsent(
      decrypt(record.encryptedReference!, `bank:${record.id}`),
      AbortSignal.timeout(5000),
    );
    if (!result.revoked) throw new Error("Revocation not acknowledged");
  } catch {
    await db().$transaction(async (tx) => {
      await tx.bankConnection.update({
        where: { id: record.id },
        data: {
          leaseUntil: null,
          nextRevocationAt: new Date(
            Date.now() +
              Math.min(3600000, 30000 * 2 ** record.revocationAttempts),
          ),
        },
      });
      await event(
        tx,
        record.id,
        record.userId,
        "BANK_REVOCATION_RETRY",
        record.version,
        ctx,
        system,
      );
    });
    return false;
  }
  await db().$transaction(async (tx) => {
    const changed =
      await tx.$executeRaw`UPDATE BankConnection SET status='REVOKED',encryptedReference=NULL,revokedAt=${new Date()},leaseUntil=NULL,updatedAt=${new Date()} WHERE id=${record.id} AND status='REVOKING' AND version=${record.version}`;
    if (changed === 1)
      await event(
        tx,
        record.id,
        record.userId,
        "BANK_DISCONNECTED",
        record.version,
        ctx,
        system,
      );
  });
  return true;
}
export async function disconnectBank(
  token: string | undefined,
  connectionId: string,
  ctx: RequestContext,
  provider: BankConnectionProvider = bankProvider(),
) {
  onlyMock(provider);
  const session = await dashboardSession(token);
  await rateLimit("bank-disconnect", session.userId, 12);
  const ownedRecord = await owned(session.userId, connectionId);
  if (ownedRecord.providerId !== provider.id)
    throw new PortalError(503, "UNAVAILABLE");
  await db().$transaction(async (tx) => {
    const changed =
      await tx.$executeRaw`UPDATE BankConnection SET status='REVOKING',version=version+1,nextRevocationAt=${new Date()},updatedAt=${new Date()}
      WHERE id=${connectionId} AND userId=${session.userId} AND status NOT IN ('REVOKED','REVOKING')`;
    if (changed === 1) {
      const record = await tx.bankConnection.findUniqueOrThrow({
        where: { id: connectionId },
      });
      await event(
        tx,
        connectionId,
        session.userId,
        "BANK_DISCONNECT_REQUESTED",
        record.version,
        ctx,
      );
    }
  });
  await revokeBankConnection(connectionId, ctx, provider);
  const record = await owned(session.userId, connectionId);
  return {
    status: record.status,
    localAccessStopped: true,
    providerRevoked: record.status === "REVOKED",
  };
}
export async function retryBankRevocations() {
  const records = await db().bankConnection.findMany({
    where: {
      status: "REVOKING",
      encryptedReference: { not: null },
      revocationAttempts: { lt: 5 },
      nextRevocationAt: { lte: new Date() },
    },
    select: { id: true },
    take: 5,
    orderBy: { nextRevocationAt: "asc" },
  });
  let revoked = 0;
  const ctx = {
    networkHash: privateHash("protected-bank-revocation-cron"),
    userAgent: "Protected bank-revocation cron",
  };
  const deadline = Date.now() + 10000;
  let attempted = 0;
  for (const record of records) {
    if (Date.now() >= deadline) break;
    attempted++;
    if (await revokeBankConnection(record.id, ctx, bankProvider(), true))
      revoked++;
  }
  return { bankRevocationAttempts: attempted, bankRevoked: revoked };
}
