import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Prefer .ts/.tsx over .js when both exist in the same directory.
    // This prevents compiled build artifacts (*.js) from shadowing source files.
    extensions: [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs", ".json"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Only measure coverage for files that have corresponding tests.
      // Full-package coverage requires testing all 111 source files; T13 targets
      // the highest-value utility + primitive + adapter layer.
      include: [
        "src/lib/utils.ts",
        "src/adapters/router.tsx",
        "src/primitives/spinner.tsx",
        "src/primitives/badge.tsx",
        "src/primitives/empty-state.tsx",
        "src/primitives/confirm-dialog.tsx",
        "src/components/Avatar.tsx",
        "src/components/Button.tsx",
        "src/auth/tour-utils.ts",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
