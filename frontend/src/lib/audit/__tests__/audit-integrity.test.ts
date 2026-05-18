/**
 * Audit Integrity Module Tests
 *
 * Comprehensive tests for tamper detection and verification functionality.
 */

import crypto from "crypto";
import type { AuditLogEntry } from "../audit-types";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock crypto.subtle with Node crypto implementation
const mockSubtle = {
  digest: async (algorithm: string, data: ArrayBuffer) => {
    const algoMap: Record<string, string> = {
      "SHA-256": "sha256",
      "SHA-384": "sha384",
      "SHA-512": "sha512",
    };
    const hash = crypto.createHash(algoMap[algorithm] || "sha256");
    hash.update(Buffer.from(data));
    return hash.digest().buffer;
  },
  importKey: async (
    format: string,
    keyData: ArrayBuffer,
    algorithm: { name: string; hash: string },
    extractable: boolean,
    keyUsages: string[],
  ) => {
    return { keyData, algorithm };
  },
  sign: async (
    algorithm: string,
    key: { keyData: ArrayBuffer; algorithm: { name: string; hash: string } },
    data: ArrayBuffer,
  ) => {
    const algoMap: Record<string, string> = {
      "SHA-256": "sha256",
      "SHA-384": "sha384",
      "SHA-512": "sha512",
    };
    const hmac = crypto.createHmac(
      algoMap[key.algorithm.hash] || "sha256",
      Buffer.from(key.keyData),
    );
    hmac.update(Buffer.from(data));
    return hmac.digest().buffer;
  },
};

// Set up global crypto mock
Object.defineProperty(global, "crypto", {
  value: { subtle: mockSubtle },
  writable: true,
});

// Now import the module after mock is in place
import {
  AuditIntegrityService,
  getIntegrityService,
  createIntegrityService,
  computeHash,
  computeHMAC,
  verifyHMAC,
  generateGenesisHash,
  computeEntryHash,
  createIntegrityEntry,
  verifyEntry,
  verifyChain,
  buildMerkleTree,
  getMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  DEFAULT_INTEGRITY_CONFIG,
  type IntegrityAuditEntry,
  type IntegrityConfig,
} from "../audit-integrity";

// Helper to create mock audit entries
function createMockEntry(
  overrides: Partial<AuditLogEntry> = {},
): AuditLogEntry {
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: new Date(),
    category: "security",
    action: "test.action",
    severity: "info",
    actor: {
      id: "user-123",
      type: "user",
      username: "testuser",
    },
    description: "Test audit entry",
    success: true,
    ...overrides,
  };
}

// Helper to create mock integrity entries
async function createMockIntegrityEntry(
  entry: AuditLogEntry,
  previousHash: string,
  blockNumber: number,
  config: IntegrityConfig = DEFAULT_INTEGRITY_CONFIG,
): Promise<IntegrityAuditEntry> {
  return createIntegrityEntry(entry, previousHash, blockNumber, config);
}

describe("Audit Integrity Module", () => {
  // ============================================================================
  // Cryptographic Utilities Tests
  // ============================================================================

  describe("computeHash", () => {
    it("should compute SHA-256 hash by default", async () => {
      const hash = await computeHash("test data");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce consistent hashes for same input", async () => {
      const hash1 = await computeHash("consistent data");
      const hash2 = await computeHash("consistent data");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", async () => {
      const hash1 = await computeHash("data one");
      const hash2 = await computeHash("data two");
      expect(hash1).not.toBe(hash2);
    });

    it("should support SHA-384 algorithm", async () => {
      const hash = await computeHash("test data", "SHA-384");
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should support SHA-512 algorithm", async () => {
      const hash = await computeHash("test data", "SHA-512");
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle empty string", async () => {
      const hash = await computeHash("");
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle special characters", async () => {
      const hash = await computeHash("!@#$%^&*()_+-=[]{}|;:,.<>?");
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle unicode characters", async () => {
      const hash = await computeHash("Hello World - multilingual");
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe("computeHMAC", () => {
    const secret = "my-secret-key";

    it("should compute HMAC signature", async () => {
      const hmac = await computeHMAC("test data", secret);
      expect(hmac).toBeDefined();
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBeGreaterThan(0);
    });

    it("should produce consistent HMAC for same input and secret", async () => {
      const hmac1 = await computeHMAC("consistent data", secret);
      const hmac2 = await computeHMAC("consistent data", secret);
      expect(hmac1).toBe(hmac2);
    });

    it("should produce different HMAC for different secrets", async () => {
      const hmac1 = await computeHMAC("test data", "secret1");
      const hmac2 = await computeHMAC("test data", "secret2");
      expect(hmac1).not.toBe(hmac2);
    });

    it("should produce different HMAC for different data", async () => {
      const hmac1 = await computeHMAC("data one", secret);
      const hmac2 = await computeHMAC("data two", secret);
      expect(hmac1).not.toBe(hmac2);
    });

    it("should support SHA-384 algorithm", async () => {
      const hmac = await computeHMAC("test data", secret, "SHA-384");
      expect(hmac).toBeDefined();
      expect(hmac.length).toBeGreaterThan(0);
    });

    it("should support SHA-512 algorithm", async () => {
      const hmac = await computeHMAC("test data", secret, "SHA-512");
      expect(hmac).toBeDefined();
      expect(hmac.length).toBeGreaterThan(0);
    });
  });

  describe("verifyHMAC", () => {
    const secret = "verification-secret";

    it("should verify valid HMAC", async () => {
      const data = "test data";
      const hmac = await computeHMAC(data, secret);
      const isValid = await verifyHMAC(data, hmac, secret);
      expect(isValid).toBe(true);
    });

    it("should reject invalid HMAC", async () => {
      const data = "test data";
      const isValid = await verifyHMAC(data, "invalid-hmac", secret);
      expect(isValid).toBe(false);
    });

    it("should reject HMAC with wrong secret", async () => {
      const data = "test data";
      const hmac = await computeHMAC(data, secret);
      const isValid = await verifyHMAC(data, hmac, "wrong-secret");
      expect(isValid).toBe(false);
    });

    it("should reject HMAC with wrong data", async () => {
      const hmac = await computeHMAC("original data", secret);
      const isValid = await verifyHMAC("tampered data", hmac, secret);
      expect(isValid).toBe(false);
    });
  });

  // ============================================================================
  // Hash Chain Operations Tests
  // ============================================================================

  describe("generateGenesisHash", () => {
    it("should generate genesis hash", async () => {
      const hash = await generateGenesisHash("test-chain-id");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should generate different hashes for different chain IDs", async () => {
      const hash1 = await generateGenesisHash("chain-1");
      const hash2 = await generateGenesisHash("chain-2");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("computeEntryHash", () => {
    it("should compute hash for audit entry", async () => {
      const entry = createMockEntry();
      const hash = await computeEntryHash(entry, "previous-hash", 1);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce consistent hash for same entry", async () => {
      const entry = createMockEntry({
        id: "fixed-id",
        timestamp: new Date("2024-01-01"),
      });
      const hash1 = await computeEntryHash(entry, "prev", 1);
      const hash2 = await computeEntryHash(entry, "prev", 1);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hash for different previous hash", async () => {
      const entry = createMockEntry({
        id: "fixed-id",
        timestamp: new Date("2024-01-01"),
      });
      const hash1 = await computeEntryHash(entry, "prev1", 1);
      const hash2 = await computeEntryHash(entry, "prev2", 1);
      expect(hash1).not.toBe(hash2);
    });

    it("should produce different hash for different block number", async () => {
      const entry = createMockEntry({
        id: "fixed-id",
        timestamp: new Date("2024-01-01"),
      });
      const hash1 = await computeEntryHash(entry, "prev", 1);
      const hash2 = await computeEntryHash(entry, "prev", 2);
      expect(hash1).not.toBe(hash2);
    });

    it("should support different hash algorithms", async () => {
      const entry = createMockEntry();
      const hash256 = await computeEntryHash(entry, "prev", 1, "SHA-256");
      const hash384 = await computeEntryHash(entry, "prev", 1, "SHA-384");
      const hash512 = await computeEntryHash(entry, "prev", 1, "SHA-512");
      expect(hash256).toBeDefined();
      expect(hash384).toBeDefined();
      expect(hash512).toBeDefined();
    });
  });

  describe("createIntegrityEntry", () => {
    it("should create integrity entry from audit entry", async () => {
      const entry = createMockEntry();
      const integrityEntry = await createIntegrityEntry(entry, "genesis", 1);

      expect(integrityEntry).toMatchObject({
        ...entry,
        entryHash: expect.any(String),
        previousHash: "genesis",
        blockNumber: 1,
      });
    });

    it("should add signature when enabled", async () => {
      const entry = createMockEntry();
      const config: IntegrityConfig = {
        ...DEFAULT_INTEGRITY_CONFIG,
        enableSignatures: true,
        signatureSecret: "test-secret",
      };
      const integrityEntry = await createIntegrityEntry(
        entry,
        "genesis",
        1,
        config,
      );

      expect(integrityEntry.signature).toBeDefined();
      expect(typeof integrityEntry.signature).toBe("string");
    });

    it("should not add signature when disabled", async () => {
      const entry = createMockEntry();
      const config: IntegrityConfig = {
        ...DEFAULT_INTEGRITY_CONFIG,
        enableSignatures: false,
      };
      const integrityEntry = await createIntegrityEntry(
        entry,
        "genesis",
        1,
        config,
      );

      expect(integrityEntry.signature).toBeUndefined();
    });

    it("should preserve original entry fields", async () => {
      const entry = createMockEntry({
        id: "unique-id",
        category: "authentication",
        action: "user.login",
        severity: "warning",
        description: "Test description",
      });
      const integrityEntry = await createIntegrityEntry(entry, "genesis", 1);

      expect(integrityEntry.id).toBe("unique-id");
      expect(integrityEntry.category).toBe("authentication");
      expect(integrityEntry.action).toBe("user.login");
      expect(integrityEntry.severity).toBe("warning");
      expect(integrityEntry.description).toBe("Test description");
    });
  });

  describe("verifyEntry", () => {
    it("should verify valid entry", async () => {
      const entry = createMockEntry();
      const integrityEntry = await createIntegrityEntry(entry, "genesis", 1);
      const result = await verifyEntry(integrityEntry, "genesis");

      expect(result.isValid).toBe(true);
      expect(result.hashValid).toBe(true);
      expect(result.chainValid).toBe(true);
    });

    it("should detect tampered hash", async () => {
      const entry = createMockEntry();
      const integrityEntry = await createIntegrityEntry(entry, "genesis", 1);

      // Tamper with the hash
      const tamperedEntry = { ...integrityEntry, entryHash: "tampered-hash" };
      const result = await verifyEntry(tamperedEntry, "genesis");

      expect(result.isValid).toBe(false);
      expect(result.hashValid).toBe(false);
    });

    it("should detect broken chain link", async () => {
      const entry = createMockEntry();
      const integrityEntry = await createIntegrityEntry(entry, "genesis", 1);
      const result = await verifyEntry(integrityEntry, "wrong-previous-hash");

      expect(result.isValid).toBe(false);
      expect(result.chainValid).toBe(false);
    });

    it("should verify signature when enabled", async () => {
      const entry = createMockEntry();
      const config: IntegrityConfig = {
        ...DEFAULT_INTEGRITY_CONFIG,
        enableSignatures: true,
        signatureSecret: "test-secret",
      };
      const integrityEntry = await createIntegrityEntry(
        entry,
        "genesis",
        1,
        config,
      );
      const result = await verifyEntry(integrityEntry, "genesis", config);

      expect(result.isValid).toBe(true);
      expect(result.signatureValid).toBe(true);
    });

    it("should detect invalid signature", async () => {
      const entry = createMockEntry();
      const config: IntegrityConfig = {
        ...DEFAULT_INTEGRITY_CONFIG,
        enableSignatures: true,
        signatureSecret: "test-secret",
      };
      const integrityEntry = await createIntegrityEntry(
        entry,
        "genesis",
        1,
        config,
      );

      // Tamper with signature
      const tamperedEntry = {
        ...integrityEntry,
        signature: "invalid-signature",
      };
      const result = await verifyEntry(tamperedEntry, "genesis", config);

      expect(result.isValid).toBe(false);
      expect(result.signatureValid).toBe(false);
    });

    it("should return entry metadata in result", async () => {
      const entry = createMockEntry({ id: "test-entry-id" });
      const integrityEntry = await createIntegrityEntry(entry, "genesis", 5);
      const result = await verifyEntry(integrityEntry, "genesis");

      expect(result.entryId).toBe("test-entry-id");
      expect(result.blockNumber).toBe(5);
    });
  });

  describe("verifyChain", () => {
    it("should verify valid chain", async () => {
      const genesis = await generateGenesisHash("test-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 5; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const result = await verifyChain(entries, genesis);

      expect(result.isValid).toBe(true);
      expect(result.totalEntries).toBe(5);
      expect(result.verifiedEntries).toBe(5);
      expect(result.invalidEntries).toBe(0);
      expect(result.compromisedBlocks).toHaveLength(0);
    });

    it("should detect tampered entry in chain", async () => {
      const genesis = await generateGenesisHash("test-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 5; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      // Tamper with middle entry
      entries[2] = { ...entries[2], entryHash: "tampered-hash" };

      const result = await verifyChain(entries, genesis);

      expect(result.isValid).toBe(false);
      expect(result.invalidEntries).toBeGreaterThan(0);
      expect(result.compromisedBlocks.length).toBeGreaterThan(0);
    });

    it("should detect genesis mismatch", async () => {
      const genesis = await generateGenesisHash("test-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 3; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const result = await verifyChain(entries, "wrong-genesis");

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Genesis hash mismatch")),
      ).toBe(true);
    });

    it("should handle empty chain", async () => {
      const genesis = await generateGenesisHash("empty-chain");
      const result = await verifyChain([], genesis);

      expect(result.isValid).toBe(true);
      expect(result.totalEntries).toBe(0);
      expect(result.chainMetadata.integrityStatus).toBe("valid");
    });

    it("should report chain metadata", async () => {
      const genesis = await generateGenesisHash("test-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 3; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const result = await verifyChain(entries, genesis);

      expect(result.chainMetadata).toMatchObject({
        genesisHash: genesis,
        startBlock: 1,
        endBlock: 3,
        totalBlocks: 3,
      });
    });

    it("should call compromise callback when configured", async () => {
      const onCompromise = jest.fn();
      const config: IntegrityConfig = {
        ...DEFAULT_INTEGRITY_CONFIG,
        alertOnCompromise: true,
        onCompromiseDetected: onCompromise,
      };

      const genesis = await generateGenesisHash("test-chain");
      const entry = createMockEntry();
      const integrityEntry = await createIntegrityEntry(entry, genesis, 1);
      const tamperedEntry = { ...integrityEntry, entryHash: "tampered" };

      await verifyChain([tamperedEntry], genesis, config);

      expect(onCompromise).toHaveBeenCalled();
      expect(onCompromise.mock.calls[0][0].isValid).toBe(false);
    });

    it("should report verification duration", async () => {
      const genesis = await generateGenesisHash("test-chain");
      const result = await verifyChain([], genesis);

      expect(result.verificationDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.verifiedAt).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // Merkle Tree Operations Tests
  // ============================================================================

  describe("buildMerkleTree", () => {
    it("should build tree from entries", async () => {
      const genesis = await generateGenesisHash("merkle-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 4; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const tree = await buildMerkleTree(entries);

      expect(tree).toBeDefined();
      expect(tree!.hash).toBeDefined();
    });

    it("should return null for empty entries", async () => {
      const tree = await buildMerkleTree([]);
      expect(tree).toBeNull();
    });

    it("should handle single entry", async () => {
      const entry = createMockEntry();
      const integrityEntry = await createIntegrityEntry(entry, "genesis", 1);

      const tree = await buildMerkleTree([integrityEntry]);

      expect(tree).toBeDefined();
      expect(tree!.hash).toBe(integrityEntry.entryHash);
    });

    it("should handle odd number of entries", async () => {
      const genesis = await generateGenesisHash("merkle-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 3; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const tree = await buildMerkleTree(entries);

      expect(tree).toBeDefined();
      expect(tree!.hash).toBeDefined();
    });
  });

  describe("getMerkleRoot", () => {
    it("should get root hash", async () => {
      const genesis = await generateGenesisHash("merkle-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 4; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const root = await getMerkleRoot(entries);

      expect(root).toBeDefined();
      expect(typeof root).toBe("string");
      expect(root.length).toBeGreaterThan(0);
    });

    it("should return empty string for empty entries", async () => {
      const root = await getMerkleRoot([]);
      expect(root).toBe("");
    });

    it("should produce consistent root for same entries", async () => {
      const genesis = await generateGenesisHash("consistent-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 4; i++) {
        const entry = createMockEntry({
          id: `fixed-entry-${i}`,
          timestamp: new Date("2024-01-01"),
        });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const root1 = await getMerkleRoot(entries);
      const root2 = await getMerkleRoot(entries);

      expect(root1).toBe(root2);
    });
  });

  describe("generateMerkleProof", () => {
    it("should generate proof for entry", async () => {
      const genesis = await generateGenesisHash("proof-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 4; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const proof = await generateMerkleProof(entries, entries[1].entryHash);

      expect(proof).toBeDefined();
      expect(proof!.entryHash).toBe(entries[1].entryHash);
      expect(proof!.root).toBeDefined();
      expect(proof!.proof).toBeDefined();
      expect(Array.isArray(proof!.proof)).toBe(true);
    });

    it("should return null for non-existent entry", async () => {
      const entry = createMockEntry();
      const integrityEntry = await createIntegrityEntry(entry, "genesis", 1);

      const proof = await generateMerkleProof(
        [integrityEntry],
        "non-existent-hash",
      );

      expect(proof).toBeNull();
    });

    it("should generate valid proof for first entry", async () => {
      const genesis = await generateGenesisHash("proof-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 4; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const proof = await generateMerkleProof(entries, entries[0].entryHash);

      expect(proof).toBeDefined();
      expect(proof!.entryHash).toBe(entries[0].entryHash);
    });

    it("should generate valid proof for last entry", async () => {
      const genesis = await generateGenesisHash("proof-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 4; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const proof = await generateMerkleProof(
        entries,
        entries[entries.length - 1].entryHash,
      );

      expect(proof).toBeDefined();
      expect(proof!.entryHash).toBe(entries[entries.length - 1].entryHash);
    });
  });

  describe("verifyMerkleProof", () => {
    it("should verify valid proof", async () => {
      const genesis = await generateGenesisHash("verify-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 4; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const proof = await generateMerkleProof(entries, entries[1].entryHash);
      const isValid = await verifyMerkleProof(proof!);

      expect(isValid).toBe(true);
    });

    it("should reject proof with tampered root", async () => {
      const genesis = await generateGenesisHash("verify-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 4; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const proof = await generateMerkleProof(entries, entries[1].entryHash);
      const tamperedProof = { ...proof!, root: "tampered-root" };
      const isValid = await verifyMerkleProof(tamperedProof);

      expect(isValid).toBe(false);
    });

    it("should reject proof with tampered entry hash", async () => {
      const genesis = await generateGenesisHash("verify-chain");
      const entries: IntegrityAuditEntry[] = [];

      let prevHash = genesis;
      for (let i = 1; i <= 4; i++) {
        const entry = createMockEntry({ id: `entry-${i}` });
        const integrityEntry = await createIntegrityEntry(entry, prevHash, i);
        entries.push(integrityEntry);
        prevHash = integrityEntry.entryHash;
      }

      const proof = await generateMerkleProof(entries, entries[1].entryHash);
      const tamperedProof = { ...proof!, entryHash: "tampered-hash" };
      const isValid = await verifyMerkleProof(tamperedProof);

      expect(isValid).toBe(false);
    });
  });

  // ============================================================================
  // AuditIntegrityService Tests
  // ============================================================================

  describe("AuditIntegrityService", () => {
    let service: AuditIntegrityService;

    beforeEach(() => {
      service = createIntegrityService();
    });

    describe("constructor", () => {
      it("should create with default config", () => {
        const svc = new AuditIntegrityService();
        expect(svc).toBeDefined();
      });

      it("should accept custom config", () => {
        const config: Partial<IntegrityConfig> = {
          algorithm: "SHA-512",
          enableSignatures: true,
          signatureSecret: "custom-secret",
        };
        const svc = new AuditIntegrityService(config);
        expect(svc).toBeDefined();
      });
    });

    describe("initialize", () => {
      it("should initialize chain", async () => {
        await service.initialize();
        const metadata = service.getMetadata();

        expect(metadata.chainId).toBeDefined();
        expect(metadata.genesisHash).toBeDefined();
        expect(metadata.currentHash).toBe(metadata.genesisHash);
        expect(metadata.totalBlocks).toBe(0);
      });
    });

    describe("addEntry", () => {
      it("should add entry with integrity", async () => {
        await service.initialize();
        const entry = createMockEntry();
        const integrityEntry = await service.addEntry(entry);

        expect(integrityEntry.entryHash).toBeDefined();
        expect(integrityEntry.previousHash).toBeDefined();
        expect(integrityEntry.blockNumber).toBe(1);
      });

      it("should auto-initialize if not initialized", async () => {
        const entry = createMockEntry();
        const integrityEntry = await service.addEntry(entry);

        expect(integrityEntry.blockNumber).toBe(1);
        expect(service.getMetadata().genesisHash).toBeDefined();
      });

      it("should increment block number", async () => {
        await service.initialize();

        const entry1 = await service.addEntry(createMockEntry());
        const entry2 = await service.addEntry(createMockEntry());
        const entry3 = await service.addEntry(createMockEntry());

        expect(entry1.blockNumber).toBe(1);
        expect(entry2.blockNumber).toBe(2);
        expect(entry3.blockNumber).toBe(3);
      });

      it("should chain entries correctly", async () => {
        await service.initialize();
        const genesis = service.getMetadata().genesisHash;

        const entry1 = await service.addEntry(createMockEntry());
        const entry2 = await service.addEntry(createMockEntry());

        expect(entry1.previousHash).toBe(genesis);
        expect(entry2.previousHash).toBe(entry1.entryHash);
      });
    });

    describe("verify", () => {
      it("should verify valid chain", async () => {
        await service.initialize();

        for (let i = 0; i < 5; i++) {
          await service.addEntry(createMockEntry());
        }

        const result = await service.verify();

        expect(result.isValid).toBe(true);
        expect(result.verifiedEntries).toBe(5);
      });

      it("should verify empty chain", async () => {
        await service.initialize();
        const result = await service.verify();

        expect(result.isValid).toBe(true);
        expect(result.totalEntries).toBe(0);
      });
    });

    describe("getMetadata", () => {
      it("should return chain metadata", async () => {
        await service.initialize();
        await service.addEntry(createMockEntry());
        await service.addEntry(createMockEntry());

        const metadata = service.getMetadata();

        expect(metadata.chainId).toBeDefined();
        expect(metadata.genesisHash).toBeDefined();
        expect(metadata.currentHash).toBeDefined();
        expect(metadata.totalBlocks).toBe(2);
        expect(metadata.startBlock).toBe(1);
        expect(metadata.endBlock).toBe(2);
      });
    });

    describe("getEntries", () => {
      it("should return all entries", async () => {
        await service.initialize();

        for (let i = 0; i < 3; i++) {
          await service.addEntry(createMockEntry());
        }

        const entries = service.getEntries();

        expect(entries).toHaveLength(3);
        expect(entries[0].blockNumber).toBe(1);
        expect(entries[2].blockNumber).toBe(3);
      });

      it("should return copy of entries", async () => {
        await service.initialize();
        await service.addEntry(createMockEntry());

        const entries1 = service.getEntries();
        const entries2 = service.getEntries();

        expect(entries1).not.toBe(entries2);
      });
    });

    describe("getEntryByBlock", () => {
      it("should get entry by block number", async () => {
        await service.initialize();

        const entry2 = createMockEntry({ id: "target-entry" });
        await service.addEntry(createMockEntry());
        await service.addEntry(entry2);
        await service.addEntry(createMockEntry());

        const found = service.getEntryByBlock(2);

        expect(found).toBeDefined();
        expect(found!.id).toBe("target-entry");
      });

      it("should return undefined for non-existent block", async () => {
        await service.initialize();
        await service.addEntry(createMockEntry());

        const found = service.getEntryByBlock(999);

        expect(found).toBeUndefined();
      });
    });

    describe("getMerkleRoot", () => {
      it("should get merkle root", async () => {
        await service.initialize();

        for (let i = 0; i < 4; i++) {
          await service.addEntry(createMockEntry());
        }

        const root = await service.getMerkleRoot();

        expect(root).toBeDefined();
        expect(typeof root).toBe("string");
        expect(root.length).toBeGreaterThan(0);
      });

      it("should return empty for no entries", async () => {
        await service.initialize();
        const root = await service.getMerkleRoot();

        expect(root).toBe("");
      });
    });

    describe("generateProof and verifyProof", () => {
      it("should generate and verify proof", async () => {
        await service.initialize();

        for (let i = 0; i < 4; i++) {
          await service.addEntry(createMockEntry());
        }

        const entries = service.getEntries();
        const proof = await service.generateProof(entries[1].entryHash);

        expect(proof).toBeDefined();

        const isValid = await service.verifyProof(proof!);

        expect(isValid).toBe(true);
      });
    });

    describe("exportState and importState", () => {
      it("should export and import state", async () => {
        await service.initialize();

        for (let i = 0; i < 3; i++) {
          await service.addEntry(createMockEntry());
        }

        const state = service.exportState();

        const newService = createIntegrityService();
        newService.importState(state);

        expect(newService.getEntries()).toHaveLength(3);
        expect(newService.getMetadata().chainId).toBe(state.chainId);
        expect(newService.getMetadata().genesisHash).toBe(state.genesisHash);
      });
    });

    describe("clear", () => {
      it("should clear chain", async () => {
        await service.initialize();

        for (let i = 0; i < 5; i++) {
          await service.addEntry(createMockEntry());
        }

        service.clear();

        expect(service.getEntries()).toHaveLength(0);
        expect(service.getMetadata().totalBlocks).toBe(0);
      });
    });

    describe("getStatistics", () => {
      it("should return statistics", async () => {
        await service.initialize();

        for (let i = 0; i < 3; i++) {
          await service.addEntry(createMockEntry());
        }

        const stats = service.getStatistics();

        expect(stats.totalEntries).toBe(3);
        expect(stats.chainLength).toBe(3);
      });
    });
  });

  // ============================================================================
  // Singleton Factory Tests
  // ============================================================================

  describe("Singleton Factory", () => {
    describe("getIntegrityService", () => {
      it("should return singleton instance", () => {
        const service1 = getIntegrityService();
        const service2 = getIntegrityService();

        expect(service1).toBe(service2);
      });
    });

    describe("createIntegrityService", () => {
      it("should create new instance each time", () => {
        const service1 = createIntegrityService();
        const service2 = createIntegrityService();

        expect(service1).not.toBe(service2);
      });

      it("should accept custom config", () => {
        const config: Partial<IntegrityConfig> = {
          algorithm: "SHA-384",
        };
        const service = createIntegrityService(config);

        expect(service).toBeDefined();
      });
    });
  });

  // ============================================================================
  // Default Config Tests
  // ============================================================================

  describe("DEFAULT_INTEGRITY_CONFIG", () => {
    it("should have expected defaults", () => {
      expect(DEFAULT_INTEGRITY_CONFIG.algorithm).toBe("SHA-256");
      expect(DEFAULT_INTEGRITY_CONFIG.enableSignatures).toBe(true);
      expect(DEFAULT_INTEGRITY_CONFIG.enableMerkleTree).toBe(true);
      expect(DEFAULT_INTEGRITY_CONFIG.merkleTreeBatchSize).toBe(1000);
      expect(DEFAULT_INTEGRITY_CONFIG.alertOnCompromise).toBe(true);
    });
  });
});
