/**
 * Security Services
 *
 * Exports for security-related services including:
 * - Session wipe operations
 * - Emergency lockout (panic mode)
 * - Remote wipe coordination
 */

export {
  WipeService,
  getWipeService,
  resetWipeService,
  initializeWipeService,
  createWipeService,
  DEFAULT_WIPE_CONFIG,
  DEFAULT_PANIC_CONFIG,
  type WipeServiceState,
  type PendingWipe,
  type SessionKillRequest,
  type DeviceWipeRequest,
  type RemoteWipeAuth,
  type EmergencyLockoutOptions,
  type WipeVerification,
  type WipeServiceEventType,
  type WipeServiceEvent,
  type WipeServiceEventListener,
} from "./wipe.service";
