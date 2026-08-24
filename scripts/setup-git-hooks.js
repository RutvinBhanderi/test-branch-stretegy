// Idempotent husky install - safe to run in CI (skips) and locally (installs hooks).
const { execSync } = require("node:child_process");

if (process.env.CI) {
  console.log("CI environment detected - skipping git hook setup.");
  process.exit(0);
}

try {
  execSync("husky", { stdio: "inherit" });
} catch (err) {
  console.warn("husky setup skipped:", err.message);
}
