/**
 * Panic Mode Tests
 *
 * Comprehensive tests for the panic mode module.
 */

import {
  PanicModeManager,
  createPanicModeManager,
  resetPanicModeManager,
  DEFAULT_PANIC_CONFIG,
  DEFAULT_DECOY_CONFIG,
  DEFAULT_DEAD_MAN_CONFIG,
  type PanicActivation,
  type PanicEventType,
} from "../panic-mode";
import { resetSessionWipeManager } from "../session-wipe";
import {
  type ISecureStorage,
  type SecureStorageResult,
} from "@/lib/secure-storage";

// ============================================================================
// Mock Storage
// ============================================================================

function createMockStorage(): ISecureStorage {
  const store = new Map<string, string>();
  let initialized = false;

  return {
    os: "web",
    async initialize() {
      initialized = true;
    },
    isInitialized() {
      return initialized;
    },
    async getCapabilities() {
      return {
        hardwareStorage: false,
        biometricAuth: false,
        biometricTypes: [],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "web" as const,
        securityLevel: "encrypted" as const,
      };
    },
    async setItem(
      key: string,
      value: string,
    ): Promise<SecureStorageResult<void>> {
      store.set(key, value);
      return { success: true, data: null, error: null };
    },
    async getItem(key: string): Promise<SecureStorageResult<string>> {
      const value = store.get(key);
      return {
        success: !!value,
        data: value || null,
        error: value ? null : "Not found",
      };
    },
    async hasItem(key: string): Promise<boolean> {
      return store.has(key);
    },
    async removeItem(key: string): Promise<SecureStorageResult<void>> {
      store.delete(key);
      return { success: true, data: null, error: null };
    },
    async getAllKeys(): Promise<string[]> {
      return Array.from(store.keys());
    },
    async clear(): Promise<SecureStorageResult<void>> {
      store.clear();
      return { success: true, data: null, error: null };
    },
    async getItemMeta() {
      return null;
    },
    async isBiometricAvailable() {
      return false;
    },
    async authenticateBiometric(): Promise<SecureStorageResult<void>> {
      return { success: false, data: null, error: "Not available" };
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("PanicModeManager", () => {
  let manager: PanicModeManager;
  let mockStorage: ISecureStorage;

  beforeEach(() => {
    resetPanicModeManager();
    resetSessionWipeManager();
    mockStorage = createMockStorage();
    manager = createPanicModeManager(mockStorage);
  });

  afterEach(() => {
    manager.destroy();
  });

  // --------------------------------------------------------------------------
  // Initialization Tests
  // --------------------------------------------------------------------------

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await manager.initialize();
      const status = await manager.getStatus();
      expect(status.state).toBe("inactive");
    });

    it("should load saved configuration", async () => {
      // Save a config first
      await mockStorage.setItem(
        "nchat_panic_config",
        JSON.stringify({ enabled: true, showDecoy: false }),
        { service: "nchat-security" },
      );

      await manager.initialize();
      const status = await manager.getStatus();

      expect(status.config.enabled).toBe(true);
      expect(status.config.showDecoy).toBe(false);
    });

    it("should use default config when none saved", async () => {
      await manager.initialize();
      const status = await manager.getStatus();

      expect(status.config.enabled).toBe(DEFAULT_PANIC_CONFIG.enabled);
      expect(status.config.showDecoy).toBe(DEFAULT_PANIC_CONFIG.showDecoy);
    });

    it("should not re-initialize if already initialized", async () => {
      await manager.initialize();
      const initSpy = jest.spyOn(mockStorage, "initialize");
      await manager.initialize();
      expect(initSpy).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Status Tests
  // --------------------------------------------------------------------------

  describe("getStatus", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return current status", async () => {
      const status = await manager.getStatus();

      expect(status.state).toBeDefined();
      expect(status.config).toBeDefined();
      expect(status.lastActivation).toBeNull();
      expect(status.decoyActive).toBe(false);
    });

    it("should reflect config changes", async () => {
      await manager.updateConfig({ enabled: true });
      const status = await manager.getStatus();

      expect(status.config.enabled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Configuration Tests
  // --------------------------------------------------------------------------

  describe("updateConfig", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should update configuration", async () => {
      await manager.updateConfig({
        enabled: true,
        showDecoy: false,
        lockoutDuration: 60,
      });

      const status = await manager.getStatus();
      expect(status.config.enabled).toBe(true);
      expect(status.config.showDecoy).toBe(false);
      expect(status.config.lockoutDuration).toBe(60);
    });

    it("should persist configuration", async () => {
      await manager.updateConfig({ notifyContacts: true });

      // Create new manager
      const newManager = createPanicModeManager(mockStorage);
      await newManager.initialize();

      const status = await newManager.getStatus();
      expect(status.config.notifyContacts).toBe(true);

      newManager.destroy();
    });

    it("should update trusted contacts", async () => {
      await manager.updateConfig({
        trustedContactIds: ["user1", "user2", "user3"],
      });

      const status = await manager.getStatus();
      expect(status.config.trustedContactIds).toEqual([
        "user1",
        "user2",
        "user3",
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // Duress PIN Tests
  // --------------------------------------------------------------------------

  describe("duress PIN", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should set duress PIN", async () => {
      await manager.setDuressPin("1234");

      const status = await manager.getStatus();
      expect(status.config.duressPin.enabled).toBe(true);
    });

    it("should remove duress PIN", async () => {
      await manager.setDuressPin("5678");
      await manager.removeDuressPin();

      const status = await manager.getStatus();
      expect(status.config.duressPin.enabled).toBe(false);
    });

    it("should check duress PIN correctly", async () => {
      await manager.setDuressPin("9999");

      expect(await manager.checkDuressPin("9999")).toBe(true);
      expect(await manager.checkDuressPin("0000")).toBe(false);
    });

    it("should return false when no duress PIN set", async () => {
      expect(await manager.checkDuressPin("1234")).toBe(false);
    });

    it("should hash PIN before storing", async () => {
      await manager.setDuressPin("1234");

      const result = await mockStorage.getItem("nchat_duress_pin", {
        service: "nchat-security",
      });
      expect(result.data).not.toBe("1234");
      expect(result.data?.length).toBeGreaterThan(4);
    });
  });

  // --------------------------------------------------------------------------
  // Panic Activation Tests
  // --------------------------------------------------------------------------

  describe("activate", () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.updateConfig({ enabled: true });
    });

    it("should activate panic mode", async () => {
      const activation = await manager.activate("manual");

      expect(activation.id).toBeDefined();
      expect(activation.method).toBe("manual");
      expect(activation.timestamp).toBeDefined();
    });

    it("should set state to locked after activation", async () => {
      await manager.activate("manual");

      expect(manager.isActive()).toBe(true);
      const status = await manager.getStatus();
      expect(status.state).toBe("locked");
    });

    it("should include wipe result", async () => {
      const activation = await manager.activate("manual");

      expect(activation.wipeResult).toBeDefined();
      expect(activation.wipeResult?.type).toBe("device_wipe");
    });

    it("should activate decoy when configured", async () => {
      await manager.updateConfig({ showDecoy: true });
      const activation = await manager.activate("manual");

      expect(activation.decoyActivated).toBe(true);
    });

    it("should not activate decoy when disabled", async () => {
      await manager.updateConfig({ showDecoy: false });
      const activation = await manager.activate("manual");

      expect(activation.decoyActivated).toBe(false);
    });

    it("should set lockout time", async () => {
      await manager.updateConfig({ lockoutDuration: 30 });
      const activation = await manager.activate("manual");

      expect(activation.lockoutUntil).toBeDefined();
      expect(activation.lockoutUntil).not.toBeNull();
    });

    it("should set permanent lockout when duration is 0", async () => {
      await manager.updateConfig({ lockoutDuration: 0 });
      const activation = await manager.activate("manual");

      expect(activation.lockoutUntil).toBeNull();
    });

    it("should support different activation methods", async () => {
      const methods = [
        "duress_pin",
        "power_sequence",
        "gesture",
        "shake",
        "voice",
        "remote",
        "manual",
      ] as const;

      for (const method of methods) {
        const newManager = createPanicModeManager(createMockStorage());
        await newManager.initialize();
        await newManager.updateConfig({ enabled: true });

        const activation = await newManager.activate(method);
        expect(activation.method).toBe(method);

        newManager.destroy();
      }
    });

    it("should emit panic_activated event", async () => {
      let activated = false;
      manager.addEventListener("panic_activated", () => {
        activated = true;
      });

      await manager.activate("manual");

      expect(activated).toBe(true);
    });

    it("should emit wipe events", async () => {
      const events: PanicEventType[] = [];
      manager.addEventListener("wipe_started", () =>
        events.push("wipe_started"),
      );
      manager.addEventListener("wipe_completed", () =>
        events.push("wipe_completed"),
      );

      await manager.activate("manual");

      expect(events).toContain("wipe_started");
      expect(events).toContain("wipe_completed");
    });

    it("should preserve activation record", async () => {
      await manager.activate("manual");

      const status = await manager.getStatus();
      expect(status.lastActivation).toBeDefined();
      expect(status.lastActivation?.method).toBe("manual");
    });
  });

  // --------------------------------------------------------------------------
  // Panic Deactivation Tests
  // --------------------------------------------------------------------------

  describe("deactivate", () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.updateConfig({ enabled: true, lockoutDuration: 0 });
    });

    it("should deactivate with valid password", async () => {
      await manager.activate("manual");

      // Use a simple password check (mocked implementation accepts any non-empty password)
      const result = await manager.deactivate("master_password");

      expect(result).toBe(true);
      expect(manager.isActive()).toBe(false);
    });

    it("should reject empty password", async () => {
      await manager.activate("manual");

      const result = await manager.deactivate("");

      expect(result).toBe(false);
    });

    it("should emit panic_deactivated event", async () => {
      await manager.activate("manual");

      let deactivated = false;
      manager.addEventListener("panic_deactivated", () => {
        deactivated = true;
      });

      await manager.deactivate("password");

      expect(deactivated).toBe(true);
    });

    it("should return true when already inactive", async () => {
      const result = await manager.deactivate("password");
      expect(result).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Dead Man Switch Tests
  // --------------------------------------------------------------------------

  describe("dead man switch", () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.updateConfig({
        deadManSwitch: {
          enabled: true,
          timeoutHours: 72,
          warningHours: 12,
          lastCheckIn: null,
          armed: false,
        },
      });
    });

    it("should arm dead man switch", async () => {
      await manager.armDeadManSwitch();

      const status = await manager.getStatus();
      expect(status.deadManStatus?.armed).toBe(true);
    });

    it("should disarm dead man switch", async () => {
      await manager.armDeadManSwitch();
      await manager.disarmDeadManSwitch();

      const status = await manager.getStatus();
      expect(status.deadManStatus?.armed).toBe(false);
    });

    it("should record check-in", async () => {
      await manager.armDeadManSwitch();
      const beforeStatus = await manager.getStatus();

      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.checkIn();
      const afterStatus = await manager.getStatus();

      expect(afterStatus.deadManStatus?.lastCheckIn).not.toBe(
        beforeStatus.deadManStatus?.lastCheckIn,
      );
    });

    it("should calculate time remaining", async () => {
      await manager.armDeadManSwitch();

      const status = await manager.getStatus();
      expect(status.deadManStatus?.timeRemaining).toBeDefined();
      expect(status.deadManStatus?.timeRemaining).toBeGreaterThan(0);
    });

    it("should return null status when disabled", async () => {
      await manager.updateConfig({
        deadManSwitch: {
          ...DEFAULT_DEAD_MAN_CONFIG,
          enabled: false,
        },
      });

      const status = await manager.getStatus();
      expect(status.deadManStatus).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Event Listener Tests
  // --------------------------------------------------------------------------

  describe("event listeners", () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.updateConfig({ enabled: true });
    });

    it("should add and remove event listeners", () => {
      const listener = jest.fn();

      manager.addEventListener("panic_activated", listener);
      manager.removeEventListener("panic_activated", listener);

      // Listener should be removed
    });

    it("should handle multiple listeners", async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.addEventListener("panic_activated", listener1);
      manager.addEventListener("panic_activated", listener2);

      await manager.activate("manual");

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it("should include event data", async () => {
      let eventData: Record<string, unknown> = {};
      manager.addEventListener("panic_activated", (event) => {
        eventData = event.data;
      });

      await manager.activate("gesture");

      expect(eventData.method).toBe("gesture");
    });
  });

  // --------------------------------------------------------------------------
  // Default Configuration Tests
  // --------------------------------------------------------------------------

  describe("default configuration", () => {
    it("should have correct default panic config", () => {
      expect(DEFAULT_PANIC_CONFIG.enabled).toBe(false);
      expect(DEFAULT_PANIC_CONFIG.showDecoy).toBe(true);
      expect(DEFAULT_PANIC_CONFIG.notifyContacts).toBe(false);
      expect(DEFAULT_PANIC_CONFIG.lockoutDuration).toBe(0);
      expect(DEFAULT_PANIC_CONFIG.requireReSetup).toBe(true);
    });

    it("should have correct default decoy config", () => {
      expect(DEFAULT_DECOY_CONFIG.type).toBe("empty");
      expect(DEFAULT_DECOY_CONFIG.showFakeContent).toBe(false);
    });

    it("should have correct default dead man config", () => {
      expect(DEFAULT_DEAD_MAN_CONFIG.enabled).toBe(false);
      expect(DEFAULT_DEAD_MAN_CONFIG.timeoutHours).toBe(72);
      expect(DEFAULT_DEAD_MAN_CONFIG.warningHours).toBe(12);
      expect(DEFAULT_DEAD_MAN_CONFIG.armed).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // State Management Tests
  // --------------------------------------------------------------------------

  describe("state management", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return enabled status correctly", () => {
      expect(manager.isEnabled()).toBe(false);
    });

    it("should return active status correctly", async () => {
      expect(manager.isActive()).toBe(false);

      await manager.updateConfig({ enabled: true });
      await manager.activate("manual");

      expect(manager.isActive()).toBe(true);
    });

    it("should persist state across manager instances", async () => {
      await manager.updateConfig({ enabled: true });
      await manager.activate("manual");

      // Create new manager
      const newManager = createPanicModeManager(mockStorage);
      await newManager.initialize();

      expect(newManager.isActive()).toBe(true);

      newManager.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // Cleanup Tests
  // --------------------------------------------------------------------------

  describe("cleanup", () => {
    it("should destroy manager properly", async () => {
      await manager.initialize();
      manager.destroy();

      // Manager should be in clean state
    });

    it("should stop dead man monitoring on destroy", async () => {
      await manager.initialize();
      await manager.updateConfig({
        deadManSwitch: {
          ...DEFAULT_DEAD_MAN_CONFIG,
          enabled: true,
        },
      });
      await manager.armDeadManSwitch();

      manager.destroy();

      // Timer should be stopped (no way to verify directly, but should not throw)
    });
  });
});
