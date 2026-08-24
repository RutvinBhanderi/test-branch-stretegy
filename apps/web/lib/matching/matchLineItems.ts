import type { CampaignMatch, ReceiptLineItem } from "@greenback/types";

export interface Campaign {
  id: string;
  skus: string[];
  pointsPerUnit: number;
  active: boolean;
}

/**
 * Matches extracted receipt line items against active campaigns and computes points.
 *
 * Deliberately pure (no I/O, no Supabase, no fetch) so it is fully unit-testable and
 * covered by the >=90% coverage target on business logic - see TDD section 4.3.
 */
export function matchLineItems(
  lineItems: ReceiptLineItem[],
  campaigns: Campaign[],
): CampaignMatch[] {
  const activeCampaigns = campaigns.filter((c) => c.active);

  const matches: CampaignMatch[] = [];

  for (const lineItem of lineItems) {
    if (!lineItem.sku) continue;

    const campaign = activeCampaigns.find((c) => c.skus.includes(lineItem.sku!));
    if (!campaign) continue;

    matches.push({
      lineItem,
      campaignId: campaign.id,
      pointsAwarded: campaign.pointsPerUnit * lineItem.quantity,
    });
  }

  return matches;
}
