// Barrel export for shared types used across apps/web.

// -----------------------------------------------------------------------------
// Supabase generated types
// -----------------------------------------------------------------------------
// Once the schema in supabase/migrations is applied to a project, generate this file with:
//   pnpm supabase gen types typescript --project-id <project-ref> --schema public > packages/types/src/database.ts
// and re-export it below. Left as a placeholder until the schema is applied.
// export type { Database } from "./database";

// -----------------------------------------------------------------------------
// Domain types (hand-written, until Supabase codegen replaces them)
// -----------------------------------------------------------------------------

export type LedgerEntryType = "EARN" | "REDEEM" | "ADJUSTMENT" | "EXPIRY";

export interface LedgerEntry {
  id: string;
  accountId: string;
  type: LedgerEntryType;
  points: number;
  receiptId: string | null;
  createdAt: string;
}

export interface ReceiptLineItem {
  sku: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ExtractedReceipt {
  receiptId: string;
  merchant: string;
  purchasedAt: string;
  lineItems: ReceiptLineItem[];
  total: number;
}

export interface CampaignMatch {
  lineItem: ReceiptLineItem;
  campaignId: string;
  pointsAwarded: number;
}
