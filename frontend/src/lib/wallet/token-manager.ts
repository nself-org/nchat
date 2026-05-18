/**
 * Token Manager - Handles ERC-20 and NFT token operations
 *
 * Provides balance checking, token transfers, approvals,
 * and NFT detection capabilities.
 */

import type { EthereumProvider, ChainId } from "./wallet-connector";

// ============================================================================
// Types
// ============================================================================

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: ChainId;
  logoUri?: string;
}

export interface TokenBalance {
  token: TokenInfo;
  balance: string;
  balanceFormatted: string;
}

export interface NFTInfo {
  contractAddress: string;
  tokenId: string;
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  owner: string;
  chainId: ChainId;
}

export interface TransferParams {
  tokenAddress: string;
  from: string;
  to: string;
  amount: string;
}

export interface ApprovalParams {
  tokenAddress: string;
  owner: string;
  spender: string;
  amount: string;
}

export interface TokenManagerResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

export const TOKEN_ERROR_CODES = {
  PROVIDER_NOT_SET: -1,
  INVALID_ADDRESS: -2,
  INSUFFICIENT_BALANCE: -3,
  TRANSFER_FAILED: -4,
  APPROVAL_FAILED: -5,
  TOKEN_NOT_FOUND: -6,
  NFT_NOT_FOUND: -7,
  INTERNAL_ERROR: -32603,
} as const;

// ERC-20 function signatures
const ERC20_SIGNATURES = {
  balanceOf: "0x70a08231",
  transfer: "0xa9059cbb",
  transferFrom: "0x23b872dd",
  approve: "0x095ea7b3",
  allowance: "0xdd62ed3e",
  totalSupply: "0x18160ddd",
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
};

// ERC-721 function signatures
const ERC721_SIGNATURES = {
  balanceOf: "0x70a08231",
  ownerOf: "0x6352211e",
  tokenURI: "0xc87b56dd",
  approve: "0x095ea7b3",
  getApproved: "0x081812fc",
  setApprovalForAll: "0xa22cb465",
  isApprovedForAll: "0xe985e9c5",
  transferFrom: "0x23b872dd",
  safeTransferFrom: "0x42842e0e",
};

// Common tokens by chain
export const COMMON_TOKENS: Record<ChainId, TokenInfo[]> = {
  "0x1": [
    {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      chainId: "0x1",
    },
    {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainId: "0x1",
    },
    {
      address: "0x6B175474E89094C44Da98b954EesdasdCC44D831ec7",
      name: "Dai",
      symbol: "DAI",
      decimals: 18,
      chainId: "0x1",
    },
  ],
  "0x89": [
    {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      chainId: "0x89",
    },
    {
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainId: "0x89",
    },
  ],
  "0x5": [],
  "0xaa36a7": [],
  "0x13881": [],
  "0xa4b1": [],
  "0xa": [],
  "0x38": [],
  "0x2105": [],
};

// ============================================================================
// Token Manager Class
// ============================================================================

export class TokenManager {
  private provider: EthereumProvider | null = null;
  private tokenCache: Map<string, TokenInfo> = new Map();

  constructor(provider?: EthereumProvider) {
    if (provider) {
      this.provider = provider;
    }
  }

  /**
   * Set the Ethereum provider
   */
  setProvider(provider: EthereumProvider | null): void {
    this.provider = provider;
  }

  /**
   * Get the Ethereum provider
   */
  getProvider(): EthereumProvider | null {
    return this.provider;
  }

  // ==========================================================================
  // Token Information
  // ==========================================================================

  /**
   * Get token information
   */
  async getTokenInfo(
    tokenAddress: string,
    chainId: ChainId,
  ): Promise<TokenManagerResult<TokenInfo>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.PROVIDER_NOT_SET,
          message: "Provider not set",
        },
      };
    }

    if (!this.isValidAddress(tokenAddress)) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.INVALID_ADDRESS,
          message: "Invalid token address",
        },
      };
    }

    // Check cache
    const cacheKey = `${chainId}:${tokenAddress}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const [name, symbol, decimals] = await Promise.all([
        this.callContract(tokenAddress, ERC20_SIGNATURES.name, []),
        this.callContract(tokenAddress, ERC20_SIGNATURES.symbol, []),
        this.callContract(tokenAddress, ERC20_SIGNATURES.decimals, []),
      ]);

      const tokenInfo: TokenInfo = {
        address: tokenAddress,
        name: this.decodeString(name),
        symbol: this.decodeString(symbol),
        decimals: this.decodeUint(decimals),
        chainId,
      };

      this.tokenCache.set(cacheKey, tokenInfo);

      return { success: true, data: tokenInfo };
    } catch (error) {
      const err = error as { message?: string };
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.TOKEN_NOT_FOUND,
          message: err.message ?? "Failed to get token info",
        },
      };
    }
  }

  /**
   * Get common tokens for a chain
   */
  getCommonTokens(chainId: ChainId): TokenInfo[] {
    return COMMON_TOKENS[chainId] ?? [];
  }

  /**
   * Add token to cache
   */
  addTokenToCache(token: TokenInfo): void {
    const cacheKey = `${token.chainId}:${token.address}`;
    this.tokenCache.set(cacheKey, token);
  }

  /**
   * Clear token cache
   */
  clearCache(): void {
    this.tokenCache.clear();
  }

  // ==========================================================================
  // Balance Operations
  // ==========================================================================

  /**
   * Get ERC-20 token balance
   */
  async getTokenBalance(
    tokenAddress: string,
    ownerAddress: string,
    chainId: ChainId,
  ): Promise<TokenManagerResult<TokenBalance>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.PROVIDER_NOT_SET,
          message: "Provider not set",
        },
      };
    }

    if (
      !this.isValidAddress(tokenAddress) ||
      !this.isValidAddress(ownerAddress)
    ) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.INVALID_ADDRESS,
          message: "Invalid address",
        },
      };
    }

    try {
      // Get token info
      const tokenInfoResult = await this.getTokenInfo(tokenAddress, chainId);
      if (!tokenInfoResult.success || !tokenInfoResult.data) {
        return {
          success: false,
          error: tokenInfoResult.error,
        };
      }

      // Get balance
      const balance = await this.callContract(
        tokenAddress,
        ERC20_SIGNATURES.balanceOf,
        [this.padAddress(ownerAddress)],
      );

      const balanceValue = this.decodeUint256(balance);
      const balanceFormatted = this.formatTokenAmount(
        balanceValue,
        tokenInfoResult.data.decimals,
      );

      return {
        success: true,
        data: {
          token: tokenInfoResult.data,
          balance: balanceValue,
          balanceFormatted,
        },
      };
    } catch (error) {
      const err = error as { message?: string };
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to get balance",
        },
      };
    }
  }

  /**
   * Get multiple token balances
   */
  async getTokenBalances(
    tokenAddresses: string[],
    ownerAddress: string,
    chainId: ChainId,
  ): Promise<TokenManagerResult<TokenBalance[]>> {
    const results = await Promise.all(
      tokenAddresses.map((address) =>
        this.getTokenBalance(address, ownerAddress, chainId),
      ),
    );

    const balances: TokenBalance[] = [];
    for (const result of results) {
      if (result.success && result.data) {
        balances.push(result.data);
      }
    }

    return { success: true, data: balances };
  }

  // ==========================================================================
  // Transfer Operations
  // ==========================================================================

  /**
   * Transfer ERC-20 tokens
   */
  async transfer(params: TransferParams): Promise<TokenManagerResult<string>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.PROVIDER_NOT_SET,
          message: "Provider not set",
        },
      };
    }

    if (
      !this.isValidAddress(params.tokenAddress) ||
      !this.isValidAddress(params.to)
    ) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.INVALID_ADDRESS,
          message: "Invalid address",
        },
      };
    }

    try {
      const data = this.encodeTransfer(params.to, params.amount);

      const txHash = (await this.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: params.from,
            to: params.tokenAddress,
            data,
          },
        ],
      })) as string;

      return { success: true, data: txHash };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? TOKEN_ERROR_CODES.TRANSFER_FAILED,
          message: err.message ?? "Transfer failed",
        },
      };
    }
  }

  /**
   * Encode transfer data
   */
  encodeTransfer(to: string, amount: string): string {
    const paddedTo = this.padAddress(to);
    const paddedAmount = this.padUint256(amount);
    return ERC20_SIGNATURES.transfer + paddedTo + paddedAmount;
  }

  // ==========================================================================
  // Approval Operations
  // ==========================================================================

  /**
   * Approve token spending
   */
  async approve(params: ApprovalParams): Promise<TokenManagerResult<string>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.PROVIDER_NOT_SET,
          message: "Provider not set",
        },
      };
    }

    if (
      !this.isValidAddress(params.tokenAddress) ||
      !this.isValidAddress(params.spender)
    ) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.INVALID_ADDRESS,
          message: "Invalid address",
        },
      };
    }

    try {
      const data = this.encodeApproval(params.spender, params.amount);

      const txHash = (await this.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: params.owner,
            to: params.tokenAddress,
            data,
          },
        ],
      })) as string;

      return { success: true, data: txHash };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? TOKEN_ERROR_CODES.APPROVAL_FAILED,
          message: err.message ?? "Approval failed",
        },
      };
    }
  }

  /**
   * Encode approval data
   */
  encodeApproval(spender: string, amount: string): string {
    const paddedSpender = this.padAddress(spender);
    const paddedAmount = this.padUint256(amount);
    return ERC20_SIGNATURES.approve + paddedSpender + paddedAmount;
  }

  /**
   * Get allowance
   */
  async getAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
  ): Promise<TokenManagerResult<string>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.PROVIDER_NOT_SET,
          message: "Provider not set",
        },
      };
    }

    try {
      const data =
        ERC20_SIGNATURES.allowance +
        this.padAddress(ownerAddress) +
        this.padAddress(spenderAddress);

      const result = (await this.provider.request({
        method: "eth_call",
        params: [{ to: tokenAddress, data }, "latest"],
      })) as string;

      return { success: true, data: this.decodeUint256(result) };
    } catch (error) {
      const err = error as { message?: string };
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to get allowance",
        },
      };
    }
  }

  /**
   * Check if approval is needed
   */
  async needsApproval(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    amount: string,
  ): Promise<TokenManagerResult<boolean>> {
    const allowanceResult = await this.getAllowance(
      tokenAddress,
      ownerAddress,
      spenderAddress,
    );
    if (!allowanceResult.success || !allowanceResult.data) {
      return {
        success: false,
        error: allowanceResult.error,
      };
    }

    const allowance = BigInt(allowanceResult.data);
    const requiredAmount = BigInt(amount);

    return { success: true, data: allowance < requiredAmount };
  }

  // ==========================================================================
  // NFT Operations
  // ==========================================================================

  /**
   * Get NFT owner
   */
  async getNFTOwner(
    contractAddress: string,
    tokenId: string,
  ): Promise<TokenManagerResult<string>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.PROVIDER_NOT_SET,
          message: "Provider not set",
        },
      };
    }

    try {
      const data = ERC721_SIGNATURES.ownerOf + this.padUint256(tokenId);

      const result = (await this.provider.request({
        method: "eth_call",
        params: [{ to: contractAddress, data }, "latest"],
      })) as string;

      const owner = "0x" + result.slice(26);
      return { success: true, data: owner };
    } catch (error) {
      const err = error as { message?: string };
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.NFT_NOT_FOUND,
          message: err.message ?? "NFT not found",
        },
      };
    }
  }

  /**
   * Get NFT token URI
   */
  async getNFTTokenURI(
    contractAddress: string,
    tokenId: string,
  ): Promise<TokenManagerResult<string>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.PROVIDER_NOT_SET,
          message: "Provider not set",
        },
      };
    }

    try {
      const data = ERC721_SIGNATURES.tokenURI + this.padUint256(tokenId);

      const result = (await this.provider.request({
        method: "eth_call",
        params: [{ to: contractAddress, data }, "latest"],
      })) as string;

      const uri = this.decodeString(result);
      return { success: true, data: uri };
    } catch (error) {
      const err = error as { message?: string };
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.NFT_NOT_FOUND,
          message: err.message ?? "Failed to get token URI",
        },
      };
    }
  }

  /**
   * Get NFT balance for an address
   */
  async getNFTBalance(
    contractAddress: string,
    ownerAddress: string,
  ): Promise<TokenManagerResult<number>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.PROVIDER_NOT_SET,
          message: "Provider not set",
        },
      };
    }

    try {
      const data = ERC721_SIGNATURES.balanceOf + this.padAddress(ownerAddress);

      const result = (await this.provider.request({
        method: "eth_call",
        params: [{ to: contractAddress, data }, "latest"],
      })) as string;

      return { success: true, data: this.decodeUint(result) };
    } catch (error) {
      const err = error as { message?: string };
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to get NFT balance",
        },
      };
    }
  }

  /**
   * Check if address owns NFT
   */
  async isNFTOwner(
    contractAddress: string,
    tokenId: string,
    address: string,
  ): Promise<TokenManagerResult<boolean>> {
    const ownerResult = await this.getNFTOwner(contractAddress, tokenId);
    if (!ownerResult.success || !ownerResult.data) {
      return {
        success: false,
        error: ownerResult.error,
      };
    }

    return {
      success: true,
      data: ownerResult.data.toLowerCase() === address.toLowerCase(),
    };
  }

  /**
   * Transfer NFT
   */
  async transferNFT(
    contractAddress: string,
    from: string,
    to: string,
    tokenId: string,
  ): Promise<TokenManagerResult<string>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TOKEN_ERROR_CODES.PROVIDER_NOT_SET,
          message: "Provider not set",
        },
      };
    }

    try {
      const data =
        ERC721_SIGNATURES.transferFrom +
        this.padAddress(from) +
        this.padAddress(to) +
        this.padUint256(tokenId);

      const txHash = (await this.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: contractAddress,
            data,
          },
        ],
      })) as string;

      return { success: true, data: txHash };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? TOKEN_ERROR_CODES.TRANSFER_FAILED,
          message: err.message ?? "NFT transfer failed",
        },
      };
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Call a contract read function
   */
  private async callContract(
    contractAddress: string,
    methodSignature: string,
    params: string[],
  ): Promise<string> {
    if (!this.provider) {
      throw new Error("Provider not set");
    }

    const data = methodSignature + params.join("");

    return (await this.provider.request({
      method: "eth_call",
      params: [{ to: contractAddress, data }, "latest"],
    })) as string;
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Pad address to 32 bytes
   */
  padAddress(address: string): string {
    return address.toLowerCase().replace("0x", "").padStart(64, "0");
  }

  /**
   * Pad uint256 to 32 bytes
   */
  padUint256(value: string): string {
    const hex = BigInt(value).toString(16);
    return hex.padStart(64, "0");
  }

  /**
   * Decode string from ABI-encoded data
   */
  decodeString(data: string): string {
    if (data === "0x" || data.length < 66) {
      return "";
    }

    try {
      // Remove 0x prefix
      const hex = data.slice(2);

      // For dynamic strings, skip offset (first 32 bytes) and length (next 32 bytes)
      // Then decode the actual string content
      const offset = parseInt(hex.slice(0, 64), 16) * 2;
      const length = parseInt(hex.slice(offset, offset + 64), 16);
      const content = hex.slice(offset + 64, offset + 64 + length * 2);

      // Convert hex to string
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
   * Decode uint from ABI-encoded data
   */
  decodeUint(data: string): number {
    if (data === "0x" || data.length < 3) {
      return 0;
    }
    return parseInt(data, 16);
  }

  /**
   * Decode uint256 from ABI-encoded data
   */
  decodeUint256(data: string): string {
    if (data === "0x" || data.length < 3) {
      return "0";
    }
    return BigInt(data).toString();
  }

  /**
   * Format token amount for display
   */
  formatTokenAmount(amount: string, decimals: number): string {
    const value = BigInt(amount);
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
   * Parse token amount from user input
   */
  parseTokenAmount(amount: string, decimals: number): string {
    const [integerPart, fractionalPart = ""] = amount.split(".");
    const paddedFractional = fractionalPart
      .padEnd(decimals, "0")
      .slice(0, decimals);
    const combined = integerPart + paddedFractional;
    return BigInt(combined).toString();
  }

  /**
   * Get max uint256 (infinite approval)
   */
  getMaxUint256(): string {
    return "0x" + "f".repeat(64);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let tokenManagerInstance: TokenManager | null = null;

/**
 * Get the token manager singleton
 */
export function getTokenManager(provider?: EthereumProvider): TokenManager {
  if (!tokenManagerInstance) {
    tokenManagerInstance = new TokenManager(provider);
  } else if (provider) {
    tokenManagerInstance.setProvider(provider);
  }
  return tokenManagerInstance;
}

/**
 * Reset the token manager (for testing)
 */
export function resetTokenManager(): void {
  tokenManagerInstance = null;
}
