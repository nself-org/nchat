/**
 * Web3 Library
 *
 * Exports all Web3-related types, utilities, and services.
 *
 * @module @/lib/web3
 * @version 1.0.0
 */

// Token Gate Types
export * from "./token-gate-types";

// Token Gate Verifier
export {
  // Verification functions
  verifyERC20Balance,
  verifyERC721Ownership,
  verifyERC1155Ownership,
  verifyERC1155BatchOwnership,
  verifyRequirement,
  verifyRequirements,
  verifyMultiChain,

  // Token info
  getERC20TokenInfo,

  // Cache management
  clearVerificationCache,
  clearWalletCache,
  clearContractCache,

  // Wallet verification
  generateSignatureMessage,
  verifyWalletSignature,

  // Utilities
  getRpcUrl,
  getAlchemyApiKey,
  encodeAddress,
  encodeUint256,
  decodeUint256,
  decodeString,
  rpcCall,
} from "./token-gate-verifier";
