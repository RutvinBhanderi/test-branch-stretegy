/** The nouns of the ledger domain. */

export type LedgerEntryType = "EARN" | "REDEEM" | "ADJUSTMENT" | "EXPIRY";

export interface LedgerEntry {
  id: string;
  accountId: string;
  type: LedgerEntryType;
  points: number;
  receiptId: string | null;
  createdAt: string;
}
