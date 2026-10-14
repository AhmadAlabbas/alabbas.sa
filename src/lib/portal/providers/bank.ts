import "server-only";
import type {
  BankScope,
  BankAccount,
  BankBalance,
  TransactionPage,
  MockBankId,
} from "./bank-types";
export interface BankConnectionProvider {
  // Implementations must honor the AbortSignal and bound all response arrays.
  // Hosted authorization/callback verification for a real partner requires separate reviewed code.
  readonly id: string;
  readonly mock: boolean;
  createConsent(
    input: {
      bankId: MockBankId;
      scopes: BankScope[];
      expiresAt: Date;
      idempotencyKey: string;
    },
    signal: AbortSignal,
  ): Promise<{
    reference: string;
    status: "ACTIVE" | "PENDING";
    expiresAt: Date;
  }>;
  getConsentStatus(
    reference: string,
    signal: AbortSignal,
  ): Promise<"ACTIVE" | "PENDING" | "EXPIRED" | "REVOKED">;
  listAccounts(reference: string, signal: AbortSignal): Promise<BankAccount[]>;
  getBalances(reference: string, signal: AbortSignal): Promise<BankBalance[]>;
  getTransactions(
    reference: string,
    accountId: string,
    cursor: string | null,
    signal: AbortSignal,
  ): Promise<TransactionPage>;
  // Must be idempotent. An adapter must not report acknowledgement before the provider confirms it.
  revokeConsent(
    reference: string,
    signal: AbortSignal,
  ): Promise<{ revoked: boolean }>;
}
