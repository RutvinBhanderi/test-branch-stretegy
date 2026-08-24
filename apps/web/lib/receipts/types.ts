/**
 * The nouns of the receipts domain.
 *
 * `ReceiptLineItem` is OWNED here and merely consumed by lib/matching - which is
 * why matching imports it from "@/lib/receipts" rather than both of them reaching
 * into a shared bucket. The import line makes the dependency visible.
 */

export interface ReceiptLineItem {
  sku: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * The OCR service's output contract, held in sync by hand.
 *
 * When services/ocr ships, generate both sides from a shared JSON Schema in
 * packages/contracts instead - a TypeScript interface enforces nothing across a
 * process boundary.
 */
export interface ExtractedReceipt {
  receiptId: string;
  merchant: string;
  purchasedAt: string;
  lineItems: ReceiptLineItem[];
  total: number;
}
