import { defineConfig } from "@playwright/test";

const TAURI_BINARY = process.env.TAURI_BINARY ?? "./src-tauri/target/debug/nchat-desktop";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    // tauri-driver exposes a WebDriver endpoint; connect via remote browser.
    connectOptions: {
      wsEndpoint: "ws://localhost:4444",
    },
  },

  // Start tauri-driver before the test run.
  webServer: {
    command: `tauri-driver --binary ${TAURI_BINARY}`,
    url: "http://localhost:4444",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },

  projects: [
    {
      name: "desktop",
    },
  ],
});
