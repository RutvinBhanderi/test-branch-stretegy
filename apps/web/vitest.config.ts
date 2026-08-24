import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      // Thresholds mirror TDD section 4.3. lib/matching and lib/ledger carry the
      // business-logic bar; everything else in this app defaults to the app-wide floor.
      thresholds: {
        "lib/matching/**": { statements: 90, branches: 85, functions: 90, lines: 90 },
        "**": { statements: 60, branches: 50, functions: 60, lines: 60 },
      },
      exclude: [
        "**/*.config.*",
        "**/.next/**",
        "**/tests/**",
        "**/app/**/layout.tsx",
        "**/app/manifest.ts",
      ],
    },
  },
});
