/**
 * Security Module Index
 *
 * Exports all security-related utilities, stores, and hooks
 */

import { authConfig } from "@/config/auth.config";

import { logger } from "@/lib/logger";

// ============================================================================
// Production Security Guards
// ============================================================================

/**
 * CRITICAL: Verify that dev auth is not enabled in production
 * Call this at application startup
 */
export function assertProductionSecurity(): void {
  if (process.env.NODE_ENV === "production") {
    // Check dev auth is disabled.
    // Exception: NEXT_PUBLIC_ENV=test is the deliberate CI escape hatch that
    // allows FauxAuth in production-built binaries during E2E runs. isE2ETest
    // captures this explicit opt-in and must be respected here too.
    if (authConfig.useDevAuth && !authConfig.isE2ETest) {
      throw new Error(
        "[SECURITY] FATAL: Dev auth is enabled in production. " +
          "This is a critical security vulnerability. Shutting down.",
      );
    }

    // Check JWT secret is set and strong enough
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error(
        "[SECURITY] FATAL: JWT_SECRET environment variable is not set in production.",
      );
    }

    if (jwtSecret.length < 32) {
      throw new Error(
        "[SECURITY] FATAL: JWT_SECRET must be at least 32 characters in production.",
      );
    }

    // Check for common weak secrets
    const weakSecrets = [
      "secret",
      "jwt_secret",
      "your-secret",
      "change-me",
      "development",
      "test",
    ];

    if (weakSecrets.some((weak) => jwtSecret.toLowerCase().includes(weak))) {
      throw new Error(
        "[SECURITY] FATAL: JWT_SECRET appears to be a weak or default value. " +
          "Use a cryptographically secure random string.",
      );
    }

    // REMOVED: console.log('[SECURITY] Production security checks passed.')
  }
}

/**
 * Check if dev auth is safely disabled
 * Returns true if safe (production without dev auth, or development)
 */
export function isDevAuthSafe(): boolean {
  if (process.env.NODE_ENV === "production") {
    return !authConfig.useDevAuth;
  }
  return true; // Always safe in development/test
}

/**
 * Get security headers for responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...(process.env.NODE_ENV === "production" && {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    }),
  };
}

/**
 * Log a security event
 */
export function logSecurityEvent(
  event: string,
  level: "info" | "warning" | "error" | "critical",
  details?: Record<string, unknown>,
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    details,
    env: process.env.NODE_ENV,
  };

  if (level === "critical" || level === "error") {
    logger.error(`[SECURITY ${level.toUpperCase()}]`, undefined, logEntry);
  } else if (level === "warning") {
    logger.warn(`[SECURITY ${level.toUpperCase()}]`, logEntry);
  } else {
    // REMOVED: console.log(`[SECURITY ${level.toUpperCase()}]`, JSON.stringify(logEntry))
  }
}

// ============================================================================
// Module Exports
// ============================================================================

// Session Store
export {
  useSessionStore,
  parseUserAgent,
  formatLocation,
  formatSessionTime,
  getDeviceIcon,
  getBrowserIcon,
  type Session,
  type LoginAttempt,
  type SessionLocation,
  type SessionState,
  type SessionActions,
  type SessionStore,
} from "./session-store";

// Two-Factor Authentication
export {
  // Base32 encoding
  base32Encode,
  base32Decode,
  // TOTP
  generateSecret,
  generateOtpauthUrl,
  generateTOTP,
  verifyTOTP,
  // Backup codes
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  // QR code
  generateQRCodeDataUrl,
  // Complete setup
  generateTwoFactorSetup,
  // Validation
  isValidTOTPFormat,
  isValidBackupCodeFormat,
  // Password strength
  calculatePasswordStrength,
  getStrengthColor,
  type TwoFactorSecret,
  type TwoFactorSetupData,
  type BackupCode,
  type PasswordStrength,
} from "./two-factor";

// Security Hook
export {
  useSecurity,
  type ChangePasswordResult,
  type TwoFactorSetupResult,
  type TwoFactorVerifyResult,
  type RevokeSessionResult,
  type SecurityAlertPreferences,
} from "./use-security";

// PIN Lock
export {
  // Validation
  isValidPinFormat,
  getPinStrength,
  // Hashing
  generateSalt,
  hashPin,
  verifyPin,
  // Storage
  storePinSettings,
  loadPinSettings,
  clearPinSettings,
  hasPinConfigured,
  // Attempts
  recordLocalPinAttempt,
  getRecentFailedAttempts,
  clearAttemptHistory,
  checkLocalLockout,
  // Setup/Change
  setupPin,
  changePin,
  updatePinSettings,
  disablePin,
  type PinSettings,
  type PinAttempt,
  type LockoutStatus,
  type PinSetupResult,
} from "./pin";

// Session Management
export {
  // Activity tracking
  updateLastActivity,
  getLastActivityTime,
  getTimeSinceLastActivity,
  getMinutesSinceLastActivity,
  // Visibility
  getVisibilityState,
  setupVisibilityListener,
  // Timeout checking
  checkSessionTimeout,
  shouldLockOnBackground,
  shouldLockOnClose,
  // Lock state
  getLockState,
  lockSession,
  unlockSession,
  isSessionLocked,
  clearLockState,
  // Auto-lock
  checkAndLockIfNeeded,
  setupAutoLockChecker,
  setupActivityListeners,
  setupBeforeUnloadListener,
  // App lifecycle
  handleAppVisible,
  handleAppHidden,
  handleAppClose,
  // Session info
  getSessionActivity,
  getFormattedTimeSinceActivity,
  // Debug
  forceLock,
  getSessionDebugInfo,
  type LockState,
  type SessionActivity,
} from "./session";

// Biometric Authentication
export {
  // Availability
  isWebAuthnSupported,
  isBiometricAvailable,
  getBiometricType,
  // Registration
  registerBiometric,
  // Verification
  verifyBiometric,
  // Credentials
  getStoredCredentials,
  removeCredential,
  clearAllCredentials,
  hasRegisteredCredentials,
  // Utilities
  getCredentialIcon,
  getCredentialTypeDescription,
  formatLastUsed,
  type BiometricCredential,
  type BiometricSetupResult,
  type BiometricVerifyResult,
} from "./biometric";

// SAST Scanner
export {
  // Scanner
  SASTScanner,
  createSASTScanner,
  createCISASTScanner,
  createFullSASTScanner,
  DEFAULT_SAST_RULES,
  // Utilities
  formatFinding,
  formatScanReport,
  groupFindingsBySeverity,
  groupFindingsByCategory,
  groupFindingsByFile,
  filterFindingsBySeverity,
  deduplicateFindings,
  shouldBlockDeployment as shouldBlockDeploymentSAST,
  getSeverityColor as getSASTSeverityColor,
  // Types
  type Severity,
  type VulnerabilityCategory,
  type SASTRule,
  type SASTFinding,
  type SASTScannerConfig,
  type SASTScanResult,
} from "./sast-scanner";

// Dependency Scanner (SCA)
export {
  // Scanner
  DependencyScanner,
  createDependencyScanner,
  createCIDependencyScanner,
  createStrictDependencyScanner,
  // License Lists
  DEFAULT_ALLOWED_LICENSES,
  DEFAULT_RESTRICTED_LICENSES,
  COPYLEFT_LICENSES,
  KNOWN_VULNERABILITIES,
  // Utilities
  formatVulnerability,
  formatLicenseFinding,
  formatDependencyScanReport,
  groupVulnerabilitiesBySeverity,
  groupVulnerabilitiesByPackage,
  shouldBlockDeployment as shouldBlockDeploymentSCA,
  getSeverityColor as getSCASeverityColor,
  getLicenseStatusColor,
  // Types
  type VulnerabilitySeverity,
  type PackageEcosystem,
  type DependencyVulnerability,
  type Dependency,
  type LicenseStatus,
  type LicenseFinding,
  type DependencyScannerConfig,
  type DependencyScanResult,
  type PackageJson,
  type PackageLock,
  type VulnerabilityDbEntry,
} from "./dependency-scanner";

// Vulnerability Tracker
export {
  // Tracker
  VulnerabilityTracker,
  createVulnerabilityTracker,
  createCIVulnerabilityTracker,
  createStrictVulnerabilityTracker,
  // Policy
  DEFAULT_REMEDIATION_POLICY,
  // Utilities
  formatTrackedVulnerability,
  formatVulnerabilityStats,
  generateRemediationReport,
  // Types
  type UnifiedSeverity,
  type VulnerabilitySource,
  type VulnerabilityStatus,
  type RemediationPriority,
  type TrackedVulnerability,
  type VulnerabilityHistoryEntry,
  type VulnerabilityAction,
  type VulnerabilityQuery,
  type VulnerabilityQueryResult,
  type VulnerabilityStats,
  type RemediationPolicy,
  type VulnerabilityTrackerConfig,
} from "./vulnerability-tracker";

// Transport Security
export {
  // TLS Configuration
  TLSVersion,
  DEFAULT_TLS_CONFIG,
  WEAK_CIPHER_SUITES,
  getTLSConfig,
  validateTLSVersion,
  isSecureCipher,
  filterSecureCiphers,
  getRecommendedCipherString,
  // HSTS
  DEFAULT_HSTS_CONFIG,
  HSTS_PRELOAD_MIN_AGE,
  generateHSTSHeader,
  validateHSTSPreload,
  parseHSTSHeader,
  // Secure Cookies
  DEFAULT_SECURE_COOKIE_CONFIG,
  SESSION_COOKIE_CONFIG,
  CSRF_COOKIE_CONFIG,
  getSecureCookieOptions,
  getPrefixedCookieName,
  validateCookieSecurity,
  createSecureSessionCookie,
  // Audit
  generateAuditId,
  auditTransportSecurity,
  // Logging
  logTransportSecurityEvent,
  createTransportSecurityEvent,
  // Fingerprinting
  generateTLSConfigHash,
  detectJA3Mismatch,
  // Constants
  TRANSPORT_SECURITY_CONSTANTS,
  // Types
  type TLSConfig,
  type HSTSConfig,
  type SecureCookieConfig,
  type TransportSecurityEvent,
  type TransportSecurityAudit,
  type TransportSecurityFinding,
} from "./transport-security";

// Certificate Pinning
export {
  // SPKI Hash Generation
  generateSPKIHash,
  generateSPKIHashFromPublicKey,
  generateChainSPKIHashes,
  // Pin Management
  createCertificatePin,
  isPinExpired,
  getValidPinsForDomain,
  matchDomain,
  validatePinSet,
  // Pin Validation
  validateCertificatePin,
  validateCertificateChain,
  // Platform Configurations
  generateIOSPinConfig,
  generateAndroidPinConfig,
  generateElectronPinConfig,
  generateTauriPinConfig,
  generateReactNativePinConfig,
  generateAllPlatformConfigs,
  // HTTP Headers
  generateExpectCTHeader,
  generateHPKPHeader,
  // Violation Reporting
  createPinViolationReport,
  logPinViolation,
  // Utilities
  extractCertificatesFromPEM,
  getCertificateInfo,
  isCertificateExpiringSoon,
  // Constants
  DEFAULT_PINNING_CONFIG,
  COMMON_CA_PINS,
  CERTIFICATE_PINNING_CONSTANTS,
  // Types
  type PinFormat,
  type PlatformType,
  type CertificatePin,
  type CertificatePinningConfig,
  type PinValidationResult,
  type PlatformPinConfig,
  type PinViolationReport,
} from "./certificate-pinning";

// Security Headers
export {
  // CSP
  DEFAULT_CSP_CONFIG,
  DEVELOPMENT_CSP_CONFIG,
  generateNonce,
  createNonceSource,
  buildCSPHeader,
  mergeCSPConfig,
  addCSPSources,
  validateCSPHeader,
  // Permissions Policy
  DEFAULT_PERMISSIONS_POLICY,
  CALLING_PERMISSIONS_POLICY,
  buildPermissionsPolicyHeader,
  mergePermissionsPolicyConfig,
  // CORS
  DEFAULT_CORS_CONFIG,
  buildCORSHeaders,
  // Report-To
  buildReportToHeader,
  // Complete Header Generation
  DEFAULT_SECURITY_HEADERS_CONFIG,
  generateSecurityHeaders,
  getStaticAssetHeaders,
  getAPISecurityHeaders,
  // Validation
  validateSecurityHeaders,
  // Configuration Helpers
  createSecurityHeadersConfig,
  createCallingSecurityConfig,
  // Constants
  SECURITY_HEADERS_CONSTANTS,
  // Types
  type CSPDirective,
  type CSPSource,
  type CSPConfig,
  type PermissionsPolicyFeature,
  type PermissionsPolicyAllowlist,
  type PermissionsPolicyConfig,
  type CORSConfig,
  type SecurityHeadersConfig,
  type ReportToConfig,
  type GeneratedSecurityHeaders,
} from "./security-headers";

// Session Wipe
export {
  // Manager
  SessionWipeManager,
  getSessionWipeManager,
  resetSessionWipeManager,
  initializeSessionWipeManager,
  createSessionWipeManager,
  // Config
  DEFAULT_WIPE_CONFIG,
  // Types
  type WipeType,
  type WipeState,
  type WipeResult,
  type WipeConfig,
  type WipeToken,
  type WipeEvidence,
  type KeyDestructionProof,
  type SessionWipeRequest,
  type DeviceWipeRequest,
  type RemoteWipeRequest,
  type WipeEventType,
  type WipeEvent,
  type WipeEventListener,
} from "./session-wipe";

// Panic Mode
export {
  // Manager
  PanicModeManager,
  getPanicModeManager,
  resetPanicModeManager,
  initializePanicModeManager,
  createPanicModeManager,
  // Config
  DEFAULT_PANIC_CONFIG,
  DEFAULT_DECOY_CONFIG,
  DEFAULT_DEAD_MAN_CONFIG,
  // Types
  type PanicState,
  type PanicActivationMethod,
  type PanicModeConfig,
  type DecoyConfig,
  type DeadManSwitchConfig,
  type PanicActivation,
  type PanicStatus,
  type DeadManStatus,
  type PanicEventType,
  type PanicEvent,
  type PanicEventListener,
} from "./panic-mode";
