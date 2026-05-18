/**
 * Blockchain Backup for Audit Logs
 *
 * Provides an optional blockchain-based backup mechanism for audit logs
 * to ensure tamper-proof, immutable record keeping with cryptographic verification.
 *
 * Features:
 * - Merkle tree for efficient batch verification
 * - Blockchain anchoring (simulated for demo)
 * - Cryptographic proof generation
 * - Verification against blockchain
 */

import type { TamperProofLogEntry, AuditLogChain } from "./tamper-proof-audit";

// ============================================================================
// Types
// ============================================================================

export interface BlockchainAnchor {
  id: string;
  chainId: string;
  blockNumber: number;
  merkleRoot: string;
  timestamp: Date;
  batchSize: number;
  blockchainTxHash?: string; // Transaction hash on blockchain
  blockchainNetwork?: string; // e.g., 'ethereum', 'polygon', 'bitcoin'
  blockHeight?: number; // Block height on blockchain
  verified: boolean;
  verifiedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface MerkleProof {
  entryId: string;
  entryHash: string;
  merkleRoot: string;
  siblings: string[]; // Sibling hashes for verification
  path: number[]; // 0 for left, 1 for right
  depth: number;
}

export interface BlockchainVerificationResult {
  valid: boolean;
  anchor: BlockchainAnchor;
  merkleProof?: MerkleProof;
  errors: string[];
  verifiedAt: Date;
}

// ============================================================================
// Merkle Tree Implementation
// ============================================================================

class MerkleTree {
  private leaves: string[];
  private tree: string[][];

  constructor(leaves: string[]) {
    this.leaves = leaves;
    this.tree = this.buildTree(leaves);
  }

  /**
   * Build Merkle tree from leaves
   */
  private buildTree(leaves: string[]): string[][] {
    if (leaves.length === 0) return [[]];

    const tree: string[][] = [leaves];

    let currentLevel = leaves;
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        const combined = this.hashPair(left, right);
        nextLevel.push(combined);
      }

      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return tree;
  }

  /**
   * Hash a pair of values
   */
  private hashPair(left: string, right: string): string {
    const combined = `${left}${right}`;
    return this.hash(combined);
  }

  /**
   * Simple hash function (in production, use SHA-256)
   */
  private hash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }

  /**
   * Get root hash
   */
  getRoot(): string {
    if (
      this.tree.length === 0 ||
      this.tree[this.tree.length - 1].length === 0
    ) {
      return "0000000000000000";
    }
    return this.tree[this.tree.length - 1][0];
  }

  /**
   * Generate Merkle proof for a leaf
   */
  getProof(leafIndex: number): { siblings: string[]; path: number[] } {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error("Invalid leaf index");
    }

    const siblings: string[] = [];
    const path: number[] = [];

    let index = leafIndex;

    for (let level = 0; level < this.tree.length - 1; level++) {
      const levelSize = this.tree[level].length;
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;

      if (siblingIndex < levelSize) {
        siblings.push(this.tree[level][siblingIndex]);
        path.push(index % 2);
      }

      index = Math.floor(index / 2);
    }

    return { siblings, path };
  }

  /**
   * Verify Merkle proof
   */
  verifyProof(
    leafHash: string,
    proof: { siblings: string[]; path: number[] },
    root: string,
  ): boolean {
    let hash = leafHash;

    for (let i = 0; i < proof.siblings.length; i++) {
      const sibling = proof.siblings[i];
      const isLeft = proof.path[i] === 0;

      hash = isLeft
        ? this.hashPair(hash, sibling)
        : this.hashPair(sibling, hash);
    }

    return hash === root;
  }
}

// ============================================================================
// Blockchain Backup Service
// ============================================================================

export class BlockchainBackupService {
  private anchors: Map<string, BlockchainAnchor> = new Map();
  private batchSize = 100; // Anchor every 100 entries

  /**
   * Create blockchain anchor for audit entries
   */
  async createAnchor(
    chainId: string,
    entries: TamperProofLogEntry[],
    options?: {
      network?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<BlockchainAnchor> {
    if (entries.length === 0) {
      throw new Error("Cannot create anchor with no entries");
    }

    // Build Merkle tree from entry hashes
    const entryHashes = entries.map((e) => e.entryHash);
    const merkleTree = new MerkleTree(entryHashes);
    const merkleRoot = merkleTree.getRoot();

    // Create anchor
    const anchor: BlockchainAnchor = {
      id: crypto.randomUUID(),
      chainId,
      blockNumber: entries[0].blockNumber,
      merkleRoot,
      timestamp: new Date(),
      batchSize: entries.length,
      blockchainNetwork: options?.network || "simulated",
      verified: false,
      metadata: options?.metadata,
    };

    // Simulate blockchain transaction
    if (anchor.blockchainNetwork !== "simulated") {
      // In production, submit to actual blockchain
      // const txHash = await submitToBlockchain(merkleRoot, network)
      // anchor.blockchainTxHash = txHash
      // anchor.blockHeight = await getBlockHeight(network)
    } else {
      // Simulate
      anchor.blockchainTxHash = `0x${this.generateSimulatedTxHash()}`;
      anchor.blockHeight = Math.floor(Date.now() / 1000); // Use timestamp as block height
    }

    this.anchors.set(anchor.id, anchor);

    return anchor;
  }

  /**
   * Generate Merkle proof for an entry
   */
  generateMerkleProof(
    entries: TamperProofLogEntry[],
    entryId: string,
  ): MerkleProof | null {
    const entryIndex = entries.findIndex((e) => e.id === entryId);
    if (entryIndex === -1) return null;

    const entry = entries[entryIndex];
    const entryHashes = entries.map((e) => e.entryHash);
    const merkleTree = new MerkleTree(entryHashes);

    const proof = merkleTree.getProof(entryIndex);

    return {
      entryId,
      entryHash: entry.entryHash,
      merkleRoot: merkleTree.getRoot(),
      siblings: proof.siblings,
      path: proof.path,
      depth: proof.siblings.length,
    };
  }

  /**
   * Verify entry against blockchain anchor
   */
  async verifyAgainstBlockchain(
    entry: TamperProofLogEntry,
    proof: MerkleProof,
    anchor: BlockchainAnchor,
  ): Promise<BlockchainVerificationResult> {
    const errors: string[] = [];

    // Verify Merkle proof
    const merkleTree = new MerkleTree([]); // Empty tree for verification
    const isValidProof = this.verifyMerkleProof(
      proof.entryHash,
      proof.siblings,
      proof.path,
      proof.merkleRoot,
    );

    if (!isValidProof) {
      errors.push("Merkle proof verification failed");
    }

    // Verify Merkle root matches anchor
    if (proof.merkleRoot !== anchor.merkleRoot) {
      errors.push("Merkle root mismatch with blockchain anchor");
    }

    // Verify blockchain transaction (simulated)
    if (anchor.blockchainNetwork !== "simulated" && anchor.blockchainTxHash) {
      // In production, verify against actual blockchain
      // const txData = await getBlockchainTransaction(anchor.blockchainTxHash)
      // if (txData.data !== proof.merkleRoot) {
      //   errors.push('Blockchain transaction data mismatch')
      // }
    }

    const result: BlockchainVerificationResult = {
      valid: errors.length === 0,
      anchor,
      merkleProof: proof,
      errors,
      verifiedAt: new Date(),
    };

    if (result.valid) {
      anchor.verified = true;
      anchor.verifiedAt = new Date();
    }

    return result;
  }

  /**
   * Verify Merkle proof manually
   */
  private verifyMerkleProof(
    leafHash: string,
    siblings: string[],
    path: number[],
    expectedRoot: string,
  ): boolean {
    let hash = leafHash;

    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      const isLeft = path[i] === 0;

      const combined = isLeft ? `${hash}${sibling}` : `${sibling}${hash}`;
      hash = this.simpleHash(combined);
    }

    return hash === expectedRoot;
  }

  /**
   * Simple hash (matches MerkleTree implementation)
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }

  /**
   * Get anchor by ID
   */
  getAnchor(anchorId: string): BlockchainAnchor | undefined {
    return this.anchors.get(anchorId);
  }

  /**
   * Get all anchors for a chain
   */
  getChainAnchors(chainId: string): BlockchainAnchor[] {
    return Array.from(this.anchors.values()).filter(
      (a) => a.chainId === chainId,
    );
  }

  /**
   * Get anchor statistics
   */
  getStatistics(): {
    totalAnchors: number;
    totalEntries: number;
    verifiedAnchors: number;
    networkBreakdown: Record<string, number>;
    oldestAnchor?: Date;
    newestAnchor?: Date;
  } {
    const anchors = Array.from(this.anchors.values());

    const stats = {
      totalAnchors: anchors.length,
      totalEntries: anchors.reduce((sum, a) => sum + a.batchSize, 0),
      verifiedAnchors: anchors.filter((a) => a.verified).length,
      networkBreakdown: {} as Record<string, number>,
      oldestAnchor: undefined as Date | undefined,
      newestAnchor: undefined as Date | undefined,
    };

    anchors.forEach((anchor) => {
      const network = anchor.blockchainNetwork || "unknown";
      stats.networkBreakdown[network] =
        (stats.networkBreakdown[network] || 0) + 1;

      if (!stats.oldestAnchor || anchor.timestamp < stats.oldestAnchor) {
        stats.oldestAnchor = anchor.timestamp;
      }
      if (!stats.newestAnchor || anchor.timestamp > stats.newestAnchor) {
        stats.newestAnchor = anchor.timestamp;
      }
    });

    return stats;
  }

  /**
   * Generate simulated blockchain transaction hash
   */
  private generateSimulatedTxHash(): string {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Export anchor data for external verification
   */
  exportAnchor(anchorId: string): string | null {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) return null;

    return JSON.stringify(
      {
        id: anchor.id,
        chainId: anchor.chainId,
        blockNumber: anchor.blockNumber,
        merkleRoot: anchor.merkleRoot,
        timestamp: anchor.timestamp,
        batchSize: anchor.batchSize,
        blockchainTxHash: anchor.blockchainTxHash,
        blockchainNetwork: anchor.blockchainNetwork,
        blockHeight: anchor.blockHeight,
        verified: anchor.verified,
      },
      null,
      2,
    );
  }
}

// ============================================================================
// Singleton
// ============================================================================

let blockchainBackupInstance: BlockchainBackupService | null = null;

export function getBlockchainBackup(): BlockchainBackupService {
  if (!blockchainBackupInstance) {
    blockchainBackupInstance = new BlockchainBackupService();
  }
  return blockchainBackupInstance;
}
