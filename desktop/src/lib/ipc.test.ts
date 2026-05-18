/**
 * T29 — unit tests for the IPC wrapper layer.
 * Uses @tauri-apps/api/mocks mockIPC to intercept invoke() calls
 * without requiring a real Tauri runtime.
 */
import { describe, it, expect, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import {
  getAppInfo,
  windowMinimize,
  notificationShow,
  checkForUpdate,
} from "./ipc";

describe("IPC — app_info", () => {
  it("returns name and version from the shell", async () => {
    mockIPC((cmd) => {
      if (cmd === "app_get_name") return "nChat";
      if (cmd === "app_get_version") return "0.0.0";
    });

    const info = await getAppInfo();
    expect(info.name).toBe("nChat");
    expect(info.version).toBe("0.0.0");
  });

  it("propagates errors from the shell", async () => {
    mockIPC(() => {
      throw new Error("shell error");
    });

    await expect(getAppInfo()).rejects.toThrow("shell error");
  });
});

describe("IPC — window_minimize", () => {
  it("calls window_minimize without arguments", async () => {
    const calls: string[] = [];
    mockIPC((cmd) => {
      calls.push(cmd);
    });

    await windowMinimize();
    expect(calls).toContain("window_minimize");
  });
});

describe("IPC — notification_show", () => {
  it("passes title and body to the shell", async () => {
    let captured: Record<string, unknown> = {};
    mockIPC((cmd, args) => {
      if (cmd === "notification_show") captured = args as Record<string, unknown>;
    });

    await notificationShow("Test Title", "Test body text");
    expect(captured["title"]).toBe("Test Title");
    expect(captured["body"]).toBe("Test body text");
  });
});

describe("IPC — update_check", () => {
  it("returns UpdateInfo when an update is available", async () => {
    mockIPC((cmd) => {
      if (cmd === "update_check")
        return { available: true, version: "1.0.0", notes: "Bugfixes" };
    });

    const result = await checkForUpdate();
    expect(result.available).toBe(true);
    expect(result.version).toBe("1.0.0");
    expect(result.notes).toBe("Bugfixes");
  });

  it("returns available=false when no update", async () => {
    mockIPC((cmd) => {
      if (cmd === "update_check")
        return { available: false, version: null, notes: null };
    });

    const result = await checkForUpdate();
    expect(result.available).toBe(false);
    expect(result.version).toBeNull();
  });

  it("respects the downgrade guard (returns available=false for same version)", async () => {
    // The Rust downgrade guard returns available:false for remote <= current.
    // The IPC wrapper should pass this through unchanged.
    mockIPC((cmd) => {
      if (cmd === "update_check")
        return { available: false, version: null, notes: null };
    });

    const result = await checkForUpdate();
    expect(result.available).toBe(false);
  });
});
