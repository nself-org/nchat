/**
 * Phone/SMS Authentication Provider
 *
 * Phone number authentication via SMS:
 * - Send verification code via SMS
 * - Verify code to authenticate
 * - Support for multiple countries
 */

import { logger } from "@/lib/logger";
import {
  AuthProvider,
  AuthProviderMetadata,
  AuthProviderConfig,
  AuthCredentials,
  AuthResult,
  AuthUser,
  AuthError,
  PhoneCredentials,
  BaseAuthProvider,
} from "../auth-plugin.interface";

export interface PhoneSmsConfig extends AuthProviderConfig {
  authApiUrl?: string;
  defaultCountryCode?: string;
  codeLength?: number;
  codeExpirationMinutes?: number;
  maxAttempts?: number;
  allowedCountries?: string[];
  blockedCountries?: string[];
}

export class PhoneSmsProvider extends BaseAuthProvider {
  readonly metadata: AuthProviderMetadata = {
    id: "phone-sms",
    name: "Phone (SMS)",
    type: "phone",
    icon: "phone",
    description: "Sign in with your phone number via SMS",
    requiresBackend: true,
    supportedFeatures: {
      signIn: true,
      signUp: true,
      signOut: true,
      tokenRefresh: true,
      passwordReset: false,
      emailVerification: false,
      phoneVerification: true,
      mfa: true,
      linkAccount: true,
    },
  };

  private extendedConfig: PhoneSmsConfig = {
    enabled: false,
    defaultCountryCode: "+1",
    codeLength: 6,
    codeExpirationMinutes: 10,
    maxAttempts: 3,
  };

  private pendingVerification: {
    phoneNumber: string;
    countryCode: string;
    expiresAt: number;
    attempts: number;
  } | null = null;

  async initialize(config: AuthProviderConfig): Promise<void> {
    await super.initialize(config);
    this.extendedConfig = { ...this.extendedConfig, ...config };
    await this.loadSession();
  }

  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    if (!this.isEnabled()) {
      return this.createErrorResult(
        this.createError(
          "PROVIDER_DISABLED",
          "Phone/SMS authentication is not enabled",
        ),
      );
    }

    const phoneCreds = credentials as PhoneCredentials;

    // If we have a verification code, verify it
    if (phoneCreds.verificationCode) {
      return this.verifyCode(
        phoneCreds.phoneNumber,
        phoneCreds.countryCode,
        phoneCreds.verificationCode,
      );
    }

    // Otherwise, send a verification code
    const result = await this.sendVerificationCode(
      phoneCreds.phoneNumber,
      phoneCreds.countryCode,
    );
    if (result.success) {
      return {
        success: true,
        // User needs to verify the code
      };
    }

    return this.createErrorResult(result.error!);
  }

  async signUp(
    credentials: AuthCredentials,
    metadata?: Record<string, unknown>,
  ): Promise<AuthResult> {
    // For phone auth, signUp is the same as signIn
    return this.signIn(credentials);
  }

  async sendVerificationCode(
    phoneNumber: string,
    countryCode: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: this.createError(
          "PROVIDER_DISABLED",
          "Phone/SMS authentication is not enabled",
        ),
      };
    }

    const formattedPhone = this.formatPhoneNumber(phoneNumber, countryCode);
    if (!this.validatePhoneNumber(formattedPhone)) {
      return {
        success: false,
        error: this.createError(
          "INVALID_PHONE",
          "Please enter a valid phone number",
        ),
      };
    }

    if (!this.isCountryAllowed(countryCode)) {
      return {
        success: false,
        error: this.createError(
          "COUNTRY_NOT_ALLOWED",
          "Phone authentication is not available in your country",
        ),
      };
    }

    try {
      const response = await fetch(`${this.getAuthApiUrl()}/signin/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          options: {
            locale:
              typeof navigator !== "undefined" ? navigator.language : "en",
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: this.createError(
            "SEND_FAILED",
            data.error?.message || "Failed to send verification code",
          ),
        };
      }

      // Store pending verification
      this.pendingVerification = {
        phoneNumber,
        countryCode,
        expiresAt:
          Date.now() +
          (this.extendedConfig.codeExpirationMinutes || 10) * 60 * 1000,
        attempts: 0,
      };
      this.persistPendingVerification();

      return { success: true };
    } catch (error) {
      logger.error("SMS send error:", error);
      return {
        success: false,
        error: this.createError(
          "NETWORK_ERROR",
          "Failed to send verification code",
        ),
      };
    }
  }

  async signOut(): Promise<void> {
    try {
      await fetch(`${this.getAuthApiUrl()}/signout`, {
        method: "POST",
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      logger.error("Sign out error:", error);
    }

    this.pendingVerification = null;
    this.clearPendingVerification();
    this.clearSession();
    await super.signOut();
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.getAuthApiUrl()}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.clearSession();
        return this.createErrorResult(
          this.createError("TOKEN_REFRESH_FAILED", "Failed to refresh token"),
        );
      }

      this.persistSession(data.session);

      this.emitEvent({
        type: "tokenRefresh",
        timestamp: Date.now(),
      });

      return this.createSuccessResult(
        this.currentUser!,
        data.session.accessToken,
        data.session.refreshToken,
      );
    } catch (error) {
      logger.error("Token refresh error:", error);
      return this.createErrorResult(
        this.createError("NETWORK_ERROR", "Failed to refresh token"),
      );
    }
  }

  async linkAccount(existingUserId: string): Promise<AuthResult> {
    return this.createErrorResult(
      this.createError(
        "NOT_IMPLEMENTED",
        "Phone account linking not yet implemented",
      ),
    );
  }

  private async verifyCode(
    phoneNumber: string,
    countryCode: string,
    code: string,
  ): Promise<AuthResult> {
    // Check if we have a pending verification
    this.loadPendingVerification();

    if (!this.pendingVerification) {
      return this.createErrorResult(
        this.createError(
          "NO_PENDING_VERIFICATION",
          "No verification code was sent. Please request a new code.",
        ),
      );
    }

    // Check expiration
    if (Date.now() > this.pendingVerification.expiresAt) {
      this.clearPendingVerification();
      return this.createErrorResult(
        this.createError(
          "CODE_EXPIRED",
          "Verification code has expired. Please request a new code.",
        ),
      );
    }

    // Check attempts
    if (
      this.pendingVerification.attempts >=
      (this.extendedConfig.maxAttempts || 3)
    ) {
      this.clearPendingVerification();
      return this.createErrorResult(
        this.createError(
          "MAX_ATTEMPTS",
          "Too many failed attempts. Please request a new code.",
        ),
      );
    }

    const formattedPhone = this.formatPhoneNumber(phoneNumber, countryCode);

    try {
      const response = await fetch(
        `${this.getAuthApiUrl()}/signin/sms/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: formattedPhone,
            code,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        // Increment attempts
        this.pendingVerification.attempts++;
        this.persistPendingVerification();

        return this.createErrorResult(
          this.createError(
            "VERIFICATION_FAILED",
            data.error?.message || "Invalid verification code",
          ),
        );
      }

      const user = this.mapUserResponse(data.user, formattedPhone);
      this.currentUser = user;
      this.authenticated = true;
      this.pendingVerification = null;
      this.clearPendingVerification();
      this.persistSession(data.session);

      this.emitEvent({
        type: "signIn",
        user,
        timestamp: Date.now(),
      });

      this.emitEvent({
        type: "phoneVerified",
        user,
        timestamp: Date.now(),
      });

      return this.createSuccessResult(
        user,
        data.session.accessToken,
        data.session.refreshToken,
      );
    } catch (error) {
      logger.error("Code verification error:", error);
      return this.createErrorResult(
        this.createError("NETWORK_ERROR", "Failed to verify code"),
      );
    }
  }

  private formatPhoneNumber(phoneNumber: string, countryCode: string): string {
    // Remove all non-digit characters from phone number
    const digits = phoneNumber.replace(/\D/g, "");
    // Ensure country code starts with +
    const code = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
    return `${code}${digits}`;
  }

  private validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    return e164Regex.test(phoneNumber);
  }

  private isCountryAllowed(countryCode: string): boolean {
    const code = countryCode.replace("+", "");

    if (this.extendedConfig.blockedCountries?.includes(code)) {
      return false;
    }

    if (
      this.extendedConfig.allowedCountries &&
      this.extendedConfig.allowedCountries.length > 0
    ) {
      return this.extendedConfig.allowedCountries.includes(code);
    }

    return true;
  }

  private getAuthApiUrl(): string {
    return (
      this.extendedConfig.authApiUrl ||
      process.env.NEXT_PUBLIC_AUTH_URL ||
      "http://localhost:4000/v1"
    );
  }

  private getAuthHeaders(): Record<string, string> {
    const session = this.getStoredSession();
    return {
      "Content-Type": "application/json",
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
    };
  }

  private mapUserResponse(
    userData: Record<string, unknown>,
    phoneNumber: string,
  ): AuthUser {
    return {
      id: userData.id as string,
      email:
        (userData.email as string) ||
        `${phoneNumber.replace("+", "")}@phone.placeholder`,
      username: (userData.displayName as string) || phoneNumber.slice(-4),
      displayName:
        (userData.displayName as string) || `User ${phoneNumber.slice(-4)}`,
      avatarUrl: userData.avatarUrl as string | undefined,
      role: (userData.defaultRole as AuthUser["role"]) || "member",
      emailVerified: false,
      phoneNumber,
      phoneVerified: true,
      metadata: {
        ...((userData.metadata as Record<string, unknown>) || {}),
        provider: "phone-sms",
      },
      createdAt: userData.createdAt as string,
      lastLoginAt: new Date().toISOString(),
    };
  }

  private persistSession(session: {
    accessToken: string;
    refreshToken: string;
  }): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "nchat-phone-session",
      JSON.stringify({
        ...session,
        timestamp: Date.now(),
      }),
    );
  }

  private getStoredSession(): {
    accessToken: string;
    refreshToken: string;
  } | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("nchat-phone-session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("nchat-phone-session");
  }

  private persistPendingVerification(): void {
    if (typeof window === "undefined" || !this.pendingVerification) return;
    sessionStorage.setItem(
      "nchat-phone-pending",
      JSON.stringify(this.pendingVerification),
    );
  }

  private loadPendingVerification(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = sessionStorage.getItem("nchat-phone-pending");
      this.pendingVerification = stored ? JSON.parse(stored) : null;
    } catch {
      this.pendingVerification = null;
    }
  }

  private clearPendingVerification(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem("nchat-phone-pending");
    this.pendingVerification = null;
  }

  private async loadSession(): Promise<void> {
    const session = this.getStoredSession();
    if (session?.refreshToken) {
      const result = await this.refreshToken(session.refreshToken);
      if (result.success && result.user) {
        this.currentUser = result.user;
        this.authenticated = true;
      }
    }
  }
}

export default PhoneSmsProvider;
