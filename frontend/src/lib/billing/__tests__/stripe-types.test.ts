/**
 * Tests for Stripe Payment Types
 *
 * @module @/lib/billing/__tests__/stripe-types.test
 */

import {
  STRIPE_API_VERSION,
  DEFAULT_WEBHOOK_CONFIG,
  StripePaymentError,
  StripeErrorCode,
} from "../stripe-types";

describe("Stripe Types", () => {
  describe("STRIPE_API_VERSION", () => {
    it("should be a valid Stripe API version string", () => {
      expect(STRIPE_API_VERSION).toBeDefined();
      expect(typeof STRIPE_API_VERSION).toBe("string");
      expect(STRIPE_API_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });

  describe("DEFAULT_WEBHOOK_CONFIG", () => {
    it("should have required fields", () => {
      expect(DEFAULT_WEBHOOK_CONFIG).toBeDefined();
      expect(DEFAULT_WEBHOOK_CONFIG.replayProtectionTTL).toBeDefined();
      expect(DEFAULT_WEBHOOK_CONFIG.maxEventAge).toBeDefined();
      expect(DEFAULT_WEBHOOK_CONFIG.maxRetries).toBeDefined();
      expect(DEFAULT_WEBHOOK_CONFIG.verifySignature).toBeDefined();
    });

    it("should have reasonable default values", () => {
      // Replay protection TTL should be positive (24 hours in ms)
      expect(DEFAULT_WEBHOOK_CONFIG.replayProtectionTTL).toBeGreaterThan(0);
      expect(DEFAULT_WEBHOOK_CONFIG.replayProtectionTTL).toBe(
        24 * 60 * 60 * 1000,
      );

      // Max event age should be positive (5 minutes in seconds)
      expect(DEFAULT_WEBHOOK_CONFIG.maxEventAge).toBeGreaterThan(0);
      expect(DEFAULT_WEBHOOK_CONFIG.maxEventAge).toBe(300);

      // Max retries should be reasonable
      expect(DEFAULT_WEBHOOK_CONFIG.maxRetries).toBeGreaterThan(0);
      expect(DEFAULT_WEBHOOK_CONFIG.maxRetries).toBeLessThanOrEqual(10);

      // Signature verification should be enabled by default
      expect(DEFAULT_WEBHOOK_CONFIG.verifySignature).toBe(true);
    });
  });

  describe("StripePaymentError", () => {
    it("should create error with code and message", () => {
      const error = new StripePaymentError(
        StripeErrorCode.CARD_DECLINED,
        "Your card was declined",
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StripePaymentError);
      expect(error.code).toBe(StripeErrorCode.CARD_DECLINED);
      expect(error.message).toBe("Your card was declined");
      expect(error.name).toBe("StripePaymentError");
    });

    it("should create error with stripe error and metadata", () => {
      const stripeErr = { type: "card_error", code: "card_declined" };
      const metadata = { customerId: "cus_123" };

      const error = new StripePaymentError(
        StripeErrorCode.CARD_DECLINED,
        "Your card was declined",
        stripeErr,
        metadata,
      );

      expect(error.stripeError).toBe(stripeErr);
      expect(error.metadata).toBe(metadata);
    });

    describe("isRetryable", () => {
      it("should return true for rate limit errors", () => {
        const error = new StripePaymentError(
          StripeErrorCode.RATE_LIMIT_EXCEEDED,
          "Rate limit exceeded",
        );
        expect(error.isRetryable()).toBe(true);
      });

      it("should return true for connection errors", () => {
        const error = new StripePaymentError(
          StripeErrorCode.API_CONNECTION_ERROR,
          "Connection failed",
        );
        expect(error.isRetryable()).toBe(true);
      });

      it("should return false for card declined errors", () => {
        const error = new StripePaymentError(
          StripeErrorCode.CARD_DECLINED,
          "Card declined",
        );
        expect(error.isRetryable()).toBe(false);
      });

      it("should return false for authentication errors", () => {
        const error = new StripePaymentError(
          StripeErrorCode.AUTHENTICATION_FAILED,
          "Invalid API key",
        );
        expect(error.isRetryable()).toBe(false);
      });
    });

    describe("isCardError", () => {
      it("should return true for card declined", () => {
        const error = new StripePaymentError(
          StripeErrorCode.CARD_DECLINED,
          "Card declined",
        );
        expect(error.isCardError()).toBe(true);
      });

      it("should return true for card expired", () => {
        const error = new StripePaymentError(
          StripeErrorCode.CARD_EXPIRED,
          "Card expired",
        );
        expect(error.isCardError()).toBe(true);
      });

      it("should return true for incorrect CVC", () => {
        const error = new StripePaymentError(
          StripeErrorCode.INCORRECT_CVC,
          "Incorrect CVC",
        );
        expect(error.isCardError()).toBe(true);
      });

      it("should return true for incorrect number", () => {
        const error = new StripePaymentError(
          StripeErrorCode.INCORRECT_NUMBER,
          "Incorrect number",
        );
        expect(error.isCardError()).toBe(true);
      });

      it("should return true for insufficient funds", () => {
        const error = new StripePaymentError(
          StripeErrorCode.INSUFFICIENT_FUNDS,
          "Insufficient funds",
        );
        expect(error.isCardError()).toBe(true);
      });

      it("should return false for non-card errors", () => {
        const error = new StripePaymentError(
          StripeErrorCode.INVOICE_NOT_FOUND,
          "Invoice not found",
        );
        expect(error.isCardError()).toBe(false);
      });
    });

    describe("toJSON", () => {
      it("should serialize error to JSON", () => {
        const error = new StripePaymentError(
          StripeErrorCode.PAYMENT_FAILED,
          "Payment failed",
          undefined,
          { invoiceId: "inv_123" },
        );

        const json = error.toJSON();

        expect(json).toEqual({
          name: "StripePaymentError",
          code: StripeErrorCode.PAYMENT_FAILED,
          message: "Payment failed",
          metadata: { invoiceId: "inv_123" },
        });
      });
    });
  });

  describe("StripeErrorCode", () => {
    it("should have all expected generic error codes", () => {
      expect(StripeErrorCode.UNKNOWN_ERROR).toBeDefined();
      expect(StripeErrorCode.INVALID_REQUEST).toBeDefined();
      expect(StripeErrorCode.AUTHENTICATION_FAILED).toBeDefined();
      expect(StripeErrorCode.RATE_LIMIT_EXCEEDED).toBeDefined();
      expect(StripeErrorCode.API_CONNECTION_ERROR).toBeDefined();
    });

    it("should have all expected payment error codes", () => {
      expect(StripeErrorCode.CARD_DECLINED).toBeDefined();
      expect(StripeErrorCode.CARD_EXPIRED).toBeDefined();
      expect(StripeErrorCode.INCORRECT_CVC).toBeDefined();
      expect(StripeErrorCode.INCORRECT_NUMBER).toBeDefined();
      expect(StripeErrorCode.INSUFFICIENT_FUNDS).toBeDefined();
      expect(StripeErrorCode.PAYMENT_FAILED).toBeDefined();
      expect(StripeErrorCode.PAYMENT_METHOD_NOT_AVAILABLE).toBeDefined();
    });

    it("should have all expected subscription error codes", () => {
      expect(StripeErrorCode.SUBSCRIPTION_NOT_FOUND).toBeDefined();
      expect(StripeErrorCode.SUBSCRIPTION_INACTIVE).toBeDefined();
      expect(StripeErrorCode.SUBSCRIPTION_ALREADY_CANCELED).toBeDefined();
      expect(StripeErrorCode.SUBSCRIPTION_PAST_DUE).toBeDefined();
    });

    it("should have all expected invoice error codes", () => {
      expect(StripeErrorCode.INVOICE_NOT_FOUND).toBeDefined();
      expect(StripeErrorCode.INVOICE_ALREADY_PAID).toBeDefined();
      expect(StripeErrorCode.INVOICE_NOT_OPEN).toBeDefined();
      expect(StripeErrorCode.INVOICE_FINALIZATION_FAILED).toBeDefined();
    });

    it("should have all expected refund error codes", () => {
      expect(StripeErrorCode.REFUND_FAILED).toBeDefined();
      expect(StripeErrorCode.CHARGE_ALREADY_REFUNDED).toBeDefined();
      expect(StripeErrorCode.CHARGE_NOT_FOUND).toBeDefined();
      expect(StripeErrorCode.REFUND_AMOUNT_EXCEEDS_CHARGE).toBeDefined();
    });

    it("should have all expected webhook error codes", () => {
      expect(StripeErrorCode.WEBHOOK_SIGNATURE_INVALID).toBeDefined();
      expect(StripeErrorCode.WEBHOOK_EVENT_EXPIRED).toBeDefined();
      expect(StripeErrorCode.WEBHOOK_DUPLICATE_EVENT).toBeDefined();
    });

    it("should have all expected idempotency error codes", () => {
      expect(StripeErrorCode.IDEMPOTENCY_KEY_IN_USE).toBeDefined();
      expect(StripeErrorCode.IDEMPOTENCY_KEY_EXPIRED).toBeDefined();
    });

    it("should have all expected configuration error codes", () => {
      expect(StripeErrorCode.MISSING_API_KEY).toBeDefined();
      expect(StripeErrorCode.MISSING_WEBHOOK_SECRET).toBeDefined();
      expect(StripeErrorCode.PRICE_NOT_CONFIGURED).toBeDefined();
    });

    it("should have unique values for all error codes", () => {
      const values = Object.values(StripeErrorCode);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});
