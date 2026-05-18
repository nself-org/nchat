/**
 * Audit Integrity Module - Tamper detection and verification
 *
 * Provides cryptographic integrity verification for audit logs using:
 * - SHA-256 hash chains for sequential verification
 * - HMAC signatures for authenticity
 * - Merkle trees for efficient batch verification
 * - Integrity reporting and alerting
 */

import { v4 as uuidv4 } from "uuid";
import type { AuditLogEntry } from "./audit-types";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Hash algorithm used for integrity checks
 */
export type HashAlgorithm = "SHA-256" | "SHA-384" | "SHA-512";

/**
 * Entry with integrity fields
 */
export interface IntegrityAuditEntry extends AuditLogEntry {
  entryHash: string;
  previousHash: string;
  signature?: string;
  blockNumber: number;
}

/**
 * Integrity verification result for a single entry
 */
export interface EntryVerificationResult {
  entryId: string;
  blockNumber: number;
  isValid: boolean;
  hashValid: boolean;
  chainValid: boolean;
  signatureValid: boolean | null;
  error?: string;
}

/**
 * Full chain verification result
 */
export interface ChainVerificationResult {
  isValid: boolean;
  totalEntries: number;
  verifiedEntries: number;
  invalidEntries: number;
  compromisedBlocks: number[];
  firstInvalidBlock?: number;
  errors: string[];
  verifiedAt: Date;
  verificationDurationMs: number;
  chainMetadata: ChainMetadata;
}

/**
 * Chain metadata
 */
export interface ChainMetadata {
  chainId: string;
  genesisHash: string;
  currentHash: string;
  startBlock: number;
  endBlock: number;
  totalBlocks: number;
  createdAt: Date;
  lastModified: Date;
  integrityStatus: "valid" | "compromised" | "unknown" | "partial";
}

/**
 * Merkle tree node
 */
export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: string;
}

/**
 * Merkle proof for verification
 */
export interface MerkleProof {
  entryHash: string;
  root: string;
  proof: Array<{
    hash: string;
    position: "left" | "right";
  }>;
}

/**
 * Integrity check configuration
 */
export interface IntegrityConfig {
  algorithm: HashAlgorithm;
  enableSignatures: boolean;
  signatureSecret?: string;
  enableMerkleTree: boolean;
  merkleTreeBatchSize: number;
  alertOnCompromise: boolean;
  onCompromiseDetected?: (result: ChainVerificationResult) => void;
}

/**
 * Default configuration
 */
export const DEFAULT_INTEGRITY_CONFIG: IntegrityConfig = {
  algorithm: "SHA-256",
  enableSignatures: true,
  enableMerkleTree: true,
  merkleTreeBatchSize: 1000,
  alertOnCompromise: true,
};

// ============================================================================
// Cryptographic Utilities
// ============================================================================

/**
 * Compute SHA-256 hash using Web Crypto API
 */
export async function computeHash(
  data: string,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  // Use Web Crypto API in browser/Edge runtime
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for Node.js
  try {
    const nodeCrypto = await import("crypto");
    const algorithmMap: Record<HashAlgorithm, string> = {
      "SHA-256": "sha256",
      "SHA-384": "sha384",
      "SHA-512": "sha512",
    };
    return nodeCrypto
      .createHash(algorithmMap[algorithm])
      .update(data)
      .digest("hex");
  } catch {
    // Ultimate fallback - simple hash (not cryptographically secure, for testing only)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, "0");
  }
}

/**
 * Compute HMAC signature
 */
export async function computeHMAC(
  data: string,
  secret: string,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const dataBuffer = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: algorithm },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, dataBuffer);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    return signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for Node.js
  try {
    const nodeCrypto = await import("crypto");
    const algorithmMap: Record<HashAlgorithm, string> = {
      "SHA-256": "sha256",
      "SHA-384": "sha384",
      "SHA-512": "sha512",
    };
    return nodeCrypto
      .createHmac(algorithmMap[algorithm], secret)
      .update(data)
      .digest("hex");
  } catch {
    // Fallback - XOR with secret (not secure, for testing only)
    return computeHash(data + secret, algorithm);
  }
}

/**
 * Verify HMAC signature
 */
export async function verifyHMAC(
  data: string,
  signature: string,
  secret: string,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<boolean> {
  const computed = await computeHMAC(data, secret, algorithm);
  return computed === signature;
}

// ============================================================================
// Hash Chain Operations
// ============================================================================

/**
 * Generate genesis hash for new chain
 */
export async function generateGenesisHash(chainId: string): Promise<string> {
  const genesisData = {
    chainId,
    type: "genesis",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    random: uuidv4(),
  };
  return computeHash(JSON.stringify(genesisData));
}

/**
 * Compute entry hash from audit entry data
 */
export async function computeEntryHash(
  entry: AuditLogEntry,
  previousHash: string,
  blockNumber: number,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  const hashInput = {
    id: entry.id,
    timestamp:
      entry.timestamp instanceof Date
        ? entry.timestamp.toISOString()
        : entry.timestamp,
    category: entry.category,
    action: entry.action,
    severity: entry.severity,
    actorId: entry.actor.id,
    actorType: entry.actor.type,
    resourceId: entry.resource?.id,
    resourceType: entry.resource?.type,
    description: entry.description,
    success: entry.success,
    previousHash,
    blockNumber,
  };

  return computeHash(JSON.stringify(hashInput), algorithm);
}

/**
 * Create integrity-enhanced entry
 */
export async function createIntegrityEntry(
  entry: AuditLogEntry,
  previousHash: string,
  blockNumber: number,
  config: IntegrityConfig = DEFAULT_INTEGRITY_CONFIG,
): Promise<IntegrityAuditEntry> {
  const entryHash = await computeEntryHash(
    entry,
    previousHash,
    blockNumber,
    config.algorithm,
  );

  const integrityEntry: IntegrityAuditEntry = {
    ...entry,
    entryHash,
    previousHash,
    blockNumber,
  };

  // Add signature if enabled
  if (config.enableSignatures && config.signatureSecret) {
    integrityEntry.signature = await computeHMAC(
      entryHash,
      config.signatureSecret,
      config.algorithm,
    );
  }

  return integrityEntry;
}

/**
 * Verify single entry integrity
 */
export async function verifyEntry(
  entry: IntegrityAuditEntry,
  expectedPreviousHash: string,
  config: IntegrityConfig = DEFAULT_INTEGRITY_CONFIG,
): Promise<EntryVerificationResult> {
  const result: EntryVerificationResult = {
    entryId: entry.id,
    blockNumber: entry.blockNumber,
    isValid: true,
    hashValid: false,
    chainValid: false,
    signatureValid: null,
  };

  try {
    // Verify hash
    const computedHash = await computeEntryHash(
      entry,
      entry.previousHash,
      entry.blockNumber,
      config.algorithm,
    );
    result.hashValid = computedHash === entry.entryHash;

    // Verify chain link
    result.chainValid = entry.previousHash === expectedPreviousHash;

    // Verify signature if present
    if (config.enableSignatures && entry.signature && config.signatureSecret) {
      result.signatureValid = await verifyHMAC(
        entry.entryHash,
        entry.signature,
        config.signatureSecret,
        config.algorithm,
      );
    }

    // Overall validity
    result.isValid =
      result.hashValid && result.chainValid && result.signatureValid !== false;
  } catch (error) {
    result.isValid = false;
    result.error = (error as Error).message;
  }

  return result;
}

/**
 * Verify entire chain integrity
 */
export async function verifyChain(
  entries: IntegrityAuditEntry[],
  genesisHash: string,
  config: IntegrityConfig = DEFAULT_INTEGRITY_CONFIG,
): Promise<ChainVerificationResult> {
  const startTime = Date.now();

  const result: ChainVerificationResult = {
    isValid: true,
    totalEntries: entries.length,
    verifiedEntries: 0,
    invalidEntries: 0,
    compromisedBlocks: [],
    errors: [],
    verifiedAt: new Date(),
    verificationDurationMs: 0,
    chainMetadata: {
      chainId: uuidv4(),
      genesisHash,
      currentHash:
        entries.length > 0
          ? entries[entries.length - 1].entryHash
          : genesisHash,
      startBlock: entries.length > 0 ? entries[0].blockNumber : 0,
      endBlock:
        entries.length > 0 ? entries[entries.length - 1].blockNumber : 0,
      totalBlocks: entries.length,
      createdAt: new Date(),
      lastModified: new Date(),
      integrityStatus: "unknown",
    },
  };

  if (entries.length === 0) {
    result.chainMetadata.integrityStatus = "valid";
    result.verificationDurationMs = Date.now() - startTime;
    return result;
  }

  // Sort entries by block number
  const sortedEntries = [...entries].sort(
    (a, b) => a.blockNumber - b.blockNumber,
  );

  // Verify genesis link
  if (sortedEntries[0].previousHash !== genesisHash) {
    result.errors.push(
      `Genesis hash mismatch: expected ${genesisHash}, got ${sortedEntries[0].previousHash}`,
    );
    result.isValid = false;
    result.compromisedBlocks.push(sortedEntries[0].blockNumber);
    result.firstInvalidBlock = sortedEntries[0].blockNumber;
  }

  // Verify each entry
  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    const expectedPreviousHash =
      i === 0 ? genesisHash : sortedEntries[i - 1].entryHash;

    // Verify block number sequence
    const expectedBlockNumber =
      i === 0 ? entry.blockNumber : sortedEntries[i - 1].blockNumber + 1;
    if (entry.blockNumber !== expectedBlockNumber && i > 0) {
      result.errors.push(
        `Block number gap at index ${i}: expected ${expectedBlockNumber}, got ${entry.blockNumber}`,
      );
      result.compromisedBlocks.push(entry.blockNumber);
      result.isValid = false;
      if (!result.firstInvalidBlock) {
        result.firstInvalidBlock = entry.blockNumber;
      }
      continue;
    }

    const verification = await verifyEntry(entry, expectedPreviousHash, config);

    if (!verification.isValid) {
      result.invalidEntries++;
      result.compromisedBlocks.push(entry.blockNumber);
      result.isValid = false;

      if (!result.firstInvalidBlock) {
        result.firstInvalidBlock = entry.blockNumber;
      }

      if (!verification.hashValid) {
        result.errors.push(`Hash mismatch at block ${entry.blockNumber}`);
      }
      if (!verification.chainValid) {
        result.errors.push(`Chain broken at block ${entry.blockNumber}`);
      }
      if (verification.signatureValid === false) {
        result.errors.push(`Invalid signature at block ${entry.blockNumber}`);
      }
      if (verification.error) {
        result.errors.push(
          `Error at block ${entry.blockNumber}: ${verification.error}`,
        );
      }
    } else {
      result.verifiedEntries++;
    }
  }

  // Set final status
  result.chainMetadata.integrityStatus = result.isValid
    ? "valid"
    : "compromised";
  result.verificationDurationMs = Date.now() - startTime;

  // Alert on compromise if configured
  if (
    !result.isValid &&
    config.alertOnCompromise &&
    config.onCompromiseDetected
  ) {
    config.onCompromiseDetected(result);
  }

  return result;
}

// ============================================================================
// Merkle Tree Operations
// ============================================================================

/**
 * Build Merkle tree from entries
 */
export async function buildMerkleTree(
  entries: IntegrityAuditEntry[],
  algorithm: HashAlgorithm = "SHA-256",
): Promise<MerkleNode | null> {
  if (entries.length === 0) {
    return null;
  }

  // Create leaf nodes
  let nodes: MerkleNode[] = entries.map((entry) => ({
    hash: entry.entryHash,
    data: entry.id,
  }));

  // Build tree bottom-up
  while (nodes.length > 1) {
    const newLevel: MerkleNode[] = [];

    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1] || nodes[i]; // Duplicate last node if odd

      const combinedHash = await computeHash(left.hash + right.hash, algorithm);

      newLevel.push({
        hash: combinedHash,
        left,
        right: nodes[i + 1] ? right : undefined,
      });
    }

    nodes = newLevel;
  }

  return nodes[0];
}

/**
 * Get Merkle root hash
 */
export async function getMerkleRoot(
  entries: IntegrityAuditEntry[],
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  const tree = await buildMerkleTree(entries, algorithm);
  return tree?.hash || "";
}

/**
 * Generate Merkle proof for an entry
 */
export async function generateMerkleProof(
  entries: IntegrityAuditEntry[],
  targetEntryHash: string,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<MerkleProof | null> {
  const targetIndex = entries.findIndex((e) => e.entryHash === targetEntryHash);
  if (targetIndex === -1) {
    return null;
  }

  const proof: MerkleProof["proof"] = [];
  let nodes = entries.map((e) => e.entryHash);
  let currentIndex = targetIndex;

  while (nodes.length > 1) {
    const newLevel: string[] = [];
    const siblingIndex =
      currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

    if (siblingIndex < nodes.length) {
      proof.push({
        hash: nodes[siblingIndex],
        position: currentIndex % 2 === 0 ? "right" : "left",
      });
    }

    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1] || nodes[i];
      const combinedHash = await computeHash(left + right, algorithm);
      newLevel.push(combinedHash);
    }

    nodes = newLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    entryHash: targetEntryHash,
    root: nodes[0],
    proof,
  };
}

/**
 * Verify Merkle proof
 */
export async function verifyMerkleProof(
  proof: MerkleProof,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<boolean> {
  let currentHash = proof.entryHash;

  for (const step of proof.proof) {
    const left = step.position === "left" ? step.hash : currentHash;
    const right = step.position === "right" ? step.hash : currentHash;
    currentHash = await computeHash(left + right, algorithm);
  }

  return currentHash === proof.root;
}

// ============================================================================
// Integrity Service Class
// ============================================================================

/**
 * Audit Integrity Service for managing hash chains
 */
export class AuditIntegrityService {
  private config: IntegrityConfig;
  private chainId: string;
  private genesisHash: string;
  private currentHash: string;
  private currentBlock: number;
  private entries: IntegrityAuditEntry[] = [];
  private merkleRoot: string | null = null;

  constructor(config: Partial<IntegrityConfig> = {}) {
    this.config = { ...DEFAULT_INTEGRITY_CONFIG, ...config };
    this.chainId = uuidv4();
    this.genesisHash = "";
    this.currentHash = "";
    this.currentBlock = 0;
  }

  /**
   * Initialize the chain
   */
  async initialize(): Promise<void> {
    this.genesisHash = await generateGenesisHash(this.chainId);
    this.currentHash = this.genesisHash;
    this.currentBlock = 0;
    logger.info("[AuditIntegrity] Chain initialized", {
      chainId: this.chainId,
    });
  }

  /**
   * Add entry with integrity
   */
  async addEntry(entry: AuditLogEntry): Promise<IntegrityAuditEntry> {
    if (!this.genesisHash) {
      await this.initialize();
    }

    this.currentBlock++;
    const integrityEntry = await createIntegrityEntry(
      entry,
      this.currentHash,
      this.currentBlock,
      this.config,
    );

    this.entries.push(integrityEntry);
    this.currentHash = integrityEntry.entryHash;

    // Update Merkle root periodically
    if (
      this.config.enableMerkleTree &&
      this.entries.length % this.config.merkleTreeBatchSize === 0
    ) {
      this.merkleRoot = await getMerkleRoot(
        this.entries,
        this.config.algorithm,
      );
    }

    return integrityEntry;
  }

  /**
   * Verify chain integrity
   */
  async verify(): Promise<ChainVerificationResult> {
    return verifyChain(this.entries, this.genesisHash, this.config);
  }

  /**
   * Get chain metadata
   */
  getMetadata(): ChainMetadata {
    return {
      chainId: this.chainId,
      genesisHash: this.genesisHash,
      currentHash: this.currentHash,
      startBlock: this.entries.length > 0 ? this.entries[0].blockNumber : 0,
      endBlock: this.currentBlock,
      totalBlocks: this.entries.length,
      createdAt: new Date(),
      lastModified: new Date(),
      integrityStatus: "unknown",
    };
  }

  /**
   * Get all entries
   */
  getEntries(): IntegrityAuditEntry[] {
    return [...this.entries];
  }

  /**
   * Get entry by block number
   */
  getEntryByBlock(blockNumber: number): IntegrityAuditEntry | undefined {
    return this.entries.find((e) => e.blockNumber === blockNumber);
  }

  /**
   * Get Merkle root
   */
  async getMerkleRoot(): Promise<string> {
    if (
      !this.merkleRoot ||
      this.entries.length % this.config.merkleTreeBatchSize !== 0
    ) {
      this.merkleRoot = await getMerkleRoot(
        this.entries,
        this.config.algorithm,
      );
    }
    return this.merkleRoot || "";
  }

  /**
   * Generate proof for entry
   */
  async generateProof(entryHash: string): Promise<MerkleProof | null> {
    return generateMerkleProof(this.entries, entryHash, this.config.algorithm);
  }

  /**
   * Verify proof
   */
  async verifyProof(proof: MerkleProof): Promise<boolean> {
    return verifyMerkleProof(proof, this.config.algorithm);
  }

  /**
   * Export chain state for persistence
   */
  exportState(): {
    chainId: string;
    genesisHash: string;
    currentHash: string;
    currentBlock: number;
    entries: IntegrityAuditEntry[];
    merkleRoot: string | null;
  } {
    return {
      chainId: this.chainId,
      genesisHash: this.genesisHash,
      currentHash: this.currentHash,
      currentBlock: this.currentBlock,
      entries: this.entries,
      merkleRoot: this.merkleRoot,
    };
  }

  /**
   * Import chain state
   */
  importState(state: ReturnType<AuditIntegrityService["exportState"]>): void {
    this.chainId = state.chainId;
    this.genesisHash = state.genesisHash;
    this.currentHash = state.currentHash;
    this.currentBlock = state.currentBlock;
    this.entries = state.entries.map((e) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }));
    this.merkleRoot = state.merkleRoot;
  }

  /**
   * Clear chain (for testing)
   */
  clear(): void {
    this.entries = [];
    this.currentBlock = 0;
    this.currentHash = this.genesisHash;
    this.merkleRoot = null;
  }

  /**
   * Get chain statistics
   */
  getStatistics(): {
    totalEntries: number;
    chainLength: number;
    merkleRoot: string | null;
    integrityStatus: ChainMetadata["integrityStatus"];
  } {
    return {
      totalEntries: this.entries.length,
      chainLength: this.currentBlock,
      merkleRoot: this.merkleRoot,
      integrityStatus: "unknown",
    };
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let integrityServiceInstance: AuditIntegrityService | null = null;

/**
 * Get singleton integrity service
 */
export function getIntegrityService(
  config?: Partial<IntegrityConfig>,
): AuditIntegrityService {
  if (!integrityServiceInstance) {
    integrityServiceInstance = new AuditIntegrityService(config);
  }
  return integrityServiceInstance;
}

/**
 * Create new integrity service instance
 */
export function createIntegrityService(
  config?: Partial<IntegrityConfig>,
): AuditIntegrityService {
  return new AuditIntegrityService(config);
}

export default AuditIntegrityService;
