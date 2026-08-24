import { describe, expect, it } from "vitest";
import { matchLineItems, type Campaign } from "@/lib/matching";
import type { ReceiptLineItem } from "@/lib/receipts";

const lineItem = (overrides: Partial<ReceiptLineItem> = {}): ReceiptLineItem => ({
  sku: "SKU-1",
  description: "Product",
  quantity: 1,
  unitPrice: 10,
  totalPrice: 10,
  ...overrides,
});

const campaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  id: "camp-1",
  skus: ["SKU-1"],
  pointsPerUnit: 5,
  active: true,
  ...overrides,
});

describe("matchLineItems", () => {
  it("awards points for a line item that matches an active campaign", () => {
    const result = matchLineItems([lineItem({ quantity: 2 })], [campaign()]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ campaignId: "camp-1", pointsAwarded: 10 });
  });

  it("ignores line items with no SKU", () => {
    const result = matchLineItems([lineItem({ sku: null })], [campaign()]);
    expect(result).toHaveLength(0);
  });

  it("ignores inactive campaigns", () => {
    const result = matchLineItems([lineItem()], [campaign({ active: false })]);
    expect(result).toHaveLength(0);
  });

  it("ignores line items whose SKU is not covered by any campaign", () => {
    const result = matchLineItems([lineItem({ sku: "SKU-999" })], [campaign()]);
    expect(result).toHaveLength(0);
  });

  it("returns one match per matching line item across multiple campaigns", () => {
    const items = [lineItem({ sku: "SKU-1" }), lineItem({ sku: "SKU-2" })];
    const campaigns = [campaign({ id: "camp-1", skus: ["SKU-1"] }), campaign({ id: "camp-2", skus: ["SKU-2"], pointsPerUnit: 3 })];

    const result = matchLineItems(items, campaigns);

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.campaignId)).toEqual(["camp-1", "camp-2"]);
  });
});
