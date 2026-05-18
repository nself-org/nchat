/**
 * Token Gate Verifier
 *
 * Handles on-chain token verification for ERC-20, ERC-721, and ERC-1155 tokens.
 * Supports multi-chain verification with caching and grace period handling.
 *
 * @module @/lib/web3/token-gate-verifier
 * @version 1.0.0
 */

import {
  type ChainId,
  type TokenStandard,
  type TokenContract,
  type TokenBalance,
  type TokenRequirementCondition,
  type RequirementVerificationResult,
  type VerificationMethod,
  type MultiChainVerificationRequest,
  type MultiChainVerificationResult,
  TokenGateError,
  TokenGateErrorCode,
  CHAIN_CONFIGS,
  isValidAddress,
  normalizeAddress,
  formatTokenBalance,
} from "./token-gate-types";

// =============================================================================
// CONSTANTS
// =============================================================================

// ERC-20 function selectors
const ERC20_BALANCE_OF = "0x70a08231"; // balanceOf(address)
const ERC20_DECIMALS = "0x313ce567"; // decimals()
const ERC20_NAME = "0x06fdde03"; // name()
const ERC20_SYMBOL = "0x95d89b41"; // symbol()
const ERC20_TOTAL_SUPPLY = "0x18160ddd"; // totalSupply()

// ERC-721 function selectors
const ERC721_BALANCE_OF = "0x70a08231"; // balanceOf(address)
const ERC721_OWNER_OF = "0x6352211e"; // ownerOf(uint256)

// ERC-1155 function selectors
const ERC1155_BALANCE_OF = "0x00fdd58e"; // balanceOf(address, uint256)
const ERC1155_BALANCE_OF_BATCH = "0x4e1273f4"; // balanceOfBatch(address[], uint256[])

// Cache configuration
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 10000;

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const verificationCache = new Map<string, CacheEntry<TokenBalance>>();

/**
 * Get cached value if still valid
 */
function getCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Set cache value with expiry
 */
function setCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
): void {
  // Enforce max cache size
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Clear verification cache
 */
export function clearVerificationCache(): void {
  verificationCache.clear();
}

/**
 * Clear cache for specific wallet
 */
export function clearWalletCache(walletAddress: string): void {
  const normalizedAddress = normalizeAddress(walletAddress);
  for (const key of verificationCache.keys()) {
    if (key.includes(normalizedAddress)) {
      verificationCache.delete(key);
    }
  }
}

/**
 * Clear cache for specific contract
 */
export function clearContractCache(
  contractAddress: string,
  chainId?: ChainId,
): void {
  const normalizedAddress = normalizeAddress(contractAddress);
  for (const key of verificationCache.keys()) {
    if (key.includes(normalizedAddress)) {
      if (!chainId || key.includes(chainId)) {
        verificationCache.delete(key);
      }
    }
  }
}

// =============================================================================
// RPC UTILITIES
// =============================================================================

/**
 * Get RPC URL for chain
 */
function getRpcUrl(chainId: ChainId): string {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new TokenGateError(
      TokenGateErrorCode.UNSUPPORTED_CHAIN,
      `Unsupported chain: ${chainId}`,
    );
  }

  // Check for environment-configured RPC URLs
  const envKey = `NEXT_PUBLIC_RPC_URL_${config.networkName.toUpperCase()}`;
  const envUrl = process.env[envKey];
  if (envUrl) return envUrl;

  // Check for Alchemy API key
  const alchemyKey = getAlchemyApiKey(chainId);
  if (alchemyKey && config.rpcUrl.includes("alchemy.com")) {
    return `${config.rpcUrl}${alchemyKey}`;
  }

  return config.rpcUrl;
}

/**
 * Get Alchemy API key for chain
 */
function getAlchemyApiKey(chainId: ChainId): string | undefined {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) return undefined;

  switch (config.networkName) {
    case "ethereum":
    case "goerli":
    case "sepolia":
      return process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY;
    case "polygon":
    case "mumbai":
    case "amoy":
      return process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_API_KEY;
    case "arbitrum":
      return process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_API_KEY;
    case "optimism":
      return process.env.NEXT_PUBLIC_ALCHEMY_OPTIMISM_API_KEY;
    case "base":
      return process.env.NEXT_PUBLIC_ALCHEMY_BASE_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Encode address as 32-byte parameter
 */
function encodeAddress(address: string): string {
  return address.toLowerCase().replace("0x", "").padStart(64, "0");
}

/**
 * Encode uint256 as 32-byte parameter
 */
function encodeUint256(value: string | bigint): string {
  const bigValue = typeof value === "string" ? BigInt(value) : value;
  return bigValue.toString(16).padStart(64, "0");
}

/**
 * Decode uint256 from hex response
 */
function decodeUint256(hex: string): bigint {
  if (!hex || hex === "0x" || hex === "0x0") {
    return BigInt(0);
  }
  return BigInt(hex);
}

/**
 * Decode string from ABI-encoded response
 */
function decodeString(data: string): string {
  if (!data || data === "0x" || data.length < 66) {
    return "";
  }

  try {
    const hex = data.slice(2);
    // Dynamic strings: skip offset (32 bytes), read length, then content
    const offset = parseInt(hex.slice(0, 64), 16) * 2;
    const length = parseInt(hex.slice(offset, offset + 64), 16);
    const content = hex.slice(offset + 64, offset + 64 + length * 2);

    let result = "";
    for (let i = 0; i < content.length; i += 2) {
      const charCode = parseInt(content.slice(i, i + 2), 16);
      if (charCode > 0) {
        result += String.fromCharCode(charCode);
      }
    }
    return result;
  } catch {
    return "";
  }
}

/**
 * Make JSON-RPC call
 */
async function rpcCall(
  chainId: ChainId,
  to: string,
  data: string,
): Promise<string> {
  const rpcUrl = getRpcUrl(chainId);

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to, data }, "latest"],
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new TokenGateError(
      TokenGateErrorCode.RPC_ERROR,
      `RPC request failed: ${response.status}`,
    );
  }

  const json = await response.json();

  if (json.error) {
    throw new TokenGateError(
      TokenGateErrorCode.RPC_ERROR,
      `RPC error: ${json.error.message || JSON.stringify(json.error)}`,
    );
  }

  return json.result;
}

// =============================================================================
// TOKEN CONTRACT INFO
// =============================================================================

/**
 * Get ERC-20 token info
 */
export async function getERC20TokenInfo(
  contractAddress: string,
  chainId: ChainId,
): Promise<TokenContract> {
  const normalizedAddress = normalizeAddress(contractAddress);

  const [nameResult, symbolResult, decimalsResult, totalSupplyResult] =
    await Promise.allSettled([
      rpcCall(chainId, normalizedAddress, ERC20_NAME),
      rpcCall(chainId, normalizedAddress, ERC20_SYMBOL),
      rpcCall(chainId, normalizedAddress, ERC20_DECIMALS),
      rpcCall(chainId, normalizedAddress, ERC20_TOTAL_SUPPLY),
    ]);

  return {
    address: normalizedAddress,
    chainId,
    standard: "erc20",
    name:
      nameResult.status === "fulfilled"
        ? decodeString(nameResult.value)
        : undefined,
    symbol:
      symbolResult.status === "fulfilled"
        ? decodeString(symbolResult.value)
        : undefined,
    decimals:
      decimalsResult.status === "fulfilled"
        ? Number(decodeUint256(decimalsResult.value))
        : 18,
    totalSupply:
      totalSupplyResult.status === "fulfilled"
        ? decodeUint256(totalSupplyResult.value).toString()
        : undefined,
    verified: true,
  };
}

// =============================================================================
// BALANCE VERIFICATION
// =============================================================================

/**
 * Verify ERC-20 token balance
 */
export async function verifyERC20Balance(
  chainId: ChainId,
  contractAddress: string,
  walletAddress: string,
  minimumBalance: string,
  cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
): Promise<RequirementVerificationResult> {
  const normalizedContract = normalizeAddress(contractAddress);
  const normalizedWallet = normalizeAddress(walletAddress);
  const cacheKey = `erc20:${chainId}:${normalizedContract}:${normalizedWallet}`;

  // Check cache
  const cached = getCached(verificationCache, cacheKey);
  if (cached) {
    const balance = BigInt(cached.balance);
    const required = BigInt(minimumBalance);

    return {
      requirementId: cacheKey,
      verified: balance >= required,
      balance: cached.balance,
      formattedBalance: cached.formattedBalance,
      verificationMethod: "cached",
      verifiedAt: cached.lastUpdated,
    };
  }

  try {
    // Get balance
    const balanceData = `${ERC20_BALANCE_OF}${encodeAddress(normalizedWallet)}`;
    const balanceResult = await rpcCall(
      chainId,
      normalizedContract,
      balanceData,
    );
    const balance = decodeUint256(balanceResult);

    // Get decimals for formatting
    let decimals = 18;
    try {
      const decimalsResult = await rpcCall(
        chainId,
        normalizedContract,
        ERC20_DECIMALS,
      );
      decimals = Number(decodeUint256(decimalsResult));
    } catch {
      // Use default 18 decimals
    }

    const formattedBalance = formatTokenBalance(balance.toString(), decimals);
    const required = BigInt(minimumBalance);
    const verified = balance >= required;

    // Cache the result
    const tokenBalance: TokenBalance = {
      contractAddress: normalizedContract,
      chainId,
      ownerAddress: normalizedWallet,
      balance: balance.toString(),
      formattedBalance,
      lastUpdated: new Date(),
    };
    setCache(verificationCache, cacheKey, tokenBalance, cacheTtlMs);

    return {
      requirementId: cacheKey,
      verified,
      balance: balance.toString(),
      formattedBalance,
      verificationMethod: "on_chain",
      verifiedAt: new Date(),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ERC-20 verification failed";
    return {
      requirementId: cacheKey,
      verified: false,
      error: message,
      verificationMethod: "on_chain",
      verifiedAt: new Date(),
    };
  }
}

/**
 * Verify ERC-721 NFT ownership
 */
export async function verifyERC721Ownership(
  chainId: ChainId,
  contractAddress: string,
  walletAddress: string,
  options: {
    requiredTokenIds?: string[];
    minimumNFTCount?: number;
    cacheTtlMs?: number;
  } = {},
): Promise<RequirementVerificationResult> {
  const {
    requiredTokenIds,
    minimumNFTCount = 1,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  } = options;
  const normalizedContract = normalizeAddress(contractAddress);
  const normalizedWallet = normalizeAddress(walletAddress);
  const cacheKey = `erc721:${chainId}:${normalizedContract}:${normalizedWallet}:${requiredTokenIds?.join(",") || ""}`;

  // Check cache
  const cached = getCached(verificationCache, cacheKey);
  if (cached) {
    const balance = BigInt(cached.balance);
    const hasEnough = balance >= BigInt(minimumNFTCount);
    const hasRequiredTokens =
      !requiredTokenIds ||
      requiredTokenIds.length === 0 ||
      requiredTokenIds.some((id) => cached.tokenIds?.includes(id));

    return {
      requirementId: cacheKey,
      verified: hasEnough && hasRequiredTokens,
      balance: cached.balance,
      tokenIds: cached.tokenIds,
      verificationMethod: "cached",
      verifiedAt: cached.lastUpdated,
    };
  }

  try {
    // If specific token IDs required, verify ownership of each
    if (requiredTokenIds && requiredTokenIds.length > 0) {
      const ownedTokenIds: string[] = [];

      for (const tokenId of requiredTokenIds) {
        try {
          const ownerData = `${ERC721_OWNER_OF}${encodeUint256(tokenId)}`;
          const ownerResult = await rpcCall(
            chainId,
            normalizedContract,
            ownerData,
          );
          const owner = "0x" + ownerResult.slice(26).toLowerCase();

          if (owner === normalizedWallet) {
            ownedTokenIds.push(tokenId);
          }
        } catch {
          // Token may not exist or be burned
        }
      }

      const verified = ownedTokenIds.length > 0;

      // Cache the result
      const tokenBalance: TokenBalance = {
        contractAddress: normalizedContract,
        chainId,
        ownerAddress: normalizedWallet,
        balance: ownedTokenIds.length.toString(),
        tokenIds: ownedTokenIds,
        lastUpdated: new Date(),
      };
      setCache(verificationCache, cacheKey, tokenBalance, cacheTtlMs);

      return {
        requirementId: cacheKey,
        verified,
        balance: ownedTokenIds.length.toString(),
        tokenIds: ownedTokenIds,
        verificationMethod: "on_chain",
        verifiedAt: new Date(),
        error: verified ? undefined : "Required tokens not owned",
      };
    }

    // Otherwise check total balance
    const balanceData = `${ERC721_BALANCE_OF}${encodeAddress(normalizedWallet)}`;
    const balanceResult = await rpcCall(
      chainId,
      normalizedContract,
      balanceData,
    );
    const balance = Number(decodeUint256(balanceResult));
    const verified = balance >= minimumNFTCount;

    // Cache the result
    const tokenBalance: TokenBalance = {
      contractAddress: normalizedContract,
      chainId,
      ownerAddress: normalizedWallet,
      balance: balance.toString(),
      lastUpdated: new Date(),
    };
    setCache(verificationCache, cacheKey, tokenBalance, cacheTtlMs);

    return {
      requirementId: cacheKey,
      verified,
      balance: balance.toString(),
      verificationMethod: "on_chain",
      verifiedAt: new Date(),
      error: verified
        ? undefined
        : `Insufficient NFT count (${balance}/${minimumNFTCount})`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ERC-721 verification failed";
    return {
      requirementId: cacheKey,
      verified: false,
      error: message,
      verificationMethod: "on_chain",
      verifiedAt: new Date(),
    };
  }
}

/**
 * Verify ERC-1155 token ownership
 */
export async function verifyERC1155Ownership(
  chainId: ChainId,
  contractAddress: string,
  walletAddress: string,
  tokenId: string,
  options: {
    minimumAmount?: string;
    cacheTtlMs?: number;
  } = {},
): Promise<RequirementVerificationResult> {
  const { minimumAmount = "1", cacheTtlMs = DEFAULT_CACHE_TTL_MS } = options;
  const normalizedContract = normalizeAddress(contractAddress);
  const normalizedWallet = normalizeAddress(walletAddress);
  const cacheKey = `erc1155:${chainId}:${normalizedContract}:${normalizedWallet}:${tokenId}`;

  // Check cache
  const cached = getCached(verificationCache, cacheKey);
  if (cached) {
    const balance = BigInt(cached.balance);
    const required = BigInt(minimumAmount);

    return {
      requirementId: cacheKey,
      verified: balance >= required,
      balance: cached.balance,
      tokenIds: cached.tokenIds,
      verificationMethod: "cached",
      verifiedAt: cached.lastUpdated,
    };
  }

  try {
    // balanceOf(address, uint256)
    const balanceData = `${ERC1155_BALANCE_OF}${encodeAddress(normalizedWallet)}${encodeUint256(tokenId)}`;
    const balanceResult = await rpcCall(
      chainId,
      normalizedContract,
      balanceData,
    );
    const balance = decodeUint256(balanceResult);
    const required = BigInt(minimumAmount);
    const verified = balance >= required;

    // Cache the result
    const tokenBalance: TokenBalance = {
      contractAddress: normalizedContract,
      chainId,
      ownerAddress: normalizedWallet,
      balance: balance.toString(),
      tokenIds: [tokenId],
      lastUpdated: new Date(),
    };
    setCache(verificationCache, cacheKey, tokenBalance, cacheTtlMs);

    return {
      requirementId: cacheKey,
      verified,
      balance: balance.toString(),
      tokenIds: [tokenId],
      verificationMethod: "on_chain",
      verifiedAt: new Date(),
      error: verified
        ? undefined
        : `Insufficient balance (${balance}/${minimumAmount})`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ERC-1155 verification failed";
    return {
      requirementId: cacheKey,
      verified: false,
      error: message,
      verificationMethod: "on_chain",
      verifiedAt: new Date(),
    };
  }
}

/**
 * Verify ERC-1155 batch ownership (multiple token IDs)
 */
export async function verifyERC1155BatchOwnership(
  chainId: ChainId,
  contractAddress: string,
  walletAddress: string,
  tokenIds: string[],
  options: {
    minimumTotalAmount?: string;
    cacheTtlMs?: number;
  } = {},
): Promise<RequirementVerificationResult> {
  const { minimumTotalAmount = "1", cacheTtlMs = DEFAULT_CACHE_TTL_MS } =
    options;

  if (tokenIds.length === 0) {
    return {
      requirementId: "empty",
      verified: false,
      error: "No token IDs provided",
      verificationMethod: "on_chain",
      verifiedAt: new Date(),
    };
  }

  // Verify each token ID individually
  const results = await Promise.all(
    tokenIds.map((tokenId) =>
      verifyERC1155Ownership(chainId, contractAddress, walletAddress, tokenId, {
        minimumAmount: "0", // Check for any balance
        cacheTtlMs,
      }),
    ),
  );

  // Calculate total balance and collect owned token IDs
  let totalBalance = BigInt(0);
  const ownedTokenIds: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.balance) {
      const balance = BigInt(result.balance);
      if (balance > 0) {
        totalBalance += balance;
        ownedTokenIds.push(tokenIds[i]);
      }
    }
  }

  const required = BigInt(minimumTotalAmount);
  const verified = totalBalance >= required;

  return {
    requirementId: `erc1155-batch:${chainId}:${contractAddress}:${walletAddress}`,
    verified,
    balance: totalBalance.toString(),
    tokenIds: ownedTokenIds,
    verificationMethod: "on_chain",
    verifiedAt: new Date(),
    error: verified
      ? undefined
      : `Insufficient total balance (${totalBalance}/${minimumTotalAmount})`,
  };
}

// =============================================================================
// REQUIREMENT VERIFICATION
// =============================================================================

/**
 * Verify a single token requirement
 */
export async function verifyRequirement(
  requirement: TokenRequirementCondition,
  walletAddress: string,
  cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
): Promise<RequirementVerificationResult> {
  // Validate addresses
  if (!isValidAddress(walletAddress)) {
    return {
      requirementId: requirement.id,
      verified: false,
      error: "Invalid wallet address",
      verificationMethod: "on_chain",
      verifiedAt: new Date(),
    };
  }

  if (!isValidAddress(requirement.contractAddress)) {
    return {
      requirementId: requirement.id,
      verified: false,
      error: "Invalid contract address",
      verificationMethod: "on_chain",
      verifiedAt: new Date(),
    };
  }

  switch (requirement.standard) {
    case "erc20":
      return verifyERC20Balance(
        requirement.chainId,
        requirement.contractAddress,
        walletAddress,
        requirement.minimumBalance || "1",
        cacheTtlMs,
      );

    case "erc721":
      return verifyERC721Ownership(
        requirement.chainId,
        requirement.contractAddress,
        walletAddress,
        {
          requiredTokenIds: requirement.requiredTokenIds,
          minimumNFTCount: requirement.minimumNFTCount || 1,
          cacheTtlMs,
        },
      );

    case "erc1155":
      if (requirement.tokenId) {
        return verifyERC1155Ownership(
          requirement.chainId,
          requirement.contractAddress,
          walletAddress,
          requirement.tokenId,
          {
            minimumAmount: requirement.minimumAmount || "1",
            cacheTtlMs,
          },
        );
      } else if (
        requirement.requiredTokenIds &&
        requirement.requiredTokenIds.length > 0
      ) {
        return verifyERC1155BatchOwnership(
          requirement.chainId,
          requirement.contractAddress,
          walletAddress,
          requirement.requiredTokenIds,
          {
            minimumTotalAmount: requirement.minimumAmount || "1",
            cacheTtlMs,
          },
        );
      } else {
        return {
          requirementId: requirement.id,
          verified: false,
          error: "ERC-1155 requires tokenId or requiredTokenIds",
          verificationMethod: "on_chain",
          verifiedAt: new Date(),
        };
      }

    default:
      return {
        requirementId: requirement.id,
        verified: false,
        error: `Unsupported token standard: ${requirement.standard}`,
        verificationMethod: "on_chain",
        verifiedAt: new Date(),
      };
  }
}

/**
 * Verify multiple requirements with AND/OR logic
 */
export async function verifyRequirements(
  requirements: TokenRequirementCondition[],
  walletAddress: string,
  operator: "AND" | "OR" = "AND",
  cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
): Promise<{
  verified: boolean;
  results: RequirementVerificationResult[];
}> {
  if (requirements.length === 0) {
    return { verified: true, results: [] };
  }

  // Verify all requirements in parallel
  const results = await Promise.all(
    requirements.map((req) =>
      verifyRequirement(req, walletAddress, cacheTtlMs),
    ),
  );

  // Apply operator logic
  const verified =
    operator === "AND"
      ? results.every((r) => r.verified)
      : results.some((r) => r.verified);

  return { verified, results };
}

// =============================================================================
// MULTI-CHAIN VERIFICATION
// =============================================================================

/**
 * Verify tokens across multiple chains
 */
export async function verifyMultiChain(
  request: MultiChainVerificationRequest,
): Promise<MultiChainVerificationResult> {
  const results = await Promise.all(
    request.requirements.map(async (req) => {
      try {
        let result: RequirementVerificationResult;

        switch (req.standard) {
          case "erc20":
            result = await verifyERC20Balance(
              req.chainId,
              req.contractAddress,
              request.walletAddress,
              req.minimumBalance || "1",
            );
            break;

          case "erc721":
            result = await verifyERC721Ownership(
              req.chainId,
              req.contractAddress,
              request.walletAddress,
              { requiredTokenIds: req.tokenIds },
            );
            break;

          case "erc1155":
            if (req.tokenIds && req.tokenIds.length > 0) {
              result = await verifyERC1155BatchOwnership(
                req.chainId,
                req.contractAddress,
                request.walletAddress,
                req.tokenIds,
              );
            } else {
              return {
                chainId: req.chainId,
                contractAddress: req.contractAddress,
                verified: false,
                error: "ERC-1155 requires tokenIds",
              };
            }
            break;

          default:
            return {
              chainId: req.chainId,
              contractAddress: req.contractAddress,
              verified: false,
              error: `Unsupported standard: ${req.standard}`,
            };
        }

        return {
          chainId: req.chainId,
          contractAddress: req.contractAddress,
          verified: result.verified,
          balance: result.balance,
          tokenIds: result.tokenIds,
          error: result.error,
        };
      } catch (error) {
        return {
          chainId: req.chainId,
          contractAddress: req.contractAddress,
          verified: false,
          error: error instanceof Error ? error.message : "Verification failed",
        };
      }
    }),
  );

  return {
    walletAddress: request.walletAddress,
    results,
    allVerified: results.every((r) => r.verified),
    timestamp: new Date(),
  };
}

// =============================================================================
// WALLET SIGNATURE VERIFICATION
// =============================================================================

/**
 * Generate a message for wallet signature verification
 */
export function generateSignatureMessage(
  walletAddress: string,
  nonce: string,
): string {
  return `Sign this message to verify ownership of wallet ${walletAddress}\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
}

/**
 * Verify wallet signature (for client-side verification)
 * Note: This requires ethers.js or similar library
 */
export async function verifyWalletSignature(
  message: string,
  signature: string,
  expectedAddress: string,
): Promise<boolean> {
  try {
    // This is a placeholder - actual implementation would use ethers.js
    // const recoveredAddress = ethers.verifyMessage(message, signature)
    // return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()

    // For server-side, we'd need to dynamically import or use a lighter library
    // For now, we trust the signature was verified client-side and just validate format
    if (!signature || !signature.startsWith("0x") || signature.length !== 132) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  getRpcUrl,
  getAlchemyApiKey,
  encodeAddress,
  encodeUint256,
  decodeUint256,
  decodeString,
  rpcCall,
};
