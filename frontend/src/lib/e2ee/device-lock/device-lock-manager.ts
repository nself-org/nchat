/**
 * Device Lock Manager
 * Manages PIN/biometric authentication for E2EE access
 */

import type { ApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";
import { hash, verify } from "@node-rs/argon2";
import { randomBytes, createHash } from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface DeviceLockPolicy {
  type: "pin" | "biometric" | "pin_biometric" | "none";
  pinLength?: 4 | 6 | 8;
  biometricFallbackAllowed: boolean;
  requirePinInterval: "never" | "daily" | "weekly";
  timeoutMinutes: number;
  wipeAfterFailedAttempts: number;
}

export interface DeviceLockSession {
  token: string;
  expiresAt: Date;
  method: "pin" | "biometric" | "cached";
}

export interface DeviceLockStatus {
  configured: boolean;
  policyType: string;
  isLocked: boolean;
  failedAttempts: number;
  remainingAttempts: number;
  lockedUntil?: Date;
}

export interface VerificationResult {
  success: boolean;
  session?: DeviceLockSession;
  error?: string;
  remainingAttempts?: number;
  shouldWipe?: boolean;
}

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

const GET_DEVICE_LOCK_POLICY = gql`
  query GetDeviceLockPolicy($userId: uuid!, $deviceId: String!) {
    nchat_device_lock_policies(
      where: { user_id: { _eq: $userId }, device_id: { _eq: $deviceId } }
    ) {
      id
      policy_type
      pin_length
      require_pin_interval
      last_pin_verified_at
      biometric_enabled
      biometric_fallback_allowed
      timeout_minutes
      failed_attempts
      wipe_after_failed_attempts
      is_locked
      locked_until
      locked_reason
    }
  }
`;

const CREATE_DEVICE_LOCK_POLICY = gql`
  mutation CreateDeviceLockPolicy(
    $object: nchat_device_lock_policies_insert_input!
  ) {
    insert_nchat_device_lock_policies_one(object: $object) {
      id
      policy_type
    }
  }
`;

const UPDATE_DEVICE_LOCK_POLICY = gql`
  mutation UpdateDeviceLockPolicy(
    $userId: uuid!
    $deviceId: String!
    $updates: nchat_device_lock_policies_set_input!
  ) {
    update_nchat_device_lock_policies(
      where: { user_id: { _eq: $userId }, device_id: { _eq: $deviceId } }
      _set: $updates
    ) {
      affected_rows
    }
  }
`;

const CREATE_DEVICE_LOCK_SESSION = gql`
  mutation CreateDeviceLockSession(
    $object: nchat_device_lock_sessions_insert_input!
  ) {
    insert_nchat_device_lock_sessions_one(object: $object) {
      id
      expires_at
    }
  }
`;

const VERIFY_DEVICE_LOCK_SESSION = gql`
  query VerifyDeviceLockSession(
    $userId: uuid!
    $deviceId: String!
    $sessionTokenHash: bytea!
  ) {
    verify_device_lock_session(
      args: {
        p_user_id: $userId
        p_device_id: $deviceId
        p_session_token_hash: $sessionTokenHash
      }
    )
  }
`;

const RECORD_FAILED_VERIFICATION = gql`
  query RecordFailedVerification(
    $userId: uuid!
    $deviceId: String!
    $verificationMethod: String!
  ) {
    record_failed_verification(
      args: {
        p_user_id: $userId
        p_device_id: $deviceId
        p_verification_method: $verificationMethod
      }
    )
  }
`;

const RESET_FAILED_VERIFICATION = gql`
  query ResetFailedVerification(
    $userId: uuid!
    $deviceId: String!
    $verificationMethod: String!
  ) {
    reset_failed_verification(
      args: {
        p_user_id: $userId
        p_device_id: $deviceId
        p_verification_method: $verificationMethod
      }
    )
  }
`;

const IS_PIN_VERIFICATION_REQUIRED = gql`
  query IsPinVerificationRequired($userId: uuid!, $deviceId: String!) {
    is_pin_verification_required(
      args: { p_user_id: $userId, p_device_id: $deviceId }
    )
  }
`;

// ============================================================================
// DEVICE LOCK MANAGER CLASS
// ============================================================================

export class DeviceLockManager {
  private apolloClient: ApolloClient<any>;
  private userId: string;
  private deviceId: string;
  private policy: DeviceLockPolicy | null = null;
  private currentSession: DeviceLockSession | null = null;

  constructor(
    apolloClient: ApolloClient<any>,
    userId: string,
    deviceId: string,
  ) {
    this.apolloClient = apolloClient;
    this.userId = userId;
    this.deviceId = deviceId;
  }

  // ==========================================================================
  // POLICY CONFIGURATION
  // ==========================================================================

  /**
   * Configure device lock policy
   */
  async configure(policy: DeviceLockPolicy, pin?: string): Promise<void> {
    // Validate policy
    this.validatePolicy(policy);

    // If PIN policy, validate and hash PIN
    let pinHash: Buffer | undefined;
    let pinSalt: Buffer | undefined;

    if (policy.type === "pin" || policy.type === "pin_biometric") {
      if (!pin) {
        throw new Error("PIN required for this policy type");
      }

      this.validatePin(pin, policy.pinLength || 6);

      // Generate salt and hash PIN with Argon2
      pinSalt = randomBytes(32);
      pinHash = await this.hashPin(pin, pinSalt);
    }

    // If biometric, verify biometric capability (platform-specific)
    if (policy.type === "biometric" || policy.type === "pin_biometric") {
      const biometricAvailable = await this.checkBiometricAvailability();
      if (!biometricAvailable && !policy.biometricFallbackAllowed) {
        throw new Error("Biometric not available on this device");
      }
    }

    // Create or update policy in database
    const { data: existingPolicy } = await this.apolloClient.query({
      query: GET_DEVICE_LOCK_POLICY,
      variables: { userId: this.userId, deviceId: this.deviceId },
      fetchPolicy: "network-only",
    });

    if (existingPolicy.nchat_device_lock_policies.length > 0) {
      // Update existing policy
      await this.apolloClient.mutate({
        mutation: UPDATE_DEVICE_LOCK_POLICY,
        variables: {
          userId: this.userId,
          deviceId: this.deviceId,
          updates: {
            policy_type: policy.type,
            pin_hash: pinHash,
            pin_salt: pinSalt,
            pin_length: policy.pinLength,
            require_pin_interval: policy.requirePinInterval,
            biometric_enabled:
              policy.type === "biometric" || policy.type === "pin_biometric",
            biometric_fallback_allowed: policy.biometricFallbackAllowed,
            timeout_minutes: policy.timeoutMinutes,
            wipe_after_failed_attempts: policy.wipeAfterFailedAttempts,
            updated_at: new Date().toISOString(),
          },
        },
      });
    } else {
      // Create new policy
      await this.apolloClient.mutate({
        mutation: CREATE_DEVICE_LOCK_POLICY,
        variables: {
          object: {
            user_id: this.userId,
            device_id: this.deviceId,
            policy_type: policy.type,
            pin_hash: pinHash,
            pin_salt: pinSalt,
            pin_length: policy.pinLength,
            require_pin_interval: policy.requirePinInterval,
            biometric_enabled:
              policy.type === "biometric" || policy.type === "pin_biometric",
            biometric_fallback_allowed: policy.biometricFallbackAllowed,
            timeout_minutes: policy.timeoutMinutes,
            wipe_after_failed_attempts: policy.wipeAfterFailedAttempts,
          },
        },
      });
    }

    this.policy = policy;
  }

  /**
   * Get current device lock status
   */
  async getStatus(): Promise<DeviceLockStatus> {
    const { data } = await this.apolloClient.query({
      query: GET_DEVICE_LOCK_POLICY,
      variables: { userId: this.userId, deviceId: this.deviceId },
      fetchPolicy: "network-only",
    });

    const policyData = data.nchat_device_lock_policies[0];

    if (!policyData) {
      return {
        configured: false,
        policyType: "none",
        isLocked: false,
        failedAttempts: 0,
        remainingAttempts: 0,
      };
    }

    return {
      configured: true,
      policyType: policyData.policy_type,
      isLocked: policyData.is_locked,
      failedAttempts: policyData.failed_attempts,
      remainingAttempts:
        policyData.wipe_after_failed_attempts - policyData.failed_attempts,
      lockedUntil: policyData.locked_until
        ? new Date(policyData.locked_until)
        : undefined,
    };
  }

  // ==========================================================================
  // VERIFICATION
  // ==========================================================================

  /**
   * Verify device lock (PIN or biometric)
   */
  async verify(
    type: "pin" | "biometric",
    credential?: string,
  ): Promise<VerificationResult> {
    // Load policy
    const { data } = await this.apolloClient.query({
      query: GET_DEVICE_LOCK_POLICY,
      variables: { userId: this.userId, deviceId: this.deviceId },
      fetchPolicy: "network-only",
    });

    const policyData = data.nchat_device_lock_policies[0];

    if (!policyData) {
      return { success: false, error: "No device lock policy configured" };
    }

    // Check if locked
    if (policyData.is_locked) {
      const lockedUntil = policyData.locked_until
        ? new Date(policyData.locked_until)
        : null;
      if (!lockedUntil || new Date() < lockedUntil) {
        return {
          success: false,
          error:
            policyData.locked_reason === "failed_attempts"
              ? "Device locked due to too many failed attempts"
              : "Device is locked",
        };
      }
    }

    // Check if PIN verification is required
    const { data: pinRequiredData } = await this.apolloClient.query({
      query: IS_PIN_VERIFICATION_REQUIRED,
      variables: { userId: this.userId, deviceId: this.deviceId },
    });

    const pinRequired = pinRequiredData.is_pin_verification_required;

    if (type === "biometric" && pinRequired) {
      return {
        success: false,
        error: "PIN verification required before biometric",
      };
    }

    // Verify credential
    let verified = false;

    if (type === "pin") {
      if (!credential) {
        return { success: false, error: "PIN is required" };
      }
      verified = await this.verifyPin(
        credential,
        policyData.pin_hash,
        policyData.pin_salt,
      );
    } else if (type === "biometric") {
      verified = await this.verifyBiometric();
    }

    // Handle verification result
    if (!verified) {
      // Record failed attempt
      const { data: failureData } = await this.apolloClient.query({
        query: RECORD_FAILED_VERIFICATION,
        variables: {
          userId: this.userId,
          deviceId: this.deviceId,
          verificationMethod: type,
        },
      });

      const failureResult = failureData.record_failed_verification;

      return {
        success: false,
        error: `Invalid ${type}`,
        remainingAttempts: failureResult.remaining_attempts,
        shouldWipe: failureResult.should_wipe,
      };
    }

    // Reset failed attempts
    await this.apolloClient.query({
      query: RESET_FAILED_VERIFICATION,
      variables: {
        userId: this.userId,
        deviceId: this.deviceId,
        verificationMethod: type,
      },
    });

    // Create session
    const session = await this.createSession(type, policyData.timeout_minutes);

    return {
      success: true,
      session,
    };
  }

  /**
   * Check if current session is valid
   */
  async hasValidSession(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    if (new Date() >= this.currentSession.expiresAt) {
      this.currentSession = null;
      return false;
    }

    // Verify with server
    const sessionTokenHash = this.hashToken(this.currentSession.token);

    try {
      const { data } = await this.apolloClient.query({
        query: VERIFY_DEVICE_LOCK_SESSION,
        variables: {
          userId: this.userId,
          deviceId: this.deviceId,
          sessionTokenHash,
        },
        fetchPolicy: "network-only",
      });

      return data.verify_device_lock_session === true;
    } catch {
      this.currentSession = null;
      return false;
    }
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private validatePolicy(policy: DeviceLockPolicy): void {
    const validTypes = ["pin", "biometric", "pin_biometric", "none"];
    if (!validTypes.includes(policy.type)) {
      throw new Error(`Invalid policy type: ${policy.type}`);
    }

    if (policy.type === "pin" || policy.type === "pin_biometric") {
      const validLengths = [4, 6, 8];
      if (policy.pinLength && !validLengths.includes(policy.pinLength)) {
        throw new Error(`Invalid PIN length: ${policy.pinLength}`);
      }
    }

    const validIntervals = ["never", "daily", "weekly"];
    if (!validIntervals.includes(policy.requirePinInterval)) {
      throw new Error(
        `Invalid require PIN interval: ${policy.requirePinInterval}`,
      );
    }

    if (policy.timeoutMinutes < 1 || policy.timeoutMinutes > 1440) {
      throw new Error("Timeout must be between 1 and 1440 minutes");
    }

    if (
      policy.wipeAfterFailedAttempts < 3 ||
      policy.wipeAfterFailedAttempts > 20
    ) {
      throw new Error("Wipe threshold must be between 3 and 20 attempts");
    }
  }

  private validatePin(pin: string, expectedLength: number): void {
    if (pin.length !== expectedLength) {
      throw new Error(`PIN must be exactly ${expectedLength} digits`);
    }

    if (!/^\d+$/.test(pin)) {
      throw new Error("PIN must contain only digits");
    }

    // Check for weak PINs
    const weakPins = [
      "0000",
      "1111",
      "2222",
      "3333",
      "4444",
      "5555",
      "6666",
      "7777",
      "8888",
      "9999",
      "1234",
      "4321",
      "0123",
      "6789",
      "000000",
      "111111",
      "123456",
      "654321",
      "00000000",
      "11111111",
      "12345678",
      "87654321",
    ];

    if (weakPins.includes(pin)) {
      throw new Error("PIN is too weak. Please choose a different PIN.");
    }
  }

  private async hashPin(pin: string, salt: Buffer): Promise<Buffer> {
    // Use Argon2id for PIN hashing (secure against side-channel attacks)
    const hashString = await hash(pin, {
      salt,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
      algorithm: 0, // Argon2id
    });

    return Buffer.from(hashString);
  }

  private async verifyPin(
    pin: string,
    hashBuffer: Buffer,
    salt: Buffer,
  ): Promise<boolean> {
    try {
      const computedHash = await this.hashPin(pin, salt);
      return computedHash.equals(hashBuffer);
    } catch {
      return false;
    }
  }

  private async verifyBiometric(): Promise<boolean> {
    // Platform-specific biometric verification
    // This would use Capacitor plugins on mobile
    // For now, return true for development
    if (typeof window === "undefined") {
      return false;
    }

    // Check if running in Capacitor/native environment
    if ("Capacitor" in window) {
      // Use Capacitor biometric plugin
      try {
        const { BiometricAuth } =
          await import("@aparajita/capacitor-biometric-auth");
        await BiometricAuth.authenticate({
          reason: "Verify identity to access encrypted messages",
          cancelTitle: "Cancel",
          allowDeviceCredential: true,
        });
        return true;
      } catch {
        return false;
      }
    }

    // Web: Use WebAuthn if available
    if (window.PublicKeyCredential) {
      try {
        return await this.performWebAuthn();
      } catch {
        return false;
      }
    }

    return false;
  }

  private async performWebAuthn(): Promise<boolean> {
    // WebAuthn implementation for web browsers
    // This is a placeholder - full implementation would require
    // registration and authentication flows
    return false;
  }

  private async checkBiometricAvailability(): Promise<boolean> {
    if (typeof window === "undefined") {
      return false;
    }

    // Check Capacitor
    if ("Capacitor" in window) {
      try {
        const { BiometricAuth } =
          await import("@aparajita/capacitor-biometric-auth");
        const result = await BiometricAuth.checkBiometry();
        return result.isAvailable;
      } catch {
        return false;
      }
    }

    // Check WebAuthn
    if (window.PublicKeyCredential) {
      try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        return false;
      }
    }

    return false;
  }

  private async createSession(
    method: "pin" | "biometric",
    timeoutMinutes: number,
  ): Promise<DeviceLockSession> {
    // Generate random session token
    const token = randomBytes(32).toString("hex");
    const sessionTokenHash = this.hashToken(token);

    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    // Store session in database
    await this.apolloClient.mutate({
      mutation: CREATE_DEVICE_LOCK_SESSION,
      variables: {
        object: {
          user_id: this.userId,
          device_id: this.deviceId,
          session_token_hash: sessionTokenHash,
          verification_method: method,
          expires_at: expiresAt.toISOString(),
        },
      },
    });

    const session: DeviceLockSession = {
      token,
      expiresAt,
      method,
    };

    this.currentSession = session;

    // Store in memory for quick access
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        `device_lock_session_${this.deviceId}`,
        JSON.stringify({
          token,
          expiresAt: expiresAt.toISOString(),
          method,
        }),
      );
    }

    return session;
  }

  private hashToken(token: string): Buffer {
    return createHash("sha256").update(token).digest();
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.currentSession = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`device_lock_session_${this.deviceId}`);
    }
  }
}

export default DeviceLockManager;
