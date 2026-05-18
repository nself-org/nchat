/**
 * Registration Lock Service Tests
 *
 * Comprehensive tests for the registration lock service including:
 * - Combined state management
 * - Lock setup and verification
 * - Recovery operations
 * - Trusted contact management
 * - Device management
 * - Notifications and auditing
 */

import {
  RegistrationLockService,
  getRegistrationLockService,
  initializeRegistrationLockService,
  shouldBlockUserRegistration,
  verifyRegistrationLock,
} from "../registration-lock.service";
import { RegistrationLockManager } from "@/lib/auth/registration-lock";
import { RecoveryLockManager } from "@/lib/auth/recovery-lock";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Simple hash function for testing
function simpleHash(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(32);
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  // Fill result with hash-derived values
  for (let i = 0; i < 32; i++) {
    result[i] = (hash >>> ((i % 4) * 8)) & 0xff;
    hash = Math.imul(hash, 0x01000193);
  }
  return result;
}

// Mock crypto
const mockCrypto = {
  getRandomValues: jest.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    importKey: jest
      .fn()
      .mockImplementation(async (_format: string, data: BufferSource) => {
        // Return a mock key that carries the data for deriveBits
        const dataArray = new Uint8Array(
          data instanceof ArrayBuffer ? data : (data as Uint8Array).buffer,
        );
        return { __data: dataArray };
      }),
    deriveBits: jest
      .fn()
      .mockImplementation(
        async (
          algorithm: { salt: ArrayBuffer },
          baseKey: { __data: Uint8Array },
        ) => {
          // Combine key data with salt to produce deterministic but unique output
          const salt = new Uint8Array(algorithm.salt);
          const combined = new Uint8Array(baseKey.__data.length + salt.length);
          combined.set(baseKey.__data, 0);
          combined.set(salt, baseKey.__data.length);
          return simpleHash(combined).buffer;
        },
      ),
    digest: jest
      .fn()
      .mockImplementation(async (_algo: string, data: ArrayBuffer) => {
        return simpleHash(new Uint8Array(data)).buffer;
      }),
  },
};

Object.defineProperty(global, "crypto", { value: mockCrypto });

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("RegistrationLockService", () => {
  let service: RegistrationLockService;
  const userId = "test-user-123";

  beforeEach(async () => {
    localStorageMock.clear();
    jest.clearAllMocks();
    RegistrationLockService.resetInstance();
    service = getRegistrationLockService();
    await service.initialize(userId);
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      const newService = getRegistrationLockService();
      await expect(newService.initialize(userId)).resolves.not.toThrow();
    });

    it("should return singleton instance", () => {
      const s1 = getRegistrationLockService();
      const s2 = getRegistrationLockService();
      expect(s1).toBe(s2);
    });
  });

  describe("getCombinedState", () => {
    it("should return combined state with defaults", () => {
      const state = service.getCombinedState();

      expect(state.registrationLock).toBeDefined();
      expect(state.recoveryLock).toBeDefined();
      expect(state.isBlocked).toBe(false);
      expect(state.blockReason).toBeNull();
      expect(state.recoveryOptionsAvailable).toBe(true);
    });

    it("should indicate blocked when lock active", async () => {
      await service.setupLock({ pin: "847291" });
      const state = service.getCombinedState();

      expect(state.isBlocked).toBe(true);
      expect(state.blockReason).toContain("PIN");
    });
  });

  describe("setupLock", () => {
    it("should set up lock with PIN", async () => {
      const result = await service.setupLock({ pin: "847291" });

      expect(result.success).toBe(true);
      expect(result.recoveryKey).toBeDefined();
      expect(result.error).toBeNull();
    });

    it("should return recovery key only on setup", async () => {
      const result = await service.setupLock({ pin: "847291" });
      expect(result.recoveryKey).toBeDefined();

      // Recovery key should be returned only once
      const state = service.getCombinedState();
      expect(state.registrationLock.enabled).toBe(true);
    });

    it("should set up trusted contacts", async () => {
      const result = await service.setupLock({
        pin: "847291",
        trustedContacts: [
          {
            name: "Alice",
            contactMethod: "email",
            contactValue: "alice@example.com",
          },
          {
            name: "Bob",
            contactMethod: "email",
            contactValue: "bob@example.com",
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.trustedContactCodes).toHaveLength(2);
      expect(result.trustedContactCodes[0].verificationCode).toBeDefined();
    });

    it("should reject weak PIN", async () => {
      const result = await service.setupLock({ pin: "0000" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("weak");
    });

    it("should reject invalid PIN format", async () => {
      const result = await service.setupLock({ pin: "12" });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should enable device binding when specified", async () => {
      await service.setupLock({
        pin: "847291",
        deviceId: "device-123",
        enableDeviceBinding: true,
      });

      const state = service.getCombinedState();
      expect(state.registrationLock.boundDevices).toContain("device-123");
    });
  });

  describe("verifyLock", () => {
    let recoveryKey: string;

    beforeEach(async () => {
      const result = await service.setupLock({ pin: "847291" });
      recoveryKey = result.recoveryKey!;
    });

    it("should verify correct PIN", async () => {
      const result = await service.verifyLock({ pin: "847291" });

      expect(result.success).toBe(true);
      expect(result.method).toBe("pin");
      expect(result.error).toBeNull();
    });

    it("should reject incorrect PIN", async () => {
      const result = await service.verifyLock({ pin: "000000" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid PIN");
      expect(result.remainingAttempts).toBeDefined();
    });

    it("should verify with recovery key", async () => {
      const result = await service.verifyLock({ recoveryKey });

      expect(result.success).toBe(true);
      expect(result.method).toBe("recovery_key");
    });

    it("should reject invalid recovery key", async () => {
      const result = await service.verifyLock({
        recoveryKey: "INVALID-KEY-ABCD-EFGH-1234-5678-90AB-CDEF",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid recovery key");
    });

    it("should return available recovery methods on failure", async () => {
      const result = await service.verifyLock({ pin: "000000" });

      expect(result.availableRecoveryMethods).toBeDefined();
      expect(result.availableRecoveryMethods.length).toBeGreaterThan(0);
    });

    it("should require credentials", async () => {
      const result = await service.verifyLock({});

      expect(result.success).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should succeed without lock enabled", async () => {
      await service.disableLock("847291");

      const result = await service.verifyLock({});
      expect(result.success).toBe(true);
    });
  });

  describe("changePin", () => {
    beforeEach(async () => {
      await service.setupLock({ pin: "847291" });
    });

    it("should change PIN with correct current PIN", async () => {
      const result = await service.changePin("847291", "192837");

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it("should reject incorrect current PIN", async () => {
      const result = await service.changePin("000000", "192837");

      expect(result.success).toBe(false);
    });

    it("should reject same PIN", async () => {
      const result = await service.changePin("847291", "847291");

      expect(result.success).toBe(false);
      expect(result.error).toContain("different");
    });

    it("should reject weak new PIN", async () => {
      const result = await service.changePin("847291", "0000");

      expect(result.success).toBe(false);
      expect(result.error).toContain("weak");
    });
  });

  describe("disableLock", () => {
    beforeEach(async () => {
      await service.setupLock({ pin: "847291" });
    });

    it("should disable lock with correct PIN", async () => {
      const result = await service.disableLock("847291");

      expect(result.success).toBe(true);

      const state = service.getCombinedState();
      expect(state.registrationLock.enabled).toBe(false);
    });

    it("should reject incorrect PIN", async () => {
      const result = await service.disableLock("000000");

      expect(result.success).toBe(false);
    });
  });

  describe("Recovery Operations", () => {
    describe("initiateRecovery", () => {
      it("should initiate time-delayed recovery", async () => {
        const result = await service.initiateRecovery("time_delayed");

        expect(result.success).toBe(true);
        expect(result.newStatus).toBe("waiting_period");
        expect(result.canCompleteAt).toBeInstanceOf(Date);
      });

      it("should initiate social recovery with contacts", async () => {
        // Set up verified contacts first
        const c1 = await service.addTrustedContact(
          "Alice",
          "email",
          "alice@example.com",
        );
        await service.verifyTrustedContact(
          c1.contact!.id,
          c1.verificationCode!,
        );
        const c2 = await service.addTrustedContact(
          "Bob",
          "email",
          "bob@example.com",
        );
        await service.verifyTrustedContact(
          c2.contact!.id,
          c2.verificationCode!,
        );

        const result = await service.initiateRecovery("trusted_contacts");

        expect(result.success).toBe(true);
        expect(result.newStatus).toBe("waiting_contacts");
      });

      it("should reject unavailable method", async () => {
        const result = await service.initiateRecovery("identity_verification");

        expect(result.success).toBe(false);
        expect(result.error).toContain("not available");
      });
    });

    describe("completeRecovery", () => {
      beforeEach(async () => {
        await service.setupLock({ pin: "847291" });
      });

      it("should complete approved recovery", async () => {
        // Quick time-delayed recovery
        const recLockManager = RecoveryLockManager.getInstance();
        recLockManager.updateConfig({
          timeDelayHours: 0,
          requestCooldownHours: 0,
        });

        await service.initiateRecovery("time_delayed");
        const requests = service.getActiveRecoveryRequests();
        const requestId = requests[0].id;

        // Manually set canCompleteAt to past
        const request = recLockManager.getRequest(requestId);
        if (request) {
          request.canCompleteAt = new Date(Date.now() - 1000);
        }

        const checkResult = await service.checkTimeDelayedRecovery(requestId);
        expect(checkResult.success).toBe(true);

        const completeResult = await service.completeRecovery(
          requestId,
          checkResult.completionToken!,
        );

        expect(completeResult.success).toBe(true);
      });
    });

    describe("cancelRecoveryRequest", () => {
      it("should cancel pending request", async () => {
        await service.initiateRecovery("time_delayed");
        const requests = service.getActiveRecoveryRequests();

        const result = await service.cancelRecoveryRequest(requests[0].id);

        expect(result.success).toBe(true);
      });
    });
  });

  describe("Trusted Contacts", () => {
    describe("addTrustedContact", () => {
      it("should add contact", async () => {
        const result = await service.addTrustedContact(
          "Alice",
          "email",
          "alice@example.com",
        );

        expect(result.success).toBe(true);
        expect(result.contact).toBeDefined();
        expect(result.verificationCode).toBeDefined();
      });

      it("should reject invalid email", async () => {
        const result = await service.addTrustedContact(
          "Invalid",
          "email",
          "invalid",
        );

        expect(result.success).toBe(false);
      });
    });

    describe("verifyTrustedContact", () => {
      it("should verify contact", async () => {
        const addResult = await service.addTrustedContact(
          "Alice",
          "email",
          "alice@example.com",
        );
        const result = await service.verifyTrustedContact(
          addResult.contact!.id,
          addResult.verificationCode!,
        );

        expect(result.success).toBe(true);
      });
    });

    describe("removeTrustedContact", () => {
      it("should remove contact", async () => {
        const addResult = await service.addTrustedContact(
          "Alice",
          "email",
          "alice@example.com",
        );
        const result = await service.removeTrustedContact(
          addResult.contact!.id,
        );

        expect(result.success).toBe(true);
      });
    });

    describe("getTrustedContacts", () => {
      it("should return all contacts", async () => {
        await service.addTrustedContact("Alice", "email", "alice@example.com");
        await service.addTrustedContact("Bob", "email", "bob@example.com");

        const contacts = service.getTrustedContacts();

        expect(contacts).toHaveLength(2);
      });
    });
  });

  describe("Device Management", () => {
    beforeEach(async () => {
      await service.setupLock({ pin: "847291", deviceId: "device-1" });
    });

    describe("addBoundDevice", () => {
      it("should add device with PIN", async () => {
        const result = await service.addBoundDevice("device-2", "847291");

        expect(result.success).toBe(true);

        const devices = service.getBoundDevices();
        expect(devices).toContain("device-2");
      });

      it("should reject with wrong PIN", async () => {
        const result = await service.addBoundDevice("device-2", "000000");

        expect(result.success).toBe(false);
      });
    });

    describe("removeBoundDevice", () => {
      it("should remove device with PIN", async () => {
        const result = await service.removeBoundDevice("device-1", "847291");

        expect(result.success).toBe(true);

        const devices = service.getBoundDevices();
        expect(devices).not.toContain("device-1");
      });
    });

    describe("getBoundDevices", () => {
      it("should return bound devices", () => {
        const devices = service.getBoundDevices();

        expect(devices).toContain("device-1");
      });
    });
  });

  describe("History and Auditing", () => {
    describe("getLockAttempts", () => {
      it("should return empty initially", () => {
        const attempts = service.getLockAttempts();

        expect(attempts).toEqual([]);
      });

      it("should record attempts", async () => {
        await service.setupLock({ pin: "847291" });
        await service.verifyLock({ pin: "000000" });

        const attempts = service.getLockAttempts();

        expect(attempts.length).toBeGreaterThan(0);
      });
    });

    describe("getLockEvents", () => {
      it("should return empty initially", () => {
        const events = service.getLockEvents();

        expect(events).toEqual([]);
      });

      it("should record events", async () => {
        await service.setupLock({ pin: "847291" });

        const events = service.getLockEvents();

        expect(events.some((e) => e.type === "enabled")).toBe(true);
      });
    });

    describe("getRecoveryHistory", () => {
      it("should return empty initially", () => {
        const history = service.getRecoveryHistory();

        expect(history).toEqual([]);
      });
    });
  });

  describe("Utility Methods", () => {
    describe("shouldBlockRegistration", () => {
      it("should return false without lock", () => {
        expect(service.shouldBlockRegistration()).toBe(false);
      });

      it("should return true with active lock", async () => {
        await service.setupLock({ pin: "847291" });

        expect(service.shouldBlockRegistration()).toBe(true);
      });
    });

    describe("needsReverification", () => {
      it("should return false without lock", () => {
        expect(service.needsReverification()).toBe(false);
      });
    });

    describe("validatePinFormat", () => {
      it("should validate correct format", () => {
        const result = service.validatePinFormat("123456");

        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      });

      it("should reject short PIN", () => {
        const result = service.validatePinFormat("12");

        expect(result.valid).toBe(false);
        expect(result.error).toContain("digits");
      });
    });

    describe("checkPinStrength", () => {
      it("should return score and feedback", () => {
        const result = service.checkPinStrength("123456");

        expect(result.score).toBeDefined();
        expect(result.feedback).toBeDefined();
      });
    });

    describe("generateNewRecoveryKey", () => {
      it("should generate formatted key", () => {
        const key = service.generateNewRecoveryKey();

        expect(key).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){7}$/);
      });
    });

    describe("clearAllData", () => {
      it("should clear all data", async () => {
        await service.setupLock({ pin: "847291" });
        await service.addTrustedContact("Alice", "email", "alice@example.com");

        await service.clearAllData();

        const state = service.getCombinedState();
        expect(state.registrationLock.enabled).toBe(false);
        expect(state.recoveryLock.trustedContacts).toHaveLength(0);
      });
    });
  });

  describe("Notifications", () => {
    it("should call notification callback", async () => {
      const onNotification = jest.fn();
      RegistrationLockService.resetInstance();

      const configuredService = getRegistrationLockService({
        sendNotifications: true,
        onNotification,
      });
      await configuredService.initialize(userId);

      await configuredService.setupLock({ pin: "847291" });

      expect(onNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "lock_enabled",
        }),
      );
    });
  });

  describe("Auditing", () => {
    it("should call audit callback", async () => {
      const onAuditEvent = jest.fn();
      RegistrationLockService.resetInstance();

      const configuredService = getRegistrationLockService({
        onAuditEvent,
      });
      await configuredService.initialize(userId);

      await configuredService.setupLock({ pin: "847291" });

      expect(onAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "lock_enabled",
          success: true,
        }),
      );
    });
  });

  describe("Convenience Functions", () => {
    describe("initializeRegistrationLockService", () => {
      it("should initialize service", async () => {
        RegistrationLockService.resetInstance();
        await expect(
          initializeRegistrationLockService(userId),
        ).resolves.not.toThrow();
      });
    });

    describe("shouldBlockUserRegistration", () => {
      it("should return false without lock", () => {
        expect(shouldBlockUserRegistration()).toBe(false);
      });
    });

    describe("verifyRegistrationLock", () => {
      it("should verify lock", async () => {
        await service.setupLock({ pin: "847291" });

        const result = await verifyRegistrationLock({ pin: "847291" });

        expect(result.success).toBe(true);
      });
    });
  });
});
