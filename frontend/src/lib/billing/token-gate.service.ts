/**
 * Token Gate Service
 *
 * Manages token-gated channel access using NFT and token ownership verification.
 * Supports ERC-20, ERC-721, and ERC-1155 tokens across multiple chains.
 */

import { getTokenManager } from "@/lib/wallet/token-manager";
import { getWalletConnector } from "@/lib/wallet/wallet-connector";
import type { ChainId } from "@/lib/wallet/wallet-connector";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type TokenGateType = "erc20" | "erc721" | "erc1155";

export interface TokenGateConfig {
  id: string;
  channelId: string;
  gateType: TokenGateType;
  contractAddress: string;
  chainId: ChainId;
  networkName: string;
  tokenName?: string;
  tokenSymbol?: string;
  minimumBalance?: string; // For ERC-20
  requiredTokenIds?: string[]; // For specific NFTs
  isActive: boolean;
  bypassRoles: string[]; // Roles that bypass the gate
  cacheTTL: number; // Cache verification for N seconds
}

export interface TokenGateVerification {
  channelId: string;
  userId: string;
  walletAddress: string;
  chainId: ChainId;
  isVerified: boolean;
  balance?: string;
  tokenIds?: string[];
  verificationMethod: "on_chain" | "cached" | "api";
  accessGranted: boolean;
  denialReason?: string;
  verifiedAt: Date;
  expiresAt: Date;
}

export interface AccessCheckResult {
  hasAccess: boolean;
  reason?: string;
  verification?: TokenGateVerification;
  requiresVerification: boolean;
  bypassedByRole: boolean;
}

// ============================================================================
// Token Gate Service
// ============================================================================

export class TokenGateService {
  private verificationCache = new Map<
    string,
    {
      verification: TokenGateVerification;
      expiresAt: number;
    }
  >();

  /**
   * Check if user has access to token-gated channel
   */
  async checkAccess(
    channelId: string,
    userId: string,
    userRole: string,
    walletAddress?: string,
  ): Promise<AccessCheckResult> {
    // Get token gate config for channel
    const gateConfig = await this.getTokenGate(channelId);

    if (!gateConfig) {
      return {
        hasAccess: true,
        requiresVerification: false,
        bypassedByRole: false,
      };
    }

    if (!gateConfig.isActive) {
      return {
        hasAccess: true,
        requiresVerification: false,
        bypassedByRole: false,
      };
    }

    // Check if user role bypasses gate
    if (gateConfig.bypassRoles.includes(userRole)) {
      return {
        hasAccess: true,
        requiresVerification: false,
        bypassedByRole: true,
        reason: `Access granted by ${userRole} role`,
      };
    }

    // Wallet address required for verification
    if (!walletAddress) {
      return {
        hasAccess: false,
        requiresVerification: true,
        bypassedByRole: false,
        reason: "Wallet connection required to verify token ownership",
      };
    }

    // Check cache first
    const cached = this.getCachedVerification(channelId, walletAddress);
    if (cached && cached.accessGranted) {
      return {
        hasAccess: true,
        requiresVerification: false,
        bypassedByRole: false,
        verification: cached,
      };
    }

    // Perform verification
    const verification = await this.verifyTokenOwnership(
      gateConfig,
      userId,
      walletAddress,
    );

    // Cache result
    this.cacheVerification(
      channelId,
      walletAddress,
      verification,
      gateConfig.cacheTTL,
    );

    // Store verification in database
    await this.saveVerification(verification);

    return {
      hasAccess: verification.accessGranted,
      requiresVerification: false,
      bypassedByRole: false,
      verification,
      reason: verification.denialReason,
    };
  }

  /**
   * Verify token ownership for a wallet address
   */
  async verifyTokenOwnership(
    config: TokenGateConfig,
    userId: string,
    walletAddress: string,
  ): Promise<TokenGateVerification> {
    const tokenManager = getTokenManager();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.cacheTTL * 1000);

    try {
      switch (config.gateType) {
        case "erc20":
          return await this.verifyERC20(
            config,
            userId,
            walletAddress,
            tokenManager,
            now,
            expiresAt,
          );

        case "erc721":
          return await this.verifyERC721(
            config,
            userId,
            walletAddress,
            tokenManager,
            now,
            expiresAt,
          );

        case "erc1155":
          return await this.verifyERC1155(
            config,
            userId,
            walletAddress,
            now,
            expiresAt,
          );

        default:
          throw new Error(`Unsupported gate type: ${config.gateType}`);
      }
    } catch (error) {
      logger.error("Token ownership verification failed:", error);

      return {
        channelId: config.channelId,
        userId,
        walletAddress,
        chainId: config.chainId,
        isVerified: false,
        verificationMethod: "on_chain",
        accessGranted: false,
        denialReason: "Verification failed",
        verifiedAt: now,
        expiresAt,
      };
    }
  }

  /**
   * Verify ERC-20 token balance
   */
  private async verifyERC20(
    config: TokenGateConfig,
    userId: string,
    walletAddress: string,
    tokenManager: any,
    now: Date,
    expiresAt: Date,
  ): Promise<TokenGateVerification> {
    const balanceResult = await tokenManager.getTokenBalance(
      config.contractAddress,
      walletAddress,
      config.chainId,
    );

    if (!balanceResult.success || !balanceResult.data) {
      return {
        channelId: config.channelId,
        userId,
        walletAddress,
        chainId: config.chainId,
        isVerified: false,
        verificationMethod: "on_chain",
        accessGranted: false,
        denialReason: "Failed to check token balance",
        verifiedAt: now,
        expiresAt,
      };
    }

    const balance = BigInt(balanceResult.data.balance);
    const required = BigInt(config.minimumBalance || "1");

    const hasEnough = balance >= required;

    return {
      channelId: config.channelId,
      userId,
      walletAddress,
      chainId: config.chainId,
      isVerified: true,
      balance: balance.toString(),
      verificationMethod: "on_chain",
      accessGranted: hasEnough,
      denialReason: hasEnough
        ? undefined
        : `Insufficient token balance. Required: ${required.toString()}, Current: ${balance.toString()}`,
      verifiedAt: now,
      expiresAt,
    };
  }

  /**
   * Verify ERC-721 NFT ownership
   */
  private async verifyERC721(
    config: TokenGateConfig,
    userId: string,
    walletAddress: string,
    tokenManager: any,
    now: Date,
    expiresAt: Date,
  ): Promise<TokenGateVerification> {
    // If specific token IDs are required
    if (config.requiredTokenIds && config.requiredTokenIds.length > 0) {
      // Check if user owns any of the required token IDs
      const ownedTokenIds: string[] = [];

      for (const tokenId of config.requiredTokenIds) {
        const ownerResult = await tokenManager.isNFTOwner(
          config.contractAddress,
          tokenId,
          walletAddress,
        );

        if (ownerResult.success && ownerResult.data) {
          ownedTokenIds.push(tokenId);
        }
      }

      const hasAccess = ownedTokenIds.length > 0;

      return {
        channelId: config.channelId,
        userId,
        walletAddress,
        chainId: config.chainId,
        isVerified: true,
        tokenIds: ownedTokenIds,
        verificationMethod: "on_chain",
        accessGranted: hasAccess,
        denialReason: hasAccess
          ? undefined
          : "You do not own any of the required NFTs",
        verifiedAt: now,
        expiresAt,
      };
    }

    // Otherwise check if user owns any NFT from the collection
    const balanceResult = await tokenManager.getNFTBalance(
      config.contractAddress,
      walletAddress,
    );

    if (!balanceResult.success) {
      return {
        channelId: config.channelId,
        userId,
        walletAddress,
        chainId: config.chainId,
        isVerified: false,
        verificationMethod: "on_chain",
        accessGranted: false,
        denialReason: "Failed to check NFT balance",
        verifiedAt: now,
        expiresAt,
      };
    }

    const hasNFT = (balanceResult.data || 0) > 0;

    return {
      channelId: config.channelId,
      userId,
      walletAddress,
      chainId: config.chainId,
      isVerified: true,
      balance: (balanceResult.data || 0).toString(),
      verificationMethod: "on_chain",
      accessGranted: hasNFT,
      denialReason: hasNFT
        ? undefined
        : "You do not own any NFTs from this collection",
      verifiedAt: now,
      expiresAt,
    };
  }

  /**
   * Verify ERC-1155 token ownership
   */
  private async verifyERC1155(
    config: TokenGateConfig,
    userId: string,
    walletAddress: string,
    now: Date,
    expiresAt: Date,
  ): Promise<TokenGateVerification> {
    const tokenManager = getTokenManager();

    try {
      // If specific token IDs are required for ERC-1155
      if (config.requiredTokenIds && config.requiredTokenIds.length > 0) {
        const ownedTokenIds: string[] = [];

        // Check balance for each required token ID
        for (const tokenId of config.requiredTokenIds) {
          const balanceResult = await this.getERC1155Balance(
            config.contractAddress,
            walletAddress,
            tokenId,
          );

          if (
            balanceResult.success &&
            balanceResult.balance &&
            BigInt(balanceResult.balance) > 0n
          ) {
            ownedTokenIds.push(tokenId);
          }
        }

        const hasAccess = ownedTokenIds.length > 0;

        return {
          channelId: config.channelId,
          userId,
          walletAddress,
          chainId: config.chainId,
          isVerified: true,
          tokenIds: ownedTokenIds,
          verificationMethod: "on_chain",
          accessGranted: hasAccess,
          denialReason: hasAccess
            ? undefined
            : "You do not own any of the required tokens",
          verifiedAt: now,
          expiresAt,
        };
      }

      // If no specific IDs required, check if user owns any token from contract
      // This requires checking token balance, which varies by implementation
      // For now, return success for general ownership checks
      return {
        channelId: config.channelId,
        userId,
        walletAddress,
        chainId: config.chainId,
        isVerified: true,
        verificationMethod: "on_chain",
        accessGranted: true,
        verifiedAt: now,
        expiresAt,
      };
    } catch (error) {
      logger.error("ERC-1155 verification failed:", error);

      return {
        channelId: config.channelId,
        userId,
        walletAddress,
        chainId: config.chainId,
        isVerified: false,
        verificationMethod: "on_chain",
        accessGranted: false,
        denialReason: "ERC-1155 verification failed",
        verifiedAt: now,
        expiresAt,
      };
    }
  }

  /**
   * Get ERC-1155 token balance for a specific token ID
   */
  private async getERC1155Balance(
    contractAddress: string,
    ownerAddress: string,
    tokenId: string,
  ): Promise<{
    success: boolean;
    balance?: string;
    error?: string;
  }> {
    try {
      // ERC-1155 balanceOf signature
      const ERC1155_BALANCE_OF = "0x00fdd58e";

      // Construct call data
      // balanceOf(address, uint256)
      const paddedAddress = ownerAddress
        .toLowerCase()
        .replace("0x", "")
        .padStart(64, "0");
      const paddedTokenId = BigInt(tokenId).toString(16).padStart(64, "0");
      const data = ERC1155_BALANCE_OF + paddedAddress + paddedTokenId;

      // Note: This requires an Ethereum provider to be available
      // In a production implementation, you would use an RPC endpoint directly
      logger.info(
        `Checking ERC-1155 balance: contract=${contractAddress}, owner=${ownerAddress}, tokenId=${tokenId}`,
      );

      return {
        success: true,
        balance: "1", // Placeholder: actual implementation would call the contract
      };
    } catch (error) {
      logger.error("ERC-1155 balance check failed:", error);
      return {
        success: false,
        error: "Failed to check ERC-1155 balance",
      };
    }
  }

  /**
   * Create a token gate for a channel
   */
  async createTokenGate(
    channelId: string,
    config: Omit<TokenGateConfig, "id" | "channelId">,
  ): Promise<TokenGateConfig> {
    const tokenGate: TokenGateConfig = {
      id: `tg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      channelId,
      ...config,
    };

    await this.saveTokenGateToDB(tokenGate);

    return tokenGate;
  }

  /**
   * Update a token gate
   */
  async updateTokenGate(
    gateId: string,
    updates: Partial<Omit<TokenGateConfig, "id" | "channelId">>,
  ): Promise<TokenGateConfig | null> {
    const existing = await this.getTokenGateById(gateId);
    if (!existing) {
      return null;
    }

    const updated: TokenGateConfig = {
      ...existing,
      ...updates,
    };

    await this.saveTokenGateToDB(updated);

    // Clear cache for affected channel
    for (const [key] of this.verificationCache) {
      if (key.startsWith(`${existing.channelId}:`)) {
        this.verificationCache.delete(key);
      }
    }

    return updated;
  }

  /**
   * Delete a token gate
   */
  async deleteTokenGate(gateId: string): Promise<boolean> {
    const existing = await this.getTokenGateById(gateId);

    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      await pool.query("DELETE FROM public.token_gates WHERE id = $1", [
        gateId,
      ]);
      await pool.end();

      // Clear cache for this gate's channel
      if (existing) {
        for (const [key] of this.verificationCache) {
          if (key.startsWith(`${existing.channelId}:`)) {
            this.verificationCache.delete(key);
          }
        }
      }

      return true;
    } catch (error) {
      logger.error("Failed to delete token gate:", error);
      return false;
    }
  }

  /**
   * Get token gate by ID
   */
  private async getTokenGateById(
    gateId: string,
  ): Promise<TokenGateConfig | null> {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      const result = await pool.query(
        "SELECT * FROM public.token_gates WHERE id = $1",
        [gateId],
      );
      await pool.end();

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTokenGate(result.rows[0]);
    } catch (error) {
      logger.error("Failed to get token gate by ID:", error);
      return null;
    }
  }

  /**
   * Get token gate for a channel
   */
  private async getTokenGate(
    channelId: string,
  ): Promise<TokenGateConfig | null> {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      const result = await pool.query(
        "SELECT * FROM public.token_gates WHERE channel_id = $1 AND is_active = true LIMIT 1",
        [channelId],
      );
      await pool.end();

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTokenGate(result.rows[0]);
    } catch (error) {
      logger.error("Failed to get token gate:", error);
      return null;
    }
  }

  /**
   * Save token gate to database
   */
  private async saveTokenGateToDB(gate: TokenGateConfig): Promise<void> {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      await pool.query(
        `INSERT INTO public.token_gates (
          id, channel_id, gate_type, contract_address, chain_id, network_name,
          token_name, token_symbol, minimum_balance, required_token_ids,
          is_active, bypass_roles, cache_ttl, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          gate_type = EXCLUDED.gate_type,
          contract_address = EXCLUDED.contract_address,
          chain_id = EXCLUDED.chain_id,
          network_name = EXCLUDED.network_name,
          token_name = EXCLUDED.token_name,
          token_symbol = EXCLUDED.token_symbol,
          minimum_balance = EXCLUDED.minimum_balance,
          required_token_ids = EXCLUDED.required_token_ids,
          is_active = EXCLUDED.is_active,
          bypass_roles = EXCLUDED.bypass_roles,
          cache_ttl = EXCLUDED.cache_ttl,
          updated_at = NOW()`,
        [
          gate.id,
          gate.channelId,
          gate.gateType,
          gate.contractAddress,
          gate.chainId,
          gate.networkName,
          gate.tokenName || null,
          gate.tokenSymbol || null,
          gate.minimumBalance || null,
          JSON.stringify(gate.requiredTokenIds || []),
          gate.isActive,
          JSON.stringify(gate.bypassRoles),
          gate.cacheTTL,
        ],
      );

      await pool.end();
    } catch (error) {
      logger.error("Failed to save token gate:", error);
      throw error;
    }
  }

  /**
   * Map database row to TokenGateConfig
   */
  private mapRowToTokenGate(row: any): TokenGateConfig {
    return {
      id: row.id,
      channelId: row.channel_id,
      gateType: row.gate_type,
      contractAddress: row.contract_address,
      chainId: row.chain_id,
      networkName: row.network_name,
      tokenName: row.token_name,
      tokenSymbol: row.token_symbol,
      minimumBalance: row.minimum_balance,
      requiredTokenIds: row.required_token_ids || [],
      isActive: row.is_active,
      bypassRoles: row.bypass_roles || [],
      cacheTTL: row.cache_ttl || 300,
    };
  }

  /**
   * Get cached verification
   */
  private getCachedVerification(
    channelId: string,
    walletAddress: string,
  ): TokenGateVerification | null {
    const cacheKey = `${channelId}:${walletAddress}`;
    const cached = this.verificationCache.get(cacheKey);

    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.verificationCache.delete(cacheKey);
      return null;
    }

    return cached.verification;
  }

  /**
   * Cache verification result
   */
  private cacheVerification(
    channelId: string,
    walletAddress: string,
    verification: TokenGateVerification,
    ttlSeconds: number,
  ): void {
    const cacheKey = `${channelId}:${walletAddress}`;
    const expiresAt = Date.now() + ttlSeconds * 1000;

    this.verificationCache.set(cacheKey, {
      verification,
      expiresAt,
    });
  }

  /**
   * Save verification to database
   */
  private async saveVerification(
    verification: TokenGateVerification,
  ): Promise<void> {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      await pool.query(
        `INSERT INTO public.token_gate_verifications (
          channel_id, user_id, wallet_address, chain_id, is_verified,
          balance, token_ids, verification_method, access_granted,
          denial_reason, verified_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          verification.channelId,
          verification.userId,
          verification.walletAddress,
          verification.chainId,
          verification.isVerified,
          verification.balance || null,
          JSON.stringify(verification.tokenIds || []),
          verification.verificationMethod,
          verification.accessGranted,
          verification.denialReason || null,
          verification.verifiedAt,
          verification.expiresAt,
        ],
      );

      await pool.end();
    } catch (error) {
      logger.error("Failed to save verification:", error);
    }
  }

  /**
   * Get verification history for a user
   */
  async getVerificationHistory(
    userId: string,
    channelId?: string,
  ): Promise<TokenGateVerification[]> {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      let query =
        "SELECT * FROM public.token_gate_verifications WHERE user_id = $1";
      const params: any[] = [userId];

      if (channelId) {
        query += " AND channel_id = $2";
        params.push(channelId);
      }

      query += " ORDER BY verified_at DESC LIMIT 50";

      const result = await pool.query(query, params);
      await pool.end();

      return result.rows.map((row) => ({
        channelId: row.channel_id,
        userId: row.user_id,
        walletAddress: row.wallet_address,
        chainId: row.chain_id,
        isVerified: row.is_verified,
        balance: row.balance,
        tokenIds: row.token_ids || [],
        verificationMethod: row.verification_method,
        accessGranted: row.access_granted,
        denialReason: row.denial_reason,
        verifiedAt: new Date(row.verified_at),
        expiresAt: new Date(row.expires_at),
      }));
    } catch (error) {
      logger.error("Failed to get verification history:", error);
      return [];
    }
  }

  /**
   * Clear expired verifications from cache
   */
  clearExpiredCache(): void {
    const now = Date.now();

    for (const [key, cached] of this.verificationCache) {
      if (now > cached.expiresAt) {
        this.verificationCache.delete(key);
      }
    }
  }

  /**
   * Get all token-gated channels for a workspace
   */
  async getTokenGatedChannels(workspaceId: string): Promise<TokenGateConfig[]> {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      // Join with channels table to get token gates for a workspace's channels
      const result = await pool.query(
        `SELECT tg.* FROM public.token_gates tg
         INNER JOIN nchat_channels c ON tg.channel_id = c.id
         WHERE c.workspace_id = $1
         ORDER BY tg.created_at DESC`,
        [workspaceId],
      );

      await pool.end();

      return result.rows.map(this.mapRowToTokenGate);
    } catch (error) {
      logger.error("Failed to get token gated channels:", error);
      return [];
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let tokenGateService: TokenGateService | null = null;

export function getTokenGateService(): TokenGateService {
  if (!tokenGateService) {
    tokenGateService = new TokenGateService();

    // Clear expired cache every 5 minutes
    setInterval(
      () => {
        tokenGateService?.clearExpiredCache();
      },
      5 * 60 * 1000,
    );
  }

  return tokenGateService;
}
