/**
 * Recovery Lock Tests
 *
 * Comprehensive tests for the recovery lock functionality including:
 * - Trusted contact management
 * - Recovery request lifecycle
 * - Social recovery
 * - Time-delayed recovery
 * - Identity verification
 */

import {
  RecoveryLockManager,
  generateVerificationCode,
  generateCompletionToken,
  hashVerificationCode,
  verifyCode,
  isValidEmail,
  isValidPhone,
  maskEmail,
  maskPhone,
  getRecoveryLockManager,
  getAvailableRecoveryMethods,
  isSocialRecoveryAvailable,
  isTimeDelayedRecoveryAvailable,
} from "../recovery-lock";

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

// Mock crypto
const mockCrypto = {
  getRandomValues: jest.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    digest: jest
      .fn()
      .mockImplementation(async (algo: string, data: ArrayBuffer) => {
        // Simple mock hash
        const bytes = new Uint8Array(data);
        const result = new Uint8Array(32);
        for (let i = 0; i < bytes.length; i++) {
          result[i % 32] ^= bytes[i];
        }
        return result.buffer;
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

describe("Recovery Lock", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    RecoveryLockManager.resetInstance();
  });

  describe("Utility Functions", () => {
    describe("generateVerificationCode", () => {
      it("should generate 6-digit code", () => {
        const code = generateVerificationCode();
        expect(code).toMatch(/^\d{6}$/);
      });

      it("should generate unique codes", () => {
        const codes = new Set();
        for (let i = 0; i < 100; i++) {
          codes.add(generateVerificationCode());
        }
        expect(codes.size).toBeGreaterThan(90); // Allow some collisions
      });
    });

    describe("generateCompletionToken", () => {
      it("should generate hex token", () => {
        const token = generateCompletionToken();
        expect(token).toMatch(/^[a-f0-9]+$/);
      });

      it("should generate 64-character token", () => {
        const token = generateCompletionToken();
        expect(token.length).toBe(64);
      });

      it("should generate unique tokens", () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
          tokens.add(generateCompletionToken());
        }
        expect(tokens.size).toBe(100);
      });
    });

    describe("hashVerificationCode", () => {
      it("should hash code", async () => {
        const hash = await hashVerificationCode("123456");
        expect(hash).toBeDefined();
        expect(typeof hash).toBe("string");
      });

      it("should produce consistent hashes", async () => {
        const hash1 = await hashVerificationCode("123456");
        const hash2 = await hashVerificationCode("123456");
        expect(hash1).toBe(hash2);
      });

      it("should produce different hashes for different codes", async () => {
        const hash1 = await hashVerificationCode("123456");
        const hash2 = await hashVerificationCode("654321");
        expect(hash1).not.toBe(hash2);
      });
    });

    describe("verifyCode", () => {
      it("should verify correct code", async () => {
        const code = "123456";
        const hash = await hashVerificationCode(code);
        const result = await verifyCode(code, hash);
        expect(result).toBe(true);
      });

      it("should reject incorrect code", async () => {
        const hash = await hashVerificationCode("123456");
        const result = await verifyCode("654321", hash);
        expect(result).toBe(false);
      });
    });

    describe("isValidEmail", () => {
      it("should accept valid email", () => {
        expect(isValidEmail("test@example.com")).toBe(true);
        expect(isValidEmail("user.name@domain.org")).toBe(true);
      });

      it("should reject invalid email", () => {
        expect(isValidEmail("invalid")).toBe(false);
        expect(isValidEmail("@example.com")).toBe(false);
        expect(isValidEmail("test@")).toBe(false);
      });
    });

    describe("isValidPhone", () => {
      it("should accept valid E.164 phone", () => {
        expect(isValidPhone("+14155551234")).toBe(true);
        expect(isValidPhone("+442071234567")).toBe(true);
      });

      it("should reject invalid phone", () => {
        expect(isValidPhone("1234567890")).toBe(false);
        expect(isValidPhone("+0123")).toBe(false);
        expect(isValidPhone("invalid")).toBe(false);
      });
    });

    describe("maskEmail", () => {
      it("should mask email", () => {
        expect(maskEmail("test@example.com")).toBe("t***t@example.com");
        expect(maskEmail("a@b.com")).toBe("a***@b.com");
      });
    });

    describe("maskPhone", () => {
      it("should mask phone", () => {
        expect(maskPhone("+14155551234")).toBe("***1234");
        expect(maskPhone("+1")).toBe("***");
      });
    });
  });

  describe("RecoveryLockManager", () => {
    let manager: RecoveryLockManager;

    beforeEach(async () => {
      manager = RecoveryLockManager.getInstance();
      await manager.initialize();
    });

    describe("initialization", () => {
      it("should initialize with empty state", () => {
        const state = manager.getState();
        expect(state.trustedContacts).toHaveLength(0);
        expect(state.activeRequests).toHaveLength(0);
      });

      it("should have default config", () => {
        const config = manager.getConfig();
        expect(config.minTrustedContacts).toBe(2);
        expect(config.approvalThreshold).toBe(2);
        expect(config.timeDelayHours).toBe(72);
      });
    });

    describe("Trusted Contacts", () => {
      describe("addTrustedContact", () => {
        it("should add contact with email", async () => {
          const result = await manager.addTrustedContact(
            "Alice",
            "email",
            "alice@example.com",
          );

          expect(result.success).toBe(true);
          expect(result.contact).toBeDefined();
          expect(result.contact?.name).toBe("Alice");
          expect(result.verificationCode).toBeDefined();
        });

        it("should add contact with phone", async () => {
          const result = await manager.addTrustedContact(
            "Bob",
            "phone",
            "+14155551234",
          );

          expect(result.success).toBe(true);
          expect(result.contact).toBeDefined();
        });

        it("should reject invalid email", async () => {
          const result = await manager.addTrustedContact(
            "Invalid",
            "email",
            "invalid",
          );

          expect(result.success).toBe(false);
          expect(result.error).toContain("Invalid email");
        });

        it("should reject invalid phone", async () => {
          const result = await manager.addTrustedContact(
            "Invalid",
            "phone",
            "1234",
          );

          expect(result.success).toBe(false);
          expect(result.error).toContain("Invalid phone");
        });

        it("should reject duplicate contact", async () => {
          await manager.addTrustedContact(
            "Alice",
            "email",
            "alice@example.com",
          );
          const result = await manager.addTrustedContact(
            "Alice 2",
            "email",
            "alice@example.com",
          );

          expect(result.success).toBe(false);
          expect(result.error).toContain("already exists");
        });
      });

      describe("verifyTrustedContact", () => {
        let contactId: string;
        let verificationCode: string;

        beforeEach(async () => {
          const result = await manager.addTrustedContact(
            "Alice",
            "email",
            "alice@example.com",
          );
          contactId = result.contact!.id;
          verificationCode = result.verificationCode!;
        });

        it("should verify contact with correct code", async () => {
          const result = await manager.verifyTrustedContact(
            contactId,
            verificationCode,
          );
          expect(result.success).toBe(true);

          const contacts = manager.getVerifiedContacts();
          expect(contacts).toHaveLength(1);
        });

        it("should reject incorrect code", async () => {
          const result = await manager.verifyTrustedContact(
            contactId,
            "000000",
          );
          expect(result.success).toBe(false);
          expect(result.error).toContain("Invalid verification code");
        });

        it("should reject verification of non-existent contact", async () => {
          const result = await manager.verifyTrustedContact(
            "invalid-id",
            "123456",
          );
          expect(result.success).toBe(false);
          expect(result.error).toContain("not found");
        });

        it("should reject re-verification", async () => {
          await manager.verifyTrustedContact(contactId, verificationCode);
          const result = await manager.verifyTrustedContact(
            contactId,
            verificationCode,
          );
          expect(result.success).toBe(false);
          expect(result.error).toContain("already verified");
        });
      });

      describe("removeTrustedContact", () => {
        it("should remove contact", async () => {
          const addResult = await manager.addTrustedContact(
            "Alice",
            "email",
            "alice@example.com",
          );

          const result = await manager.removeTrustedContact(
            addResult.contact!.id,
          );
          expect(result.success).toBe(true);

          const state = manager.getState();
          expect(state.trustedContacts).toHaveLength(0);
        });

        it("should fail for non-existent contact", async () => {
          const result = await manager.removeTrustedContact("invalid-id");
          expect(result.success).toBe(false);
          expect(result.error).toContain("not found");
        });
      });

      describe("regenerateVerificationCode", () => {
        it("should regenerate code for unverified contact", async () => {
          const addResult = await manager.addTrustedContact(
            "Alice",
            "email",
            "alice@example.com",
          );
          const contactId = addResult.contact!.id;
          const oldCode = addResult.verificationCode!;

          const result = await manager.regenerateVerificationCode(contactId);
          expect(result.success).toBe(true);
          expect(result.verificationCode).toBeDefined();
          expect(result.verificationCode).not.toBe(oldCode);
        });

        it("should fail for verified contact", async () => {
          const addResult = await manager.addTrustedContact(
            "Alice",
            "email",
            "alice@example.com",
          );
          await manager.verifyTrustedContact(
            addResult.contact!.id,
            addResult.verificationCode!,
          );

          const result = await manager.regenerateVerificationCode(
            addResult.contact!.id,
          );
          expect(result.success).toBe(false);
          expect(result.error).toContain("already verified");
        });
      });
    });

    describe("Recovery Requests", () => {
      describe("initiateRecoveryRequest", () => {
        beforeEach(async () => {
          // Add verified contacts
          const c1 = await manager.addTrustedContact(
            "Alice",
            "email",
            "alice@example.com",
          );
          await manager.verifyTrustedContact(
            c1.contact!.id,
            c1.verificationCode!,
          );
          const c2 = await manager.addTrustedContact(
            "Bob",
            "email",
            "bob@example.com",
          );
          await manager.verifyTrustedContact(
            c2.contact!.id,
            c2.verificationCode!,
          );
        });

        it("should initiate trusted contacts recovery", async () => {
          const result =
            await manager.initiateRecoveryRequest("trusted_contacts");

          expect(result.success).toBe(true);
          expect(result.newStatus).toBe("waiting_contacts");

          const state = manager.getState();
          expect(state.activeRequests).toHaveLength(1);
        });

        it("should initiate time-delayed recovery", async () => {
          const result = await manager.initiateRecoveryRequest("time_delayed");

          expect(result.success).toBe(true);
          expect(result.newStatus).toBe("waiting_period");
          expect(result.canCompleteAt).toBeInstanceOf(Date);
        });

        it("should reject unavailable method", async () => {
          const result = await manager.initiateRecoveryRequest(
            "identity_verification",
          );
          expect(result.success).toBe(false);
          expect(result.error).toContain("not available");
        });

        it("should respect cooldown period", async () => {
          await manager.initiateRecoveryRequest("time_delayed");

          const result = await manager.initiateRecoveryRequest("time_delayed");
          expect(result.success).toBe(false);
          expect(result.error).toContain("wait");
        });

        it("should respect max active requests", async () => {
          manager.updateConfig({
            maxActiveRequests: 1,
            requestCooldownHours: 0,
          });
          await manager.initiateRecoveryRequest("time_delayed");

          const result = await manager.initiateRecoveryRequest("time_delayed");
          expect(result.success).toBe(false);
          expect(result.error).toContain("Maximum");
        });
      });

      describe("recordContactResponse", () => {
        let requestId: string;
        let contact1Id: string;
        let contact2Id: string;

        beforeEach(async () => {
          const c1 = await manager.addTrustedContact(
            "Alice",
            "email",
            "alice@example.com",
          );
          await manager.verifyTrustedContact(
            c1.contact!.id,
            c1.verificationCode!,
          );
          contact1Id = c1.contact!.id;

          const c2 = await manager.addTrustedContact(
            "Bob",
            "email",
            "bob@example.com",
          );
          await manager.verifyTrustedContact(
            c2.contact!.id,
            c2.verificationCode!,
          );
          contact2Id = c2.contact!.id;

          manager.updateConfig({ approvalThreshold: 2 });
          const result =
            await manager.initiateRecoveryRequest("trusted_contacts");
          requestId = manager.getState().activeRequests[0].id;
        });

        it("should record approval", async () => {
          const result = await manager.recordContactResponse(
            requestId,
            contact1Id,
            true,
            "Approved!",
          );

          expect(result.success).toBe(true);
          expect(result.newStatus).toBe("waiting_contacts");
        });

        it("should approve request when threshold met", async () => {
          await manager.recordContactResponse(requestId, contact1Id, true);
          const result = await manager.recordContactResponse(
            requestId,
            contact2Id,
            true,
          );

          expect(result.success).toBe(true);
          expect(result.newStatus).toBe("approved");
          expect(result.completionToken).toBeDefined();
        });

        it("should reject duplicate response", async () => {
          await manager.recordContactResponse(requestId, contact1Id, true);
          const result = await manager.recordContactResponse(
            requestId,
            contact1Id,
            true,
          );

          expect(result.success).toBe(false);
          expect(result.error).toContain("already responded");
        });

        it("should reject request when not enough approvals possible", async () => {
          await manager.recordContactResponse(requestId, contact1Id, false);
          const result = await manager.recordContactResponse(
            requestId,
            contact2Id,
            false,
          );

          // When not enough approvals are possible, success is false but status transitions to rejected
          expect(result.success).toBe(false);
          // The request gets rejected - check the request directly
          const request = manager.getRequest(requestId);
          expect(request?.status).toBe("rejected");
        });
      });

      describe("checkTimeDelayedRecovery", () => {
        it("should approve after delay when time has passed", async () => {
          // Set a very short delay (0.0001 hours = ~0.36 seconds)
          manager.updateConfig({ timeDelayHours: 0, requestCooldownHours: 0 });

          await manager.initiateRecoveryRequest("time_delayed");
          const requestId = manager.getState().activeRequests[0].id;

          // Get the request and manually set canCompleteAt to past
          const request = manager.getRequest(requestId);
          if (request) {
            request.canCompleteAt = new Date(Date.now() - 1000);
          }

          const result = await manager.checkTimeDelayedRecovery(requestId);

          expect(result.success).toBe(true);
          expect(result.newStatus).toBe("approved");
          expect(result.completionToken).toBeDefined();
        });

        it("should reject before delay", async () => {
          manager.updateConfig({
            timeDelayHours: 1000,
            requestCooldownHours: 0,
          });
          await manager.initiateRecoveryRequest("time_delayed");
          const requestId = manager.getState().activeRequests[0].id;

          const result = await manager.checkTimeDelayedRecovery(requestId);
          expect(result.success).toBe(false);
          expect(result.error).toContain("has not elapsed");
        });
      });

      describe("verifyIdentity", () => {
        beforeEach(async () => {
          manager.updateConfig({ enableIdentityVerification: true });
        });

        it("should approve with verified identity", async () => {
          await manager.initiateRecoveryRequest("identity_verification");
          const requestId = manager.getState().activeRequests[0].id;

          const result = await manager.verifyIdentity(requestId, {
            provider: "idme",
            verified: true,
            userId: "user-123",
          });

          expect(result.success).toBe(true);
          expect(result.newStatus).toBe("approved");
        });

        it("should reject with failed verification", async () => {
          await manager.initiateRecoveryRequest("identity_verification");
          const requestId = manager.getState().activeRequests[0].id;

          const result = await manager.verifyIdentity(requestId, {
            provider: "idme",
            verified: false,
          });

          expect(result.success).toBe(false);
          expect(result.newStatus).toBe("rejected");
        });
      });

      describe("completeRecovery", () => {
        it("should complete approved request", async () => {
          manager.updateConfig({ timeDelayHours: 0, requestCooldownHours: 0 });
          await manager.initiateRecoveryRequest("time_delayed");
          const requestId = manager.getState().activeRequests[0].id;

          // Manually set canCompleteAt to past
          const request = manager.getRequest(requestId);
          if (request) {
            request.canCompleteAt = new Date(Date.now() - 1000);
          }

          const checkResult = await manager.checkTimeDelayedRecovery(requestId);
          expect(checkResult.success).toBe(true);

          const result = await manager.completeRecovery(
            requestId,
            checkResult.completionToken!,
          );

          expect(result.success).toBe(true);
        });

        it("should reject invalid token", async () => {
          manager.updateConfig({ timeDelayHours: 0, requestCooldownHours: 0 });
          await manager.initiateRecoveryRequest("time_delayed");
          const requestId = manager.getState().activeRequests[0].id;

          // Manually set canCompleteAt to past and approve the request
          const request = manager.getRequest(requestId);
          if (request) {
            request.canCompleteAt = new Date(Date.now() - 1000);
          }

          await manager.checkTimeDelayedRecovery(requestId);

          const result = await manager.completeRecovery(
            requestId,
            "invalid-token",
          );
          expect(result.success).toBe(false);
          expect(result.error).toContain("Invalid completion token");
        });
      });

      describe("cancelRecoveryRequest", () => {
        it("should cancel pending request", async () => {
          manager.updateConfig({ timeDelayHours: 1000 });
          await manager.initiateRecoveryRequest("time_delayed");
          const requestId = manager.getState().activeRequests[0].id;

          const result = await manager.cancelRecoveryRequest(requestId);
          expect(result.success).toBe(true);

          const request = manager.getRequest(requestId);
          expect(request?.status).toBe("cancelled");
        });
      });
    });

    describe("State Management", () => {
      describe("getState", () => {
        it("should return available methods", async () => {
          manager.updateConfig({ enableTimeDelayedRecovery: true });
          const state = manager.getState();

          expect(state.availableMethods).toContain("recovery_key");
          expect(state.availableMethods).toContain("time_delayed");
        });

        it("should return isSetUp correctly", async () => {
          let state = manager.getState();
          expect(state.isSetUp).toBe(true); // recovery_key always available

          manager.updateConfig({
            requireRecoveryKey: false,
            enableTimeDelayedRecovery: false,
          });
          state = manager.getState();
          expect(state.isSetUp).toBe(false);
        });
      });

      describe("clearAll", () => {
        it("should clear all recovery data", async () => {
          await manager.addTrustedContact(
            "Alice",
            "email",
            "alice@example.com",
          );
          await manager.clearAll();

          const state = manager.getState();
          expect(state.trustedContacts).toHaveLength(0);
          expect(state.activeRequests).toHaveLength(0);
        });
      });
    });
  });

  describe("Convenience Functions", () => {
    beforeEach(() => {
      RecoveryLockManager.resetInstance();
    });

    describe("getRecoveryLockManager", () => {
      it("should return singleton", () => {
        const m1 = getRecoveryLockManager();
        const m2 = getRecoveryLockManager();
        expect(m1).toBe(m2);
      });
    });

    describe("getAvailableRecoveryMethods", () => {
      it("should return available methods", async () => {
        const manager = getRecoveryLockManager();
        await manager.initialize();

        const methods = getAvailableRecoveryMethods();
        expect(methods).toContain("recovery_key");
      });
    });

    describe("isSocialRecoveryAvailable", () => {
      it("should return false without verified contacts", async () => {
        const manager = getRecoveryLockManager();
        await manager.initialize();

        expect(isSocialRecoveryAvailable()).toBe(false);
      });

      it("should return true with enough verified contacts", async () => {
        const manager = getRecoveryLockManager();
        await manager.initialize();

        const c1 = await manager.addTrustedContact(
          "Alice",
          "email",
          "alice@example.com",
        );
        await manager.verifyTrustedContact(
          c1.contact!.id,
          c1.verificationCode!,
        );
        const c2 = await manager.addTrustedContact(
          "Bob",
          "email",
          "bob@example.com",
        );
        await manager.verifyTrustedContact(
          c2.contact!.id,
          c2.verificationCode!,
        );

        expect(isSocialRecoveryAvailable()).toBe(true);
      });
    });

    describe("isTimeDelayedRecoveryAvailable", () => {
      it("should return true when enabled", async () => {
        const manager = getRecoveryLockManager();
        await manager.initialize();

        expect(isTimeDelayedRecoveryAvailable()).toBe(true);
      });

      it("should return false when disabled", async () => {
        const manager = getRecoveryLockManager({
          enableTimeDelayedRecovery: false,
        });
        await manager.initialize();

        expect(isTimeDelayedRecoveryAvailable()).toBe(false);
      });
    });
  });

  describe("Storage Persistence", () => {
    it("should persist contacts", async () => {
      const manager = getRecoveryLockManager();
      await manager.initialize();
      await manager.addTrustedContact("Alice", "email", "alice@example.com");

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("should restore contacts on reload", async () => {
      const m1 = getRecoveryLockManager();
      await m1.initialize();
      const addResult = await m1.addTrustedContact(
        "Alice",
        "email",
        "alice@example.com",
      );
      await m1.verifyTrustedContact(
        addResult.contact!.id,
        addResult.verificationCode!,
      );

      RecoveryLockManager.resetInstance();

      const m2 = getRecoveryLockManager();
      await m2.initialize();

      const contacts = m2.getVerifiedContacts();
      expect(contacts.length).toBe(1);
      expect(contacts[0].name).toBe("Alice");
    });
  });
});
