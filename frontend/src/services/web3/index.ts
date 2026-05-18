/**
 * Web3 Services
 *
 * Exports all Web3-related services.
 *
 * @module @/services/web3
 * @version 1.0.0
 */

// Token Gate Enforcement Service
export {
  // Gate management
  createTokenGate,
  updateTokenGate,
  deleteTokenGate,
  getTokenGate,
  getTokenGateForResource,
  listTokenGates,

  // Access verification
  checkAccess,
  batchCheckAccess,
  getUserAccessStatus,

  // Cache management
  invalidateGateCache,
  invalidateWalletCache,
  invalidateContractCache,
  handleCacheInvalidation,
  cleanupExpiredCache,

  // Revocation
  checkRevocations,

  // Statistics & Events
  getGateStats,
  getGateEvents,
  getGracePeriodUsers,

  // Service lifecycle
  initializeTokenGateService,
  shutdownTokenGateService,
  resetTokenGateService,

  // Re-exported utilities
  clearVerificationCache,
  clearWalletCache,
  clearContractCache,
} from "./token-gate.service";
