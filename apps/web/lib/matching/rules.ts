import type { ReceiptLineItem } from "@/lib/receipts";
import type { Campaign, CampaignMatch } from "./types";

/**
 * Pure logic. No I/O, no Supabase, no fetch - fully unit-testable and carrying
 * the highest coverage bar in the app (see apps/web/vitest.config.ts).
 */
export function matchLineItems(
  lineItems: ReceiptLineItem[],
  campaigns: Campaign[],
): CampaignMatch[] {
  const activeCampaigns = campaigns.filter((campaign) => campaign.active);

  const matches: CampaignMatch[] = [];

  for (const lineItem of lineItems) {
    if (!lineItem.sku) continue;

    const sku = lineItem.sku;
    const campaign = activeCampaigns.find((candidate) => candidate.skus.includes(sku));
    if (!campaign) continue;

    matches.push({
      lineItem,
      campaignId: campaign.id,
      pointsAwarded: campaign.pointsPerUnit * lineItem.quantity,
    });
  }

  return matches;
}
