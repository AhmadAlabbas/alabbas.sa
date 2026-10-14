export const mockBanks = ["sample-bank-a", "sample-bank-b"] as const;
export type MockBankId = (typeof mockBanks)[number];
export const bankScopes = ["ACCOUNTS", "BALANCES", "TRANSACTIONS"] as const;
export type BankScope = (typeof bankScopes)[number];
export type BankAccount = {
  id: string;
  kind: "CURRENT" | "SAVINGS";
  maskedIdentifier: string;
  currency: "SAR";
};
export type BankBalance = {
  accountId: string;
  availableCents: number;
  bookedCents: number;
  asOf: string;
};
export type BankTransaction = {
  id: string;
  date: string;
  kind:
    | "PURCHASE"
    | "REFUND"
    | "SALARY"
    | "RENT"
    | "GROCERIES"
    | "UTILITIES"
    | "CONTRIBUTION";
  amountCents: number;
  currency: "SAR";
};
export type TransactionPage = {
  items: BankTransaction[];
  nextCursor: string | null;
};
