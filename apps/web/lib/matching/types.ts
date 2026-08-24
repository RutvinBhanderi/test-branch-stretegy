import type { ReceiptLineItem } from "@/lib/receipts";

/** The nouns of the matching domain. */

export interface Campaign {
  id: string;
  skus: string[];
  pointsPerUnit: number;
  active: boolean;
}

export interface CampaignMatch {
  lineItem: ReceiptLineItem;
  campaignId: string;
  pointsAwarded: number;
}
