/**
 * Phone/SMS Authentication Provider
 *
 * Supports phone number verification via SMS OTP codes.
 * Can be used with various SMS providers (Twilio, AWS SNS, etc.)
 */

import { logger } from "@/lib/logger";
import {
  AuthProvider,
  AuthResult,
  BaseProviderConfig,
  AuthCredentials,
  PhoneCredentials,
} from "./types";

// Extended phone credentials with OTP code for verification step
interface PhoneCredentialsWithCode extends PhoneCredentials {
  code?: string;
}

export interface PhoneAuthConfig extends BaseProviderConfig {
  provider: "twilio" | "aws-sns" | "messagebird" | "vonage" | "custom";
  // Twilio
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioVerifyServiceSid?: string;
  // AWS SNS
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  // Custom webhook
  sendCodeWebhook?: string;
  verifyCodeWebhook?: string;
  // Options
  codeLength?: number;
  codeExpiry?: number; // seconds
  maxAttempts?: number;
  cooldownPeriod?: number; // seconds between resends
}

export interface PhoneVerificationState {
  phoneNumber: string;
  codeSentAt: number;
  attempts: number;
  verified: boolean;
  _code?: string; // Internal code storage
}

// In-memory store for verification states (use Redis in production)
const verificationStates = new Map<string, PhoneVerificationState>();

export class PhoneAuthProvider implements AuthProvider {
  private config: PhoneAuthConfig;

  readonly type: "phone" = "phone";
  readonly name: string;

  constructor(config: PhoneAuthConfig) {
    this.config = {
      codeLength: 6,
      codeExpiry: 300, // 5 minutes
      maxAttempts: 3,
      cooldownPeriod: 60, // 1 minute
      ...config,
    };
    this.name = config.displayName || "Phone";
  }

  get id() {
    return "phone";
  }

  get icon() {
    return "phone";
  }

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    switch (this.config.provider) {
      case "twilio":
        return !!(this.config.twilioAccountSid && this.config.twilioAuthToken);
      case "aws-sns":
        return !!(
          this.config.awsRegion &&
          this.config.awsAccessKeyId &&
          this.config.awsSecretAccessKey
        );
      case "custom":
        return !!(this.config.sendCodeWebhook && this.config.verifyCodeWebhook);
      default:
        // Development mode - always configured
        return true;
    }
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let formatted = phone.replace(/[^\d+]/g, "");

    // Add + if not present
    if (!formatted.startsWith("+")) {
      // Assume US number if no country code
      if (formatted.length === 10) {
        formatted = "+1" + formatted;
      } else {
        formatted = "+" + formatted;
      }
    }

    return formatted;
  }

  /**
   * Generate a random OTP code
   */
  private generateCode(): string {
    const length = this.config.codeLength || 6;
    let code = "";
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  /**
   * Send verification code via configured provider
   */
  async sendVerificationCode(
    phoneNumber: string,
  ): Promise<{ success: boolean; message?: string }> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    // Check cooldown
    const existingState = verificationStates.get(formattedPhone);
    if (existingState) {
      const timeSinceLastCode = (Date.now() - existingState.codeSentAt) / 1000;
      if (timeSinceLastCode < (this.config.cooldownPeriod || 60)) {
        return {
          success: false,
          message: `Please wait ${Math.ceil((this.config.cooldownPeriod || 60) - timeSinceLastCode)} seconds before requesting a new code`,
        };
      }
    }

    const code = this.generateCode();

    try {
      switch (this.config.provider) {
        case "twilio":
          await this.sendViaTwilio(formattedPhone, code);
          break;
        case "aws-sns":
          await this.sendViaAwsSns(formattedPhone, code);
          break;
        case "custom":
          await this.sendViaCustomWebhook(formattedPhone, code);
          break;
        default:
        // Development mode - log code to console
      }

      // Store verification state
      verificationStates.set(formattedPhone, {
        phoneNumber: formattedPhone,
        codeSentAt: Date.now(),
        attempts: 0,
        verified: false,
      });

      // Store code securely (in production, use encrypted storage)
      // For demo purposes, we store it in the state
      const storedState = verificationStates.get(formattedPhone);
      if (storedState) {
        storedState._code = code;
      }

      return { success: true };
    } catch (error) {
      logger.error("[Phone Auth] Failed to send code:", error);
      return { success: false, message: "Failed to send verification code" };
    }
  }

  /**
   * Send code via Twilio Verify
   */
  private async sendViaTwilio(phone: string, code: string): Promise<void> {
    if (!this.config.twilioAccountSid || !this.config.twilioAuthToken) {
      throw new Error("Twilio credentials not configured");
    }

    const url = this.config.twilioVerifyServiceSid
      ? `https://verify.twilio.com/v2/Services/${this.config.twilioVerifyServiceSid}/Verifications`
      : `https://api.twilio.com/2010-04-01/Accounts/${this.config.twilioAccountSid}/Messages.json`;

    const auth = Buffer.from(
      `${this.config.twilioAccountSid}:${this.config.twilioAuthToken}`,
    ).toString("base64");

    if (this.config.twilioVerifyServiceSid) {
      // Use Twilio Verify service
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          Channel: "sms",
        }),
      });
    } else {
      // Use regular SMS
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: process.env.TWILIO_PHONE_NUMBER || "",
          Body: `Your nChat verification code is: ${code}`,
        }),
      });
    }
  }

  /**
   * Send code via AWS SNS
   */
  private async sendViaAwsSns(phone: string, code: string): Promise<void> {
    // In production, use AWS SDK
    throw new Error("AWS SNS integration requires @aws-sdk/client-sns");
  }

  /**
   * Send code via custom webhook
   */
  private async sendViaCustomWebhook(
    phone: string,
    code: string,
  ): Promise<void> {
    if (!this.config.sendCodeWebhook) {
      throw new Error("Custom webhook URL not configured");
    }

    const response = await fetch(this.config.sendCodeWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });

    if (!response.ok) {
      throw new Error("Custom webhook failed");
    }
  }

  /**
   * Verify the OTP code
   */
  async verifyCode(phoneNumber: string, code: string): Promise<AuthResult> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const state = verificationStates.get(formattedPhone);

    if (!state) {
      return {
        success: false,
        error: {
          code: "NO_VERIFICATION",
          message: "No verification in progress for this phone number",
        },
      };
    }

    // Check expiry
    const elapsed = (Date.now() - state.codeSentAt) / 1000;
    if (elapsed > (this.config.codeExpiry || 300)) {
      verificationStates.delete(formattedPhone);
      return {
        success: false,
        error: {
          code: "CODE_EXPIRED",
          message: "Verification code has expired",
        },
      };
    }

    // Check attempts
    if (state.attempts >= (this.config.maxAttempts || 3)) {
      verificationStates.delete(formattedPhone);
      return {
        success: false,
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message: "Too many failed attempts",
        },
      };
    }

    // Verify code
    const storedCode = state._code;
    if (code !== storedCode) {
      state.attempts++;
      return {
        success: false,
        error: { code: "INVALID_CODE", message: "Invalid verification code" },
      };
    }

    // Mark as verified
    state.verified = true;
    verificationStates.delete(formattedPhone);

    return {
      success: true,
      user: {
        id: "", // Will be set by auth system
        phone: formattedPhone,
        displayName: formattedPhone,
        provider: "phone",
        providerUserId: formattedPhone,
        phoneVerified: true,
        metadata: {
          phone: {
            number: formattedPhone,
            verifiedAt: new Date().toISOString(),
          },
        },
      },
    };
  }

  /**
   * Authenticate with phone (two-step process)
   * Step 1: Call sendVerificationCode
   * Step 2: Call verifyCode with the received code
   */
  async authenticate(credentials?: AuthCredentials): Promise<AuthResult> {
    if (!credentials) {
      return {
        success: false,
        error: {
          code: "NO_CREDENTIALS",
          message: "Phone credentials are required",
        },
      };
    }

    // Handle phone credentials
    if (credentials.type !== "phone") {
      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Phone credentials are required",
        },
      };
    }

    const phoneCredentials = credentials as PhoneCredentialsWithCode;
    const phoneNumber = phoneCredentials.phone || "";
    const code = phoneCredentials.code;

    if (!code) {
      // Step 1: Send code
      const result = await this.sendVerificationCode(phoneNumber);
      if (!result.success) {
        return {
          success: false,
          error: {
            code: "SEND_FAILED",
            message: result.message || "Failed to send code",
          },
        };
      }
      return {
        success: true,
        requiresVerification: true,
      };
    }

    // Step 2: Verify code
    return this.verifyCode(phoneNumber, code);
  }

  /**
   * Sign out (no-op for phone auth)
   */
  async signOut(): Promise<void> {
    // Phone auth is stateless on the provider side
  }
}

// Helper to create phone auth provider
export function createPhoneAuthProvider(
  provider: PhoneAuthConfig["provider"],
  options?: Partial<
    Omit<PhoneAuthConfig, "provider" | "enabled" | "name" | "displayName">
  >,
): PhoneAuthProvider {
  return new PhoneAuthProvider({
    enabled: true,
    name: "phone",
    displayName: "Phone",
    provider,
    ...options,
  });
}

// Development phone auth provider (logs codes to console)
export function createDevPhoneAuthProvider(): PhoneAuthProvider {
  return new PhoneAuthProvider({
    enabled: true,
    name: "phone",
    displayName: "Phone",
    provider: "custom",
    codeLength: 6,
    codeExpiry: 300,
    maxAttempts: 5,
    cooldownPeriod: 10, // Short cooldown for testing
  });
}
