import { describe, expect, it } from "vitest";
// Imports the module under test directly, NOT the "@/lib/onboarding" barrel.
// The barrel also re-exports queries.ts and guard.ts, which reach Supabase and
// the environment - pulling all that in to test four pure functions would be
// backwards. The barrel rule in ARCHITECTURE.md governs cross-domain imports in
// application code; a unit test targets one unit.
import {
  canAccessStep,
  isComplete,
  isOldEnough,
  nextStep,
  stepPath,
} from "@/lib/onboarding/rules";
import type { OnboardingState } from "@/lib/onboarding/types";

/**
 * Testing PURE LOGIC. No database, no browser, no session, no mocks.
 *
 * The entire onboarding flow is verified here in milliseconds, because every
 * decision lives in rules.ts rather than being scattered across five page files.
 * That is the whole return on keeping business rules I/O-free.
 */

const state = (overrides: Partial<OnboardingState> = {}): OnboardingState => ({
  ageConfirmed: false,
  phoneVerified: false,
  hasAccount: false,
  hasConsented: false,
  ...overrides,
});

const completed = state({
  ageConfirmed: true,
  phoneVerified: true,
  hasAccount: true,
  hasConsented: true,
});

describe("nextStep", () => {
  it("starts at the age gate", () => {
    expect(nextStep(state())).toBe("age-gate");
  });

  it("advances one gate at a time", () => {
    expect(nextStep(state({ ageConfirmed: true }))).toBe("phone");
    expect(nextStep(state({ ageConfirmed: true, phoneVerified: true }))).toBe("profile");
    expect(
      nextStep(state({ ageConfirmed: true, phoneVerified: true, hasAccount: true })),
    ).toBe("consent");
    expect(nextStep(completed)).toBe("done");
  });

  it("ignores later progress while an earlier gate is open", () => {
    // Someone with an account but no age confirmation still starts at the gate.
    expect(nextStep(state({ hasAccount: true, hasConsented: true }))).toBe("age-gate");
  });
});

describe("canAccessStep", () => {
  it("allows the current step", () => {
    expect(canAccessStep(state(), "age-gate")).toBe(true);
  });

  it("allows going back to a cleared step", () => {
    expect(canAccessStep(state({ ageConfirmed: true }), "age-gate")).toBe(true);
  });

  it("blocks skipping ahead", () => {
    expect(canAccessStep(state(), "profile")).toBe(false);
    expect(canAccessStep(state({ ageConfirmed: true }), "consent")).toBe(false);
  });

  it("allows every step once onboarding is complete", () => {
    expect(canAccessStep(completed, "done")).toBe(true);
    expect(canAccessStep(completed, "phone")).toBe(true);
  });
});

describe("isComplete", () => {
  it("is false until every gate is cleared", () => {
    expect(isComplete(state({ ageConfirmed: true, phoneVerified: true }))).toBe(false);
  });

  it("is true when all four are true", () => {
    expect(isComplete(completed)).toBe(true);
  });
});

describe("stepPath", () => {
  it("maps the first step to the bare route", () => {
    expect(stepPath("age-gate")).toBe("/onboarding");
  });

  it("maps later steps to a child route", () => {
    expect(stepPath("profile")).toBe("/onboarding/profile");
  });
});

describe("isOldEnough", () => {
  const now = new Date("2026-08-24");

  it("accepts someone well over 21", () => {
    expect(isOldEnough(new Date("1990-01-01"), now)).toBe(true);
  });

  it("rejects someone under 21", () => {
    expect(isOldEnough(new Date("2010-01-01"), now)).toBe(false);
  });

  it("accepts someone on their 21st birthday", () => {
    expect(isOldEnough(new Date("2005-08-24"), now)).toBe(true);
  });

  it("rejects someone one day short of 21", () => {
    expect(isOldEnough(new Date("2005-08-25"), now)).toBe(false);
  });
});
