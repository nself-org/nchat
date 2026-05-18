/**
 * App Lock Integration Tests
 *
 * End-to-end tests for the complete app lock workflow.
 */

import {
  AppLockManager,
  createAppLockManager,
  resetAppLockManager,
  createPinAuth,
  createBiometricAuth,
  type LockEvent,
} from "../index";

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock("@/lib/environment", () => ({
  isClient: jest.fn().mockReturnValue(false),
  isDevelopment: jest.fn().mockReturnValue(true),
  isProduction: jest.fn().mockReturnValue(false),
}));

// In-memory storage for integration tests
class MockSecureStorage {
  private storage: Map<string, string> = new Map();
  private pinStoredData: string | null = null;
  os = "web" as const;

  isInitialized() {
    return true;
  }

  async initialize() {}

  async getCapabilities() {
    return {
      hardwareStorage: false,
      biometricAuth: false,
      biometricTypes: [],
      secureEnclave: false,
      syncSupported: false,
      maxItemSize: 5 * 1024 * 1024,
      accessGroupsSupported: false,
      os: "web",
      securityLevel: "encrypted",
    };
  }

  async setItem(key: string, value: string) {
    this.storage.set(key, value);
    if (key.includes("pin_hash")) {
      this.pinStoredData = value;
    }
    return { success: true, data: null, error: null };
  }

  async getItem(key: string) {
    const value = this.storage.get(key);
    return { success: true, data: value || null, error: null };
  }

  async hasItem(key: string) {
    return this.storage.has(key);
  }

  async removeItem(key: string) {
    this.storage.delete(key);
    return { success: true, data: null, error: null };
  }

  async getAllKeys() {
    return Array.from(this.storage.keys());
  }

  async clear() {
    this.storage.clear();
    return { success: true, data: null, error: null };
  }

  async getItemMeta() {
    return null;
  }

  async isBiometricAvailable() {
    return false;
  }

  async authenticateBiometric() {
    return { success: false, data: null, error: "Not available" };
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("App Lock Integration", () => {
  let storage: MockSecureStorage;
  let manager: AppLockManager;

  beforeEach(async () => {
    resetAppLockManager();
    storage = new MockSecureStorage();
    manager = createAppLockManager(storage as any);
    await manager.initialize();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("Complete PIN Lock Flow", () => {
    it("should complete full lock/unlock cycle with PIN", async () => {
      // 1. Start with lock disabled
      let state = await manager.getStateAsync();
      expect(state.settings.mode).toBe("none");
      expect(manager.isLocked()).toBe(false);

      // 2. Set up PIN
      const pinResult = await manager.setPin("123456");
      expect(pinResult.success).toBe(true);

      // 3. Enable PIN mode
      const settingsResult = await manager.updateSettings({ mode: "pin" });
      expect(settingsResult.success).toBe(true);

      // 4. Lock the app
      const lockResult = await manager.lock();
      expect(lockResult.success).toBe(true);
      expect(manager.isLocked()).toBe(true);

      // 5. Try wrong PIN
      const wrongPinResult = await manager.unlockWithPin("654321");
      expect(wrongPinResult.success).toBe(false);
      expect(manager.isLocked()).toBe(true);

      state = await manager.getStateAsync();
      expect(state.lockState.failedAttempts).toBe(1);

      // 6. Unlock with correct PIN
      const unlockResult = await manager.unlockWithPin("123456");
      expect(unlockResult.success).toBe(true);
      expect(manager.isLocked()).toBe(false);

      // 7. Verify failed attempts reset
      state = await manager.getStateAsync();
      expect(state.lockState.failedAttempts).toBe(0);
    });

    it("should handle lockout scenario", async () => {
      // Set up PIN with low max attempts
      await manager.setPin("123456");
      await manager.updateSettings({
        mode: "pin",
        maxPinAttempts: 3,
        lockoutMinutes: 1,
      });
      await manager.lock();

      // Fail 3 times
      await manager.unlockWithPin("wrong1");
      await manager.unlockWithPin("wrong2");
      await manager.unlockWithPin("wrong3");

      // Should be locked out
      expect(manager.isLockedOut()).toBe(true);

      // Even correct PIN should fail
      const result = await manager.unlockWithPin("123456");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("LOCKED_OUT");
    });

    it("should track events throughout the flow", async () => {
      const events: LockEvent[] = [];

      manager.addEventListener("locked", (e) => events.push(e));
      manager.addEventListener("unlocked", (e) => events.push(e));
      manager.addEventListener("settings_changed", (e) => events.push(e));
      manager.addEventListener("unlock_failed", (e) => events.push(e));

      // Complete flow
      await manager.setPin("123456");
      await manager.updateSettings({ mode: "pin" });
      await manager.lock();
      await manager.unlockWithPin("wrong");
      await manager.unlockWithPin("123456");

      // Verify events
      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("settings_changed");
      expect(eventTypes).toContain("locked");
      expect(eventTypes).toContain("unlock_failed");
      expect(eventTypes).toContain("unlocked");
    });
  });

  describe("PIN Change Flow", () => {
    it("should allow changing PIN", async () => {
      // Set initial PIN
      await manager.setPin("123456");
      await manager.updateSettings({ mode: "pin" });

      // Change PIN
      const changeResult = await manager.changePin("123456", "654321");
      expect(changeResult.success).toBe(true);

      // Lock and verify new PIN works
      await manager.lock();
      const unlockResult = await manager.unlockWithPin("654321");
      expect(unlockResult.success).toBe(true);

      // Old PIN should not work
      await manager.lock();
      const oldPinResult = await manager.unlockWithPin("123456");
      expect(oldPinResult.success).toBe(false);
    });
  });

  describe("Settings Persistence", () => {
    it("should persist settings across manager instances", async () => {
      // Configure first manager
      await manager.setPin("123456");
      await manager.updateSettings({
        mode: "pin",
        idleTimeout: {
          enabled: true,
          timeoutMinutes: 10,
          warningSeconds: 30,
          resetEvents: ["keypress"],
        },
        maxPinAttempts: 3,
      });

      // Create new manager with same storage
      const manager2 = createAppLockManager(storage as any);
      await manager2.initialize();

      const settings = manager2.getSettings();
      expect(settings.mode).toBe("pin");
      expect(settings.idleTimeout.enabled).toBe(true);
      expect(settings.idleTimeout.timeoutMinutes).toBe(10);
      expect(settings.maxPinAttempts).toBe(3);

      manager2.destroy();
    });
  });

  describe("Mode Switching", () => {
    it("should switch between modes", async () => {
      // Start with PIN
      await manager.setPin("123456");
      await manager.updateSettings({ mode: "pin" });
      expect(manager.getSettings().mode).toBe("pin");

      // Switch to none
      await manager.updateSettings({ mode: "none" });
      expect(manager.getSettings().mode).toBe("none");

      // Lock should fail when mode is none
      const lockResult = await manager.lock();
      expect(lockResult.success).toBe(false);

      // Switch back to PIN
      await manager.updateSettings({ mode: "pin" });
      const lockResult2 = await manager.lock();
      expect(lockResult2.success).toBe(true);
    });
  });

  describe("Capabilities Check", () => {
    it("should report platform capabilities", async () => {
      const capabilities = await manager.getCapabilities();

      expect(capabilities.supportsPin).toBe(true);
      expect(capabilities.supportsBiometric).toBe(false);
      expect(capabilities.platform).toBe("web");
    });
  });

  describe("State Consistency", () => {
    it("should maintain consistent state", async () => {
      await manager.setPin("123456");
      await manager.updateSettings({ mode: "pin" });

      // Get state multiple times
      const state1 = await manager.getStateAsync();
      const state2 = await manager.getStateAsync();

      expect(state1.settings.mode).toBe(state2.settings.mode);
      expect(state1.lockState.state).toBe(state2.lockState.state);
    });

    it("should update state after operations", async () => {
      await manager.setPin("123456");
      await manager.updateSettings({ mode: "pin" });

      let state = await manager.getStateAsync();
      expect(state.lockState.state).toBe("unlocked");

      await manager.lock();

      state = await manager.getStateAsync();
      expect(state.lockState.state).toBe("locked");
      expect(state.lockState.lockedAt).toBeTruthy();

      await manager.unlockWithPin("123456");

      state = await manager.getStateAsync();
      expect(state.lockState.state).toBe("unlocked");
      expect(state.lockState.unlockedAt).toBeTruthy();
      expect(state.lockState.lastAuthMethod).toBe("pin");
    });
  });

  describe("Error Recovery", () => {
    it("should handle storage errors gracefully", async () => {
      const errorStorage = new MockSecureStorage();
      const errorManager = createAppLockManager(errorStorage as any);
      await errorManager.initialize();

      // Simulate storage error
      errorStorage.setItem = async () => {
        throw new Error("Storage error");
      };

      // Manager should still function
      const state = await errorManager.getStateAsync();
      expect(state.initialized).toBe(true);

      errorManager.destroy();
    });
  });
});

describe("PIN Auth Component Tests", () => {
  let storage: MockSecureStorage;

  beforeEach(() => {
    storage = new MockSecureStorage();
  });

  it("should handle concurrent PIN operations", async () => {
    const pinAuth = createPinAuth(storage as any, 6);
    await pinAuth.initialize();

    // Set PIN
    await pinAuth.setPin("123456");

    // Concurrent verifications
    const results = await Promise.all([
      pinAuth.verifyPin("123456"),
      pinAuth.verifyPin("654321"),
      pinAuth.verifyPin("123456"),
    ]);

    expect(results[0].success).toBe(true);
    expect(results[0].data).toBe(true);
    expect(results[1].success).toBe(true);
    expect(results[1].data).toBe(false);
    expect(results[2].success).toBe(true);
    expect(results[2].data).toBe(true);
  });
});

describe("Biometric Auth Component Tests", () => {
  let storage: MockSecureStorage;

  beforeEach(() => {
    storage = new MockSecureStorage();
  });

  it("should handle unavailable biometric gracefully", async () => {
    const biometricAuth = createBiometricAuth(storage as any);
    await biometricAuth.initialize();

    const info = biometricAuth.getBiometricInfo();
    expect(info.available).toBe(false);

    const result = await biometricAuth.authenticate("Test");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("BIOMETRIC_NOT_AVAILABLE");
  });
});
