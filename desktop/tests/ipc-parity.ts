/**
 * T26 — IPC parity regression test
 *
 * Verifies that every IPC channel exposed by the Tauri 2 shell matches the
 * expected registry. Run via `pnpm ipc-parity`.
 *
 * Exit codes:
 *   0 — all expected channels present
 *   1 — one or more channels missing
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Canonical IPC channel registry.
 * snake_case = Tauri command name (matches `#[tauri::command]` fn name).
 * Source: S12 sprint spec — T01..T11 implementation.
 *
 * N/A entries are intentional: drag_start_file uses Tauri drag-and-drop API
 * directly and does not appear as a frontend invoke() target.
 */
const EXPECTED_CHANNELS: { name: string; note?: string }[] = [
  { name: "app_get_version" },
  { name: "app_get_name" },
  { name: "app_get_path" },
  { name: "app_set_badge_count" },
  { name: "toggle_autostart" },
  { name: "window_minimize" },
  { name: "window_maximize" },
  { name: "window_close" },
  { name: "window_is_maximized" },
  { name: "shell_open_external" },
  { name: "shell_show_item_in_folder" },
  { name: "clipboard_read_text" },
  { name: "clipboard_write_text" },
  { name: "clipboard_read_image" },
  { name: "clipboard_write_image" },
  { name: "clipboard_has_image" },
  { name: "notification_show" },
  { name: "update_check" },
  {
    name: "drag_start_file",
    note: "Intentional N/A — uses Tauri drag-and-drop API, not invoke()",
  },
];

function extractCommandsFromLibRs(libRsPath: string): string[] {
  const src = fs.readFileSync(libRsPath, "utf-8");
  // Match `tauri::generate_handler![...]` block
  const handlerMatch = src.match(
    /tauri::generate_handler!\s*\[([^\]]+)\]/s
  );
  if (!handlerMatch) return [];
  return handlerMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      // commands::app::app_get_version → app_get_version
      const parts = entry.split("::");
      return parts[parts.length - 1];
    });
}

function main() {
  const libRsPath = path.resolve(
    __dirname,
    "../src-tauri/src/lib.rs"
  );

  if (!fs.existsSync(libRsPath)) {
    console.error(`ERROR: lib.rs not found at ${libRsPath}`);
    process.exit(1);
  }

  const registered = extractCommandsFromLibRs(libRsPath);
  const missing: string[] = [];
  const naChannels: string[] = [];

  for (const ch of EXPECTED_CHANNELS) {
    if (ch.note?.includes("N/A")) {
      naChannels.push(ch.name);
      continue;
    }
    if (!registered.includes(ch.name)) {
      missing.push(ch.name);
    }
  }

  console.log(`IPC parity check`);
  console.log(`  Registered commands : ${registered.length}`);
  console.log(`  Expected channels   : ${EXPECTED_CHANNELS.length}`);
  console.log(`  Intentional N/A     : ${naChannels.join(", ") || "none"}`);

  if (missing.length > 0) {
    console.error(`\nFAIL — missing channels:`);
    missing.forEach((m) => console.error(`  ✗ ${m}`));
    process.exit(1);
  }

  console.log(`\nPASS — all expected channels registered`);
  process.exit(0);
}

main();
