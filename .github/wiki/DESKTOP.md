# nChat Desktop — Tauri 2

nChat Desktop is a native desktop application built with [Tauri 2](https://tauri.app).
It wraps the nChat web frontend in a native shell with full OS integration.

## Architecture

```
nchat/desktop/                  ← workspace package (@nself-chat/desktop)
  src/                          ← React/Vite renderer (shares @nself-chat/web)
  src-tauri/                    ← Rust shell
    src/
      commands/                 ← IPC command handlers (EIE layout)
        app.rs                  ← app_get_version, app_get_name, app_get_path,
                                   app_set_badge_count, toggle_autostart
        window.rs               ← window_minimize, maximize, close, is_maximized
        shell.rs                ← shell_open_external, shell_show_item_in_folder
        clipboard.rs            ← clipboard_read/write_text/image, clipboard_has_image
        notification.rs         ← notification_show
        update.rs               ← update_check (with semver downgrade guard)
        drag.rs                 ← drag_start_file
      menu.rs                   ← Native menu builder + event handler
      tray.rs                   ← System tray icon + context menu
      state/                    ← App state (AppState)
      lib.rs                    ← Tauri builder + plugin wiring
    tauri.conf.json             ← Identifier: org.nself.chat
    Cargo.toml
    capabilities/
      default.json              ← Core permissions
      desktop.json              ← Tray permissions (macOS/Windows/Linux)
```

## IPC Channel Registry

All channels are registered in `src-tauri/src/lib.rs` via `tauri::generate_handler![]`.
Run `pnpm ipc-parity` to verify all channels are present.

| Channel (snake_case) | Frontend invoke() | Status |
|---|---|---|
| `app_get_version` | `invoke("app_get_version")` | Registered |
| `app_get_name` | `invoke("app_get_name")` | Registered |
| `app_get_path` | `invoke("app_get_path", { name })` | Registered |
| `app_set_badge_count` | `invoke("app_set_badge_count", { count })` | Registered (macOS dock badge; no-op on other platforms) |
| `toggle_autostart` | `invoke("toggle_autostart", { enabled })` | Registered |
| `window_minimize` | `invoke("window_minimize")` | Registered |
| `window_maximize` | `invoke("window_maximize")` | Registered |
| `window_close` | `invoke("window_close")` | Registered |
| `window_is_maximized` | `invoke("window_is_maximized")` | Registered |
| `shell_open_external` | `invoke("shell_open_external", { url })` | Registered |
| `shell_show_item_in_folder` | `invoke("shell_show_item_in_folder", { path })` | Registered |
| `clipboard_read_text` | `invoke("clipboard_read_text")` | Registered |
| `clipboard_write_text` | `invoke("clipboard_write_text", { text })` | Registered |
| `clipboard_read_image` | `invoke("clipboard_read_image")` | Registered |
| `clipboard_write_image` | `invoke("clipboard_write_image", { base64Image })` | Registered |
| `clipboard_has_image` | `invoke("clipboard_has_image")` | Registered |
| `notification_show` | `invoke("notification_show", { title, body })` | Registered |
| `update_check` | `invoke("update_check")` | Registered (semver downgrade guard active) |
| `drag_start_file` | N/A — uses Tauri drag-and-drop API directly | Registered |

## Native Menu

The native application menu is built in `src-tauri/src/menu.rs`. Menu events are forwarded to the
renderer as Tauri events:

| Menu Item | Event emitted to renderer |
|---|---|
| File → New Conversation | `menu:new-conversation` |
| File → Preferences… | `menu:preferences` |
| View → Toggle Sidebar | `menu:toggle-sidebar` |
| Window → Bring All to Front | *(no event — focuses main window)* |

## Deep Links

The app registers the `nchat://` URL scheme. Supported patterns:

| URL | Renderer event |
|---|---|
| `nchat://chat/<room>` | `deep-link:chat` with room as payload |
| `nchat://invite/<token>` | `deep-link:invite` with token as payload |

## Auto-Updater

- Endpoint: `https://packages.nself.org/chat-desktop/latest-{{target}}-{{arch}}.json`
- Updater artifacts are published to S3 (`s3://packages.nself.org/chat-desktop/`) on every tag push
- Semver downgrade guard: updates with remote version ≤ current version are silently ignored

## Window State Persistence

Window size, position, maximized state, and fullscreen state are restored across launches via
`tauri-plugin-window-state` with `stateFlags: "SIZE | POSITION | MAXIMIZED | FULLSCREEN"`.

## System Tray

On macOS and Windows, a tray icon is shown with a context menu:
- Show nChat
- New Conversation
- Preferences
- Quit nChat

On macOS, closing the window hides it to the tray (Command+Q quits).
On Windows/Linux, closing the window exits the app.

## Crash Reporting (Optional)

Set `SENTRY_DSN` in the environment before launching. If unset, crash reporting is disabled.
See `.env.example`.

## Icons — T20 Build Step

To regenerate all icon variants from the master source:

```bash
# Source master icon (1024×1024 PNG):
# .claude/docs/brand/icons/nchat-512.png  (or commission a dedicated nchat icon)
cp /path/to/nchat-1024.png nchat/desktop/src-tauri/icons/source-1024.png

# Generate all icon variants:
cd nchat/desktop
pnpm tauri icon src-tauri/icons/source-1024.png
```

This produces `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico` as required
by `tauri.conf.json`.

## Windows DPI Scaling — T23

Tauri 2 sets the `dpiAware` manifest entry automatically for all Windows builds. No custom
DPI application manifest is required. The `tauri.conf.json` `windows[].scaleFactor` field
(when set) overrides the system scale factor if needed.

## T21 — Physical Device Migration Test Results

Record test results here after running on each platform. Update `PASS`/`FAIL` and date.

| Platform | Version | Arch | Build type | Window resize | Tray | Deep-link | Updater | Notification | Clipboard | Result | Date | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| macOS 15 Sequoia | 0.0.0 | arm64 | debug | - | - | - | - | - | - | PENDING | - | - |
| macOS 13 Ventura | 0.0.0 | x64 | debug | - | - | - | - | - | - | PENDING | - | - |
| Windows 11 | 0.0.0 | x64 | debug | - | - | - | - | - | - | PENDING | - | - |
| Windows 10 | 0.0.0 | x64 | debug | - | - | - | - | - | - | PENDING | - | - |
| Ubuntu 22.04 | 0.0.0 | x64 | debug | - | - | - | - | - | - | PENDING | - | - |

Update this table as physical-device testing completes (T21).

## Development

```bash
# Install deps
cd nchat && pnpm install

# Run in dev mode
cd desktop && pnpm tauri:dev

# Build release
cd desktop && pnpm tauri:build

# Unit tests
cd desktop && pnpm test

# IPC parity check
cd desktop && pnpm ipc-parity

# E2E (requires a built binary)
cd desktop && pnpm test:e2e
```

## Bundle Size Budget

The macOS arm64 DMG must not exceed **90 MB**. This is enforced by the
`desktop-macos.yml` CI workflow (T27). If the budget is exceeded, remove
unused assets or enable compression in `tauri.conf.json` → `bundle.macOS`.
