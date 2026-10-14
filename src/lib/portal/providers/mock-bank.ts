import "server-only";
import { z } from "zod";
import { PortalError } from "../http";
import type { BankConnectionProvider } from "./bank";
import { mockBanks, bankScopes, type BankTransaction } from "./bank-types";
const referenceSchema = z.strictObject({
  bankId: z.enum(mockBanks),
  expiresAt: z.iso.datetime(),
  scopes: z.array(z.enum(bankScopes)),
  nonce: z.string(),
});
function consent(reference: string, signal: AbortSignal, scope?: string) {
  signal.throwIfAborted();
  const data = referenceSchema.parse(JSON.parse(reference));
  if (new Date(data.expiresAt).getTime() <= Date.now())
    throw new PortalError(403, "CONSENT_INACTIVE");
  if (scope && !(data.scopes as string[]).includes(scope))
    throw new PortalError(403, "FORBIDDEN");
  return data;
}
export class MockProvider implements BankConnectionProvider {
  readonly id = "MOCK";
  readonly mock = true;
  async createConsent(
    input: Parameters<BankConnectionProvider["createConsent"]>[0],
    signal: AbortSignal,
  ): ReturnType<BankConnectionProvider["createConsent"]> {
    signal.throwIfAborted();
    return {
      reference: JSON.stringify({
        bankId: input.bankId,
        expiresAt: input.expiresAt.toISOString(),
        scopes: input.scopes,
        nonce: input.idempotencyKey,
      }),
      status: "ACTIVE" as const,
      expiresAt: input.expiresAt,
    };
  }
  async getConsentStatus(
    reference: string,
    signal: AbortSignal,
  ): ReturnType<BankConnectionProvider["getConsentStatus"]> {
    signal.throwIfAborted();
    const data = referenceSchema.parse(JSON.parse(reference));
    return new Date(data.expiresAt).getTime() <= Date.now()
      ? ("EXPIRED" as const)
      : ("ACTIVE" as const);
  }
  async listAccounts(reference: string, signal: AbortSignal) {
    consent(reference, signal, "ACCOUNTS");
    return [
      {
        id: "sample-current",
        kind: "CURRENT" as const,
        maskedIdentifier: "SAMPLE •••• 1001",
        currency: "SAR" as const,
      },
      {
        id: "sample-savings",
        kind: "SAVINGS" as const,
        maskedIdentifier: "SAMPLE •••• 2002",
        currency: "SAR" as const,
      },
    ];
  }
  async getBalances(reference: string, signal: AbortSignal) {
    const data = consent(reference, signal, "BALANCES"),
      second = data.bankId === "sample-bank-b";
    return [
      {
        accountId: "sample-current",
        availableCents: second ? 1825000 : 4250000,
        bookedCents: second ? 1825000 : 4250000,
        asOf: "2026-09-30",
      },
      {
        accountId: "sample-savings",
        availableCents: second ? 700000 : 1350000,
        bookedCents: second ? 700000 : 1350000,
        asOf: "2026-09-30",
      },
    ];
  }
  async getTransactions(
    reference: string,
    accountId: string,
    cursor: string | null,
    signal: AbortSignal,
  ) {
    const data = consent(reference, signal, "TRANSACTIONS");
    if (!["sample-current", "sample-savings"].includes(accountId))
      throw new PortalError(404, "NOT_FOUND");
    if (cursor !== null && cursor !== "3")
      throw new PortalError(400, "INVALID");
    const factor = data.bankId === "sample-bank-b" ? 0.5 : 1;
    const rows: BankTransaction[] =
      accountId === "sample-current"
        ? [
            {
              id: "sample-t6",
              date: "2026-09-30",
              kind: "PURCHASE",
              amountCents: -50000,
              currency: "SAR",
            },
            {
              id: "sample-t5",
              date: "2026-09-28",
              kind: "REFUND",
              amountCents: 25000,
              currency: "SAR",
            },
            {
              id: "sample-t4",
              date: "2026-09-25",
              kind: "SALARY",
              amountCents: 1250000,
              currency: "SAR",
            },
            {
              id: "sample-t3",
              date: "2026-09-20",
              kind: "RENT",
              amountCents: -250000,
              currency: "SAR",
            },
            {
              id: "sample-t2",
              date: "2026-09-10",
              kind: "GROCERIES",
              amountCents: -75000,
              currency: "SAR",
            },
            {
              id: "sample-t1",
              date: "2026-09-03",
              kind: "UTILITIES",
              amountCents: -100000,
              currency: "SAR",
            },
          ]
        : [
            {
              id: "sample-s1",
              date: "2026-09-15",
              kind: "CONTRIBUTION",
              amountCents: 150000,
              currency: "SAR",
            },
          ];
    const offset = cursor ? 3 : 0;
    return {
      items: rows.slice(offset, offset + 3).map((r) => ({
        ...r,
        amountCents: Math.round(r.amountCents * factor),
      })),
      nextCursor: rows.length > offset + 3 ? "3" : null,
    };
  }
  async revokeConsent(reference: string, signal: AbortSignal) {
    signal.throwIfAborted();
    referenceSchema.parse(JSON.parse(reference));
    return { revoked: true };
  }
}
export function bankProvider(): BankConnectionProvider {
  return new MockProvider();
}
