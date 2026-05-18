/**
 * NFT Verifier
 * Verify NFT ownership and token balances for token gating
 *
 * This module provides real on-chain verification using:
 * - Alchemy NFT API (recommended for production)
 * - Direct RPC calls as fallback
 * - Support for ERC-20, ERC-721, and ERC-1155 tokens
 */

import type {
  CryptoNetwork,
  TokenType,
  TokenRequirement,
} from "@/types/billing";
import { CRYPTO_NETWORKS } from "@/config/billing-plans";

export interface VerificationResult {
  verified: boolean;
  balance?: number;
  tokenIds?: string[];
  error?: string;
  source?: "alchemy" | "rpc" | "cache";
}

/**
 * Get Alchemy API key for network (read at runtime for testing)
 */
function getAlchemyApiKey(network: CryptoNetwork): string | undefined {
  switch (network) {
    case "ethereum":
      return process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY;
    case "polygon":
      return process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_API_KEY;
    case "arbitrum":
      return process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_API_KEY;
    case "bsc":
      return undefined; // Alchemy doesn't support BSC, use direct RPC
    default:
      return undefined;
  }
}

const ALCHEMY_BASE_URLS: Record<CryptoNetwork, string> = {
  ethereum: "https://eth-mainnet.g.alchemy.com/nft/v3/",
  polygon: "https://polygon-mainnet.g.alchemy.com/nft/v3/",
  arbitrum: "https://arb-mainnet.g.alchemy.com/nft/v3/",
  bsc: "", // Not supported
};

const ALCHEMY_RPC_URLS: Record<CryptoNetwork, string> = {
  ethereum: "https://eth-mainnet.g.alchemy.com/v2/",
  polygon: "https://polygon-mainnet.g.alchemy.com/v2/",
  arbitrum: "https://arb-mainnet.g.alchemy.com/v2/",
  bsc: "", // Not supported
};

/**
 * Fallback RPC URLs for networks not supported by Alchemy or when API key is missing
 */
const FALLBACK_RPC_URLS: Record<CryptoNetwork, string> = {
  ethereum: CRYPTO_NETWORKS.ethereum.rpcUrl,
  polygon: CRYPTO_NETWORKS.polygon.rpcUrl,
  bsc: CRYPTO_NETWORKS.bsc.rpcUrl,
  arbitrum: CRYPTO_NETWORKS.arbitrum.rpcUrl,
};

/**
 * ERC-20 ABI (minimal for balanceOf and decimals)
 */
const ERC20_BALANCE_SELECTOR = "0x70a08231"; // balanceOf(address)
const ERC20_DECIMALS_SELECTOR = "0x313ce567"; // decimals()

/**
 * ERC-721 ABI (minimal for balanceOf and ownerOf)
 */
const ERC721_BALANCE_SELECTOR = "0x70a08231"; // balanceOf(address)
const ERC721_OWNER_OF_SELECTOR = "0x6352211e"; // ownerOf(uint256)

/**
 * ERC-1155 ABI (minimal for balanceOf)
 */
const ERC1155_BALANCE_OF_SELECTOR = "0x00fdd58e"; // balanceOf(address, uint256)

/**
 * Cache for verification results (5 minute TTL)
 */
const verificationCache = new Map<
  string,
  {
    result: VerificationResult;
    timestamp: number;
  }
>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key for verification
 */
function getCacheKey(
  network: CryptoNetwork,
  contractAddress: string,
  walletAddress: string,
  tokenType: TokenType,
  tokenIds?: string[],
): string {
  return `${network}:${contractAddress}:${walletAddress}:${tokenType}:${tokenIds?.join(",") || ""}`;
}

/**
 * Get cached result if valid
 */
function getCachedResult(cacheKey: string): VerificationResult | null {
  const cached = verificationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.result, source: "cache" };
  }
  verificationCache.delete(cacheKey);
  return null;
}

/**
 * Set cache result
 */
function setCacheResult(cacheKey: string, result: VerificationResult): void {
  verificationCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });
}

/**
 * Encode address parameter (left-padded to 32 bytes)
 */
function encodeAddress(address: string): string {
  return address.toLowerCase().replace("0x", "").padStart(64, "0");
}

/**
 * Encode uint256 parameter (left-padded to 32 bytes)
 */
function encodeUint256(value: string | number | bigint): string {
  const bigValue = typeof value === "string" ? BigInt(value) : BigInt(value);
  return bigValue.toString(16).padStart(64, "0");
}

/**
 * Decode hex result to bigint
 */
function decodeUint256(result: string): bigint {
  if (!result || result === "0x" || result === "0x0") {
    return BigInt(0);
  }
  return BigInt(result);
}

/**
 * Get RPC URL for network
 */
function getRpcUrl(network: CryptoNetwork): string {
  const alchemyKey = getAlchemyApiKey(network);
  if (alchemyKey && ALCHEMY_RPC_URLS[network]) {
    return `${ALCHEMY_RPC_URLS[network]}${alchemyKey}`;
  }
  return FALLBACK_RPC_URLS[network];
}

/**
 * Make JSON-RPC call
 */
async function rpcCall(
  network: CryptoNetwork,
  contractAddress: string,
  data: string,
): Promise<string> {
  const rpcUrl = getRpcUrl(network);

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        {
          to: contractAddress,
          data,
        },
        "latest",
      ],
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.statusText}`);
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(`RPC error: ${json.error.message}`);
  }

  return json.result;
}

/**
 * Get Web3 provider for a network (browser environment)
 */
function getProvider(network: CryptoNetwork) {
  if (typeof window === "undefined") {
    return null;
  }

  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    return null;
  }

  return ethereum;
}

/**
 * Make eth_call using browser provider
 */
async function browserRpcCall(
  network: CryptoNetwork,
  contractAddress: string,
  data: string,
): Promise<string> {
  const provider = getProvider(network);

  if (!provider) {
    throw new Error("No Web3 provider found");
  }

  const result = await provider.request({
    method: "eth_call",
    params: [
      {
        to: contractAddress,
        data,
      },
      "latest",
    ],
  });

  return result;
}

/**
 * Make RPC call with fallback (try server-side first, then browser)
 */
async function makeRpcCall(
  network: CryptoNetwork,
  contractAddress: string,
  data: string,
): Promise<string> {
  try {
    // Try server-side RPC first
    return await rpcCall(network, contractAddress, data);
  } catch {
    // Fall back to browser provider
    return await browserRpcCall(network, contractAddress, data);
  }
}

/**
 * Verify ERC-20 token balance via RPC
 */
export async function verifyERC20Balance(
  network: CryptoNetwork,
  contractAddress: string,
  walletAddress: string,
  minBalance: number,
): Promise<VerificationResult> {
  const cacheKey = getCacheKey(
    network,
    contractAddress,
    walletAddress,
    "erc20",
  );
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  try {
    // Get balance
    const balanceData = `${ERC20_BALANCE_SELECTOR}${encodeAddress(walletAddress)}`;
    const balanceResult = await makeRpcCall(
      network,
      contractAddress,
      balanceData,
    );
    const rawBalance = decodeUint256(balanceResult);

    // Get decimals
    let decimals = 18; // Default to 18 decimals
    try {
      const decimalsResult = await makeRpcCall(
        network,
        contractAddress,
        ERC20_DECIMALS_SELECTOR,
      );
      decimals = Number(decodeUint256(decimalsResult));
    } catch {
      // Some tokens don't implement decimals(), use default
    }

    // Calculate actual balance
    const actualBalance = Number(rawBalance) / Math.pow(10, decimals);

    const result: VerificationResult = {
      verified: actualBalance >= minBalance,
      balance: actualBalance,
      source: "rpc",
    };

    setCacheResult(cacheKey, result);
    return result;
  } catch (error: any) {
    return {
      verified: false,
      error: error.message || "Failed to verify ERC-20 balance",
    };
  }
}

/**
 * Verify ERC-721 NFT ownership via Alchemy API
 */
async function verifyERC721ViaAlchemy(
  network: CryptoNetwork,
  contractAddress: string,
  walletAddress: string,
  requiredTokenIds?: string[],
  minTokenCount?: number,
): Promise<VerificationResult | null> {
  const apiKey = getAlchemyApiKey(network);
  const baseUrl = ALCHEMY_BASE_URLS[network];

  if (!apiKey || !baseUrl) {
    return null; // Alchemy not available for this network
  }

  try {
    // Use Alchemy's getNFTsForOwner API
    const url = `${baseUrl}${apiKey}/getNFTsForOwner?owner=${walletAddress}&contractAddresses[]=${contractAddress}&withMetadata=false`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.statusText}`);
    }

    const data = await response.json();
    const ownedNfts = data.ownedNfts || [];
    const balance = ownedNfts.length;
    const ownedTokenIds = ownedNfts.map((nft: any) => nft.tokenId);

    // Check specific token IDs if required
    if (requiredTokenIds && requiredTokenIds.length > 0) {
      const hasRequiredTokens = requiredTokenIds.every((id) =>
        ownedTokenIds.includes(id),
      );
      return {
        verified: hasRequiredTokens,
        balance,
        tokenIds: ownedTokenIds,
        source: "alchemy",
      };
    }

    // Check minimum token count
    const required = minTokenCount ?? 1;
    return {
      verified: balance >= required,
      balance,
      tokenIds: ownedTokenIds,
      source: "alchemy",
    };
  } catch (error) {
    console.warn(
      "Alchemy API verification failed, falling back to RPC:",
      error,
    );
    return null; // Fall back to RPC
  }
}

/**
 * Verify ERC-721 NFT ownership via direct RPC
 */
async function verifyERC721ViaRPC(
  network: CryptoNetwork,
  contractAddress: string,
  walletAddress: string,
  requiredTokenIds?: string[],
  minTokenCount?: number,
): Promise<VerificationResult> {
  try {
    // Get balance using balanceOf
    const balanceData = `${ERC721_BALANCE_SELECTOR}${encodeAddress(walletAddress)}`;
    const balanceResult = await makeRpcCall(
      network,
      contractAddress,
      balanceData,
    );
    const balance = Number(decodeUint256(balanceResult));

    // If specific token IDs required, verify ownership of each
    if (requiredTokenIds && requiredTokenIds.length > 0) {
      const ownedTokenIds: string[] = [];

      for (const tokenId of requiredTokenIds) {
        try {
          const ownerData = `${ERC721_OWNER_OF_SELECTOR}${encodeUint256(tokenId)}`;
          const ownerResult = await makeRpcCall(
            network,
            contractAddress,
            ownerData,
          );
          const owner = "0x" + ownerResult.slice(26).toLowerCase();

          if (owner === walletAddress.toLowerCase()) {
            ownedTokenIds.push(tokenId);
          }
        } catch {
          // Token might not exist or be burned
        }
      }

      const hasAllRequired = requiredTokenIds.every((id) =>
        ownedTokenIds.includes(id),
      );

      return {
        verified: hasAllRequired,
        balance,
        tokenIds: ownedTokenIds,
        source: "rpc",
      };
    }

    // Check minimum token count
    const required = minTokenCount ?? 1;
    return {
      verified: balance >= required,
      balance,
      source: "rpc",
    };
  } catch (error: any) {
    return {
      verified: false,
      error: error.message || "Failed to verify ERC-721 ownership",
    };
  }
}

/**
 * Verify ERC-721 NFT ownership
 * Uses Alchemy API when available, falls back to RPC
 */
export async function verifyERC721Ownership(
  network: CryptoNetwork,
  contractAddress: string,
  walletAddress: string,
  requiredTokenIds?: string[],
  minTokenCount?: number,
): Promise<VerificationResult> {
  const cacheKey = getCacheKey(
    network,
    contractAddress,
    walletAddress,
    "erc721",
    requiredTokenIds,
  );
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  // Try Alchemy first (more reliable and provides token IDs)
  const alchemyResult = await verifyERC721ViaAlchemy(
    network,
    contractAddress,
    walletAddress,
    requiredTokenIds,
    minTokenCount,
  );

  if (alchemyResult) {
    setCacheResult(cacheKey, alchemyResult);
    return alchemyResult;
  }

  // Fall back to RPC
  const rpcResult = await verifyERC721ViaRPC(
    network,
    contractAddress,
    walletAddress,
    requiredTokenIds,
    minTokenCount,
  );

  if (!rpcResult.error) {
    setCacheResult(cacheKey, rpcResult);
  }

  return rpcResult;
}

/**
 * Verify ERC-1155 token ownership via Alchemy API
 */
async function verifyERC1155ViaAlchemy(
  network: CryptoNetwork,
  contractAddress: string,
  walletAddress: string,
  tokenIds: string[],
  minTokenCount?: number,
): Promise<VerificationResult | null> {
  const apiKey = getAlchemyApiKey(network);
  const baseUrl = ALCHEMY_BASE_URLS[network];

  if (!apiKey || !baseUrl) {
    return null; // Alchemy not available for this network
  }

  try {
    // Use Alchemy's getNFTsForOwner API for ERC-1155
    const url = `${baseUrl}${apiKey}/getNFTsForOwner?owner=${walletAddress}&contractAddresses[]=${contractAddress}&withMetadata=false`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.statusText}`);
    }

    const data = await response.json();
    const ownedNfts = data.ownedNfts || [];

    // Calculate total balance for requested token IDs
    let totalBalance = 0;
    const matchedTokenIds: string[] = [];

    for (const nft of ownedNfts) {
      if (tokenIds.includes(nft.tokenId)) {
        // ERC-1155 returns balance in the response
        const balance = parseInt(nft.balance || "1", 10);
        totalBalance += balance;
        matchedTokenIds.push(nft.tokenId);
      }
    }

    const required = minTokenCount ?? 1;
    return {
      verified: totalBalance >= required,
      balance: totalBalance,
      tokenIds: matchedTokenIds,
      source: "alchemy",
    };
  } catch (error) {
    console.warn(
      "Alchemy API verification failed, falling back to RPC:",
      error,
    );
    return null;
  }
}

/**
 * Verify ERC-1155 token ownership via direct RPC
 */
async function verifyERC1155ViaRPC(
  network: CryptoNetwork,
  contractAddress: string,
  walletAddress: string,
  tokenIds: string[],
  minTokenCount?: number,
): Promise<VerificationResult> {
  try {
    let totalBalance = 0;
    const ownedTokenIds: string[] = [];

    // Check balance for each token ID
    for (const tokenId of tokenIds) {
      const data = `${ERC1155_BALANCE_OF_SELECTOR}${encodeAddress(walletAddress)}${encodeUint256(tokenId)}`;
      const result = await makeRpcCall(network, contractAddress, data);
      const balance = Number(decodeUint256(result));

      if (balance > 0) {
        totalBalance += balance;
        ownedTokenIds.push(tokenId);
      }
    }

    const required = minTokenCount ?? 1;

    return {
      verified: totalBalance >= required,
      balance: totalBalance,
      tokenIds: ownedTokenIds,
      source: "rpc",
    };
  } catch (error: any) {
    return {
      verified: false,
      error: error.message || "Failed to verify ERC-1155 ownership",
    };
  }
}

/**
 * Verify ERC-1155 token ownership
 * Uses Alchemy API when available, falls back to RPC
 */
export async function verifyERC1155Ownership(
  network: CryptoNetwork,
  contractAddress: string,
  walletAddress: string,
  tokenIds: string[],
  minTokenCount?: number,
): Promise<VerificationResult> {
  const cacheKey = getCacheKey(
    network,
    contractAddress,
    walletAddress,
    "erc1155",
    tokenIds,
  );
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  // Try Alchemy first
  const alchemyResult = await verifyERC1155ViaAlchemy(
    network,
    contractAddress,
    walletAddress,
    tokenIds,
    minTokenCount,
  );

  if (alchemyResult) {
    setCacheResult(cacheKey, alchemyResult);
    return alchemyResult;
  }

  // Fall back to RPC
  const rpcResult = await verifyERC1155ViaRPC(
    network,
    contractAddress,
    walletAddress,
    tokenIds,
    minTokenCount,
  );

  if (!rpcResult.error) {
    setCacheResult(cacheKey, rpcResult);
  }

  return rpcResult;
}

/**
 * Verify token requirement
 */
export async function verifyTokenRequirement(
  requirement: TokenRequirement,
  walletAddress: string,
): Promise<VerificationResult> {
  if (!requirement.enabled) {
    return {
      verified: true,
    };
  }

  // Validate wallet address format
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return {
      verified: false,
      error: "Invalid wallet address",
    };
  }

  // Validate contract address format
  if (
    !requirement.contractAddress ||
    !/^0x[a-fA-F0-9]{40}$/.test(requirement.contractAddress)
  ) {
    return {
      verified: false,
      error: "Invalid contract address",
    };
  }

  switch (requirement.tokenType) {
    case "erc20":
      return verifyERC20Balance(
        requirement.network,
        requirement.contractAddress,
        walletAddress,
        requirement.minBalance || 0,
      );

    case "erc721":
      return verifyERC721Ownership(
        requirement.network,
        requirement.contractAddress,
        walletAddress,
        requirement.tokenIds,
        requirement.minTokenCount,
      );

    case "erc1155":
      if (!requirement.tokenIds || requirement.tokenIds.length === 0) {
        return {
          verified: false,
          error: "ERC-1155 requires token IDs",
        };
      }
      return verifyERC1155Ownership(
        requirement.network,
        requirement.contractAddress,
        walletAddress,
        requirement.tokenIds,
        requirement.minTokenCount,
      );

    default:
      return {
        verified: false,
        error: "Unknown token type",
      };
  }
}

/**
 * Batch verify multiple requirements
 */
export async function verifyAllRequirements(
  requirements: TokenRequirement[],
  walletAddress: string,
): Promise<{
  allVerified: boolean;
  results: Map<string, VerificationResult>;
}> {
  const results = new Map<string, VerificationResult>();

  // Run verifications in parallel for better performance
  const verificationPromises = requirements
    .filter((r) => r.enabled)
    .map(async (requirement) => {
      const result = await verifyTokenRequirement(requirement, walletAddress);
      return { id: requirement.id, result };
    });

  const verificationResults = await Promise.all(verificationPromises);

  for (const { id, result } of verificationResults) {
    results.set(id, result);
  }

  const allVerified = Array.from(results.values()).every((r) => r.verified);

  return {
    allVerified,
    results,
  };
}

/**
 * Check if wallet has access to a channel
 */
export async function checkChannelAccess(
  channelId: string,
  walletAddress: string,
  requirements: TokenRequirement[],
): Promise<boolean> {
  if (requirements.length === 0) {
    return true; // No requirements, public channel
  }

  const { allVerified } = await verifyAllRequirements(
    requirements,
    walletAddress,
  );
  return allVerified;
}

/**
 * Get user's token holdings for display
 */
export async function getUserTokenHoldings(
  walletAddress: string,
  network: CryptoNetwork,
  contracts: Array<{
    address: string;
    type: TokenType;
    tokenIds?: string[];
  }>,
): Promise<
  Array<{
    contractAddress: string;
    tokenType: TokenType;
    balance: number;
    tokenIds?: string[];
  }>
> {
  const holdings = [];

  for (const contract of contracts) {
    let result: VerificationResult;

    switch (contract.type) {
      case "erc20":
        result = await verifyERC20Balance(
          network,
          contract.address,
          walletAddress,
          0,
        );
        break;

      case "erc721":
        result = await verifyERC721Ownership(
          network,
          contract.address,
          walletAddress,
        );
        break;

      case "erc1155":
        if (!contract.tokenIds) continue;
        result = await verifyERC1155Ownership(
          network,
          contract.address,
          walletAddress,
          contract.tokenIds,
        );
        break;

      default:
        continue;
    }

    if (result.balance && result.balance > 0) {
      holdings.push({
        contractAddress: contract.address,
        tokenType: contract.type,
        balance: result.balance,
        tokenIds: result.tokenIds,
      });
    }
  }

  return holdings;
}

/**
 * Verify ownership using Alchemy NFT API directly
 * This is the recommended approach for production
 */
export async function verifyOwnershipViaAPI(
  walletAddress: string,
  contractAddress: string,
  network: CryptoNetwork,
  tokenType: TokenType = "erc721",
): Promise<VerificationResult> {
  // Validate inputs
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return {
      verified: false,
      error: "Invalid wallet address",
    };
  }

  if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return {
      verified: false,
      error: "Invalid contract address",
    };
  }

  const apiKey = getAlchemyApiKey(network);
  const baseUrl = ALCHEMY_BASE_URLS[network];

  if (!apiKey || !baseUrl) {
    // Fall back to RPC verification for unsupported networks
    if (tokenType === "erc20") {
      return verifyERC20Balance(network, contractAddress, walletAddress, 0);
    } else if (tokenType === "erc721") {
      return verifyERC721ViaRPC(network, contractAddress, walletAddress);
    } else {
      return {
        verified: false,
        error: `Alchemy not available for ${network}. Please use direct verification methods.`,
      };
    }
  }

  try {
    const url = `${baseUrl}${apiKey}/getNFTsForOwner?owner=${walletAddress}&contractAddresses[]=${contractAddress}&withMetadata=false`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.statusText}`);
    }

    const data = await response.json();
    const ownedNfts = data.ownedNfts || [];
    const balance = ownedNfts.length;
    const tokenIds = ownedNfts.map((nft: any) => nft.tokenId);

    return {
      verified: balance > 0,
      balance,
      tokenIds,
      source: "alchemy",
    };
  } catch (error: any) {
    return {
      verified: false,
      error: error.message || "API verification failed",
    };
  }
}

/**
 * Clear verification cache
 * Useful when user acquires new tokens
 */
export function clearVerificationCache(): void {
  verificationCache.clear();
}

/**
 * Clear cache for specific wallet
 */
export function clearWalletCache(walletAddress: string): void {
  for (const key of verificationCache.keys()) {
    if (key.includes(walletAddress.toLowerCase())) {
      verificationCache.delete(key);
    }
  }
}
