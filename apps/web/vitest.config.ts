import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // See the note in tests/stubs/server-only.ts.
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    // Unit tests only. e2e/ is Playwright - it uses a `test()` from a different
    // package and fails loudly if Vitest collects it.
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      // Thresholds mirror TDD section 4.3. lib/matching and lib/ledger carry the
      // business-logic bar; everything else in this app defaults to the app-wide floor.
      thresholds: {
        // Pure business rules carry the high bar - they have no excuse not to.
        "lib/**/rules.ts": { statements: 90, branches: 85, functions: 90, lines: 90 },
        "**": { statements: 60, branches: 50, functions: 60, lines: 60 },
      },
      exclude: [
        "**/*.config.*",
        "**/.next/**",
        "**/tests/**",
        // Presentation and wiring - covered by E2E, not unit tests.
        "**/app/**",
        "**/components/**",
        "**/middleware.ts",
        "**/lib/**/index.ts",
        "**/lib/**/types.ts",
      ],
    },
  },
});
