/**
 * Token Gate Types
 *
 * Comprehensive type definitions for token-gated access control.
 * Supports ERC-20, ERC-721, and ERC-1155 tokens across multiple chains.
 *
 * @module @/lib/web3/token-gate-types
 * @version 1.0.0
 */

// =============================================================================
// CHAIN & NETWORK TYPES
// =============================================================================

/**
 * Supported blockchain chain IDs (hex format)
 */
export type ChainId =
  | "0x1" // Ethereum Mainnet
  | "0x5" // Goerli Testnet (deprecated)
  | "0xaa36a7" // Sepolia Testnet
  | "0x89" // Polygon Mainnet
  | "0x13881" // Polygon Mumbai (deprecated)
  | "0x13882" // Polygon Amoy Testnet
  | "0xa4b1" // Arbitrum One
  | "0xa" // Optimism
  | "0x38" // BNB Smart Chain
  | "0x2105"; // Base

/**
 * Human-readable network names
 */
export type NetworkName =
  | "ethereum"
  | "goerli"
  | "sepolia"
  | "polygon"
  | "mumbai"
  | "amoy"
  | "arbitrum"
  | "optimism"
  | "bsc"
  | "base";

/**
 * Chain configuration
 */
export interface ChainConfig {
  chainId: ChainId;
  networkName: NetworkName;
  displayName: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
  avgBlockTime: number; // in seconds
  confirmationsRequired: number;
}

/**
 * Supported chains configuration
 */
export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  "0x1": {
    chainId: "0x1",
    networkName: "ethereum",
    displayName: "Ethereum Mainnet",
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/",
    blockExplorerUrl: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
    avgBlockTime: 12,
    confirmationsRequired: 12,
  },
  "0x5": {
    chainId: "0x5",
    networkName: "goerli",
    displayName: "Goerli Testnet",
    rpcUrl: "https://eth-goerli.g.alchemy.com/v2/",
    blockExplorerUrl: "https://goerli.etherscan.io",
    nativeCurrency: { name: "Goerli Ether", symbol: "ETH", decimals: 18 },
    isTestnet: true,
    avgBlockTime: 12,
    confirmationsRequired: 6,
  },
  "0xaa36a7": {
    chainId: "0xaa36a7",
    networkName: "sepolia",
    displayName: "Sepolia Testnet",
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    isTestnet: true,
    avgBlockTime: 12,
    confirmationsRequired: 6,
  },
  "0x89": {
    chainId: "0x89",
    networkName: "polygon",
    displayName: "Polygon Mainnet",
    rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/",
    blockExplorerUrl: "https://polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    isTestnet: false,
    avgBlockTime: 2,
    confirmationsRequired: 30,
  },
  "0x13881": {
    chainId: "0x13881",
    networkName: "mumbai",
    displayName: "Polygon Mumbai",
    rpcUrl: "https://polygon-mumbai.g.alchemy.com/v2/",
    blockExplorerUrl: "https://mumbai.polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    isTestnet: true,
    avgBlockTime: 2,
    confirmationsRequired: 10,
  },
  "0x13882": {
    chainId: "0x13882",
    networkName: "amoy",
    displayName: "Polygon Amoy Testnet",
    rpcUrl: "https://polygon-amoy.g.alchemy.com/v2/",
    blockExplorerUrl: "https://amoy.polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    isTestnet: true,
    avgBlockTime: 2,
    confirmationsRequired: 10,
  },
  "0xa4b1": {
    chainId: "0xa4b1",
    networkName: "arbitrum",
    displayName: "Arbitrum One",
    rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/",
    blockExplorerUrl: "https://arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
    avgBlockTime: 0.25,
    confirmationsRequired: 50,
  },
  "0xa": {
    chainId: "0xa",
    networkName: "optimism",
    displayName: "Optimism",
    rpcUrl: "https://opt-mainnet.g.alchemy.com/v2/",
    blockExplorerUrl: "https://optimistic.etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
    avgBlockTime: 2,
    confirmationsRequired: 30,
  },
  "0x38": {
    chainId: "0x38",
    networkName: "bsc",
    displayName: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed1.binance.org",
    blockExplorerUrl: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    isTestnet: false,
    avgBlockTime: 3,
    confirmationsRequired: 15,
  },
  "0x2105": {
    chainId: "0x2105",
    networkName: "base",
    displayName: "Base",
    rpcUrl: "https://base-mainnet.g.alchemy.com/v2/",
    blockExplorerUrl: "https://basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
    avgBlockTime: 2,
    confirmationsRequired: 30,
  },
};

// =============================================================================
// TOKEN TYPES
// =============================================================================

/**
 * Token standard types
 */
export type TokenStandard = "erc20" | "erc721" | "erc1155";

/**
 * Token contract information
 */
export interface TokenContract {
  address: string;
  chainId: ChainId;
  standard: TokenStandard;
  name?: string;
  symbol?: string;
  decimals?: number; // For ERC-20
  totalSupply?: string;
  verified: boolean;
  metadata?: {
    description?: string;
    image?: string;
    externalUrl?: string;
  };
}

/**
 * Token balance information
 */
export interface TokenBalance {
  contractAddress: string;
  chainId: ChainId;
  ownerAddress: string;
  balance: string; // Raw balance (wei for ERC-20)
  formattedBalance?: string;
  tokenIds?: string[]; // For ERC-721/1155
  lastUpdated: Date;
}

// =============================================================================
// TOKEN GATE CONFIGURATION
// =============================================================================

/**
 * Token gate requirement operator for combining conditions
 */
export type TokenGateOperator = "AND" | "OR";

/**
 * Single token requirement condition
 */
export interface TokenRequirementCondition {
  id: string;
  contractAddress: string;
  chainId: ChainId;
  standard: TokenStandard;

  // For ERC-20
  minimumBalance?: string; // In token's smallest unit
  tokenSymbol?: string;
  tokenDecimals?: number;

  // For ERC-721
  requiredTokenIds?: string[]; // Specific token IDs (any one)
  minimumNFTCount?: number; // Minimum number of NFTs from collection

  // For ERC-1155
  tokenId?: string; // Specific token ID for ERC-1155
  minimumAmount?: string; // For ERC-1155 semi-fungible tokens

  // Metadata
  name?: string;
  description?: string;
}

/**
 * Token gate configuration for a resource
 */
export interface TokenGateConfig {
  id: string;
  resourceType: "channel" | "feature" | "role" | "workspace";
  resourceId: string;

  // Requirements
  requirements: TokenRequirementCondition[];
  operator: TokenGateOperator;

  // Access control
  isActive: boolean;
  bypassRoles: string[];

  // Cache settings
  cacheTTLSeconds: number;

  // Grace period settings
  gracePeriodSeconds: number; // Time to allow access after token transfer

  // Revocation settings
  revocationCheckIntervalSeconds: number;
  autoRevokeOnFailure: boolean;

  // Metadata
  name?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Token gate status for a user
 */
export type TokenGateStatus =
  | "granted"
  | "denied"
  | "pending"
  | "grace_period"
  | "expired";

// =============================================================================
// VERIFICATION TYPES
// =============================================================================

/**
 * Verification method used
 */
export type VerificationMethod = "on_chain" | "api" | "cached" | "manual";

/**
 * Single requirement verification result
 */
export interface RequirementVerificationResult {
  requirementId: string;
  verified: boolean;
  balance?: string;
  formattedBalance?: string;
  tokenIds?: string[];
  error?: string;
  verificationMethod: VerificationMethod;
  verifiedAt: Date;
}

/**
 * Complete token gate verification result
 */
export interface TokenGateVerificationResult {
  gateId: string;
  userId: string;
  walletAddress: string;

  // Overall status
  status: TokenGateStatus;
  hasAccess: boolean;

  // Individual requirement results
  requirementResults: RequirementVerificationResult[];

  // Access details
  accessGranted: boolean;
  accessDeniedReason?: string;
  bypassedByRole: boolean;
  bypassRole?: string;

  // Grace period
  inGracePeriod: boolean;
  gracePeriodEndsAt?: Date;

  // Verification metadata
  verifiedAt: Date;
  expiresAt: Date;
  verificationMethod: VerificationMethod;

  // Cache info
  fromCache: boolean;
  cacheExpiresAt?: Date;
}

/**
 * Wallet verification for ownership proof
 */
export interface WalletVerification {
  id: string;
  userId: string;
  walletAddress: string;
  chainId: ChainId;

  // Verification details
  verified: boolean;
  verificationMethod: "signature" | "transaction" | "manual";
  signatureMessage?: string;
  signature?: string;
  transactionHash?: string;

  // Status
  isPrimary: boolean;
  isActive: boolean;

  // Timestamps
  verifiedAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
}

// =============================================================================
// ACCESS CHECK TYPES
// =============================================================================

/**
 * Access check request
 */
export interface AccessCheckRequest {
  userId: string;
  resourceType: "channel" | "feature" | "role" | "workspace";
  resourceId: string;
  walletAddress?: string;
  userRoles?: string[];
  forceRefresh?: boolean;
}

/**
 * Access check result
 */
export interface AccessCheckResult {
  hasAccess: boolean;
  status: TokenGateStatus;
  reason?: string;

  // Gate details
  gateId?: string;
  requiresVerification: boolean;
  verificationResult?: TokenGateVerificationResult;

  // Role bypass
  bypassedByRole: boolean;
  bypassRole?: string;

  // Grace period
  inGracePeriod: boolean;
  gracePeriodEndsAt?: Date;

  // Next check
  nextCheckAt?: Date;
  cacheExpiresAt?: Date;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

/**
 * Cache entry for verification results
 */
export interface VerificationCacheEntry {
  key: string;
  result: TokenGateVerificationResult;
  createdAt: Date;
  expiresAt: Date;
  invalidatedAt?: Date;
  invalidationReason?: string;
}

/**
 * Cache invalidation event
 */
export interface CacheInvalidationEvent {
  type: "transfer" | "config_change" | "manual" | "expiry";
  gateId?: string;
  walletAddress?: string;
  contractAddress?: string;
  chainId?: ChainId;
  timestamp: Date;
  reason?: string;
}

// =============================================================================
// WEBHOOK & EVENT TYPES
// =============================================================================

/**
 * Token gate event types
 */
export type TokenGateEventType =
  | "access_granted"
  | "access_denied"
  | "access_revoked"
  | "grace_period_started"
  | "grace_period_ended"
  | "verification_failed"
  | "gate_config_updated"
  | "gate_created"
  | "gate_deleted";

/**
 * Token gate event
 */
export interface TokenGateEvent {
  id: string;
  type: TokenGateEventType;
  gateId: string;
  userId?: string;
  walletAddress?: string;
  resourceType: "channel" | "feature" | "role" | "workspace";
  resourceId: string;

  // Event details
  details: Record<string, unknown>;
  previousState?: TokenGateStatus;
  newState?: TokenGateStatus;

  // Metadata
  timestamp: Date;
  source: "system" | "webhook" | "manual";
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Token gate error codes
 */
export enum TokenGateErrorCode {
  // Wallet errors
  WALLET_NOT_CONNECTED = "WALLET_NOT_CONNECTED",
  WALLET_NOT_VERIFIED = "WALLET_NOT_VERIFIED",
  INVALID_WALLET_ADDRESS = "INVALID_WALLET_ADDRESS",

  // Token errors
  INVALID_CONTRACT_ADDRESS = "INVALID_CONTRACT_ADDRESS",
  UNSUPPORTED_TOKEN_STANDARD = "UNSUPPORTED_TOKEN_STANDARD",
  UNSUPPORTED_CHAIN = "UNSUPPORTED_CHAIN",

  // Verification errors
  VERIFICATION_FAILED = "VERIFICATION_FAILED",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  TOKEN_NOT_OWNED = "TOKEN_NOT_OWNED",
  RPC_ERROR = "RPC_ERROR",
  API_ERROR = "API_ERROR",

  // Gate errors
  GATE_NOT_FOUND = "GATE_NOT_FOUND",
  GATE_INACTIVE = "GATE_INACTIVE",
  GATE_CONFIG_INVALID = "GATE_CONFIG_INVALID",

  // Access errors
  ACCESS_DENIED = "ACCESS_DENIED",
  GRACE_PERIOD_EXPIRED = "GRACE_PERIOD_EXPIRED",

  // System errors
  CACHE_ERROR = "CACHE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Token gate error
 */
export class TokenGateError extends Error {
  constructor(
    public readonly code: TokenGateErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TokenGateError";
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Multi-chain verification request
 */
export interface MultiChainVerificationRequest {
  walletAddress: string;
  requirements: Array<{
    chainId: ChainId;
    contractAddress: string;
    standard: TokenStandard;
    minimumBalance?: string;
    tokenIds?: string[];
  }>;
}

/**
 * Multi-chain verification result
 */
export interface MultiChainVerificationResult {
  walletAddress: string;
  results: Array<{
    chainId: ChainId;
    contractAddress: string;
    verified: boolean;
    balance?: string;
    tokenIds?: string[];
    error?: string;
  }>;
  allVerified: boolean;
  timestamp: Date;
}

/**
 * Token gate statistics
 */
export interface TokenGateStats {
  gateId: string;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  uniqueUsers: number;
  averageVerificationTimeMs: number;
  cacheHitRate: number;
  lastCheckAt?: Date;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get chain config by chain ID
 */
export function getChainConfig(chainId: ChainId): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

/**
 * Get chain ID by network name
 */
export function getChainIdByNetwork(
  networkName: NetworkName,
): ChainId | undefined {
  for (const [chainId, config] of Object.entries(CHAIN_CONFIGS)) {
    if (config.networkName === networkName) {
      return chainId as ChainId;
    }
  }
  return undefined;
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Normalize address to lowercase checksum
 */
export function normalizeAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new TokenGateError(
      TokenGateErrorCode.INVALID_WALLET_ADDRESS,
      `Invalid address format: ${address}`,
    );
  }
  return address.toLowerCase();
}

/**
 * Check if chain ID is supported
 */
export function isSupportedChain(chainId: string): chainId is ChainId {
  return chainId in CHAIN_CONFIGS;
}

/**
 * Format token balance for display
 */
export function formatTokenBalance(balance: string, decimals: number): string {
  const value = BigInt(balance);
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const trimmedFractional = fractionalStr.replace(/0+$/, "");

  if (trimmedFractional === "") {
    return integerPart.toString();
  }

  return `${integerPart}.${trimmedFractional}`;
}

/**
 * Parse token amount to raw units
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  const [integerPart, fractionalPart = ""] = amount.split(".");
  const paddedFractional = fractionalPart
    .padEnd(decimals, "0")
    .slice(0, decimals);
  const combined = integerPart + paddedFractional;
  return BigInt(combined).toString();
}

/**
 * Generate cache key for verification
 */
export function generateVerificationCacheKey(
  gateId: string,
  walletAddress: string,
  chainId?: ChainId,
): string {
  const normalizedAddress = normalizeAddress(walletAddress);
  if (chainId) {
    return `gate:${gateId}:${normalizedAddress}:${chainId}`;
  }
  return `gate:${gateId}:${normalizedAddress}`;
}

/**
 * Calculate grace period end time
 */
export function calculateGracePeriodEnd(
  gracePeriodSeconds: number,
  startTime: Date = new Date(),
): Date {
  return new Date(startTime.getTime() + gracePeriodSeconds * 1000);
}

/**
 * Check if in grace period
 */
export function isInGracePeriod(gracePeriodEndsAt: Date | undefined): boolean {
  if (!gracePeriodEndsAt) return false;
  return new Date() < gracePeriodEndsAt;
}
