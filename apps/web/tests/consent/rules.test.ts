import { describe, expect, it } from "vitest";
import { CURRENT_POLICY_VERSION, hasRequiredConsents, type Consent } from "@/lib/consent";

const consent = (overrides: Partial<Consent> = {}): Consent => ({
  kind: "terms",
  granted: true,
  policyVersion: CURRENT_POLICY_VERSION,
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("hasRequiredConsents", () => {
  it("is false with nothing granted", () => {
    expect(hasRequiredConsents([])).toBe(false);
  });

  it("is false when only some required consents are granted", () => {
    expect(hasRequiredConsents([consent({ kind: "terms" })])).toBe(false);
  });

  it("is true when terms and privacy are both granted", () => {
    const consents = [consent({ kind: "terms" }), consent({ kind: "privacy" })];
    expect(hasRequiredConsents(consents)).toBe(true);
  });

  it("ignores consent granted under an older policy version", () => {
    const consents = [
      consent({ kind: "terms", policyVersion: "2020-01-01" }),
      consent({ kind: "privacy" }),
    ];
    expect(hasRequiredConsents(consents)).toBe(false);
  });

  it("ignores withdrawn consent", () => {
    const consents = [
      consent({ kind: "terms", granted: false }),
      consent({ kind: "privacy" }),
    ];
    expect(hasRequiredConsents(consents)).toBe(false);
  });

  it("does not require marketing consent", () => {
    const consents = [consent({ kind: "terms" }), consent({ kind: "privacy" })];
    expect(hasRequiredConsents(consents)).toBe(true);
  });
});
