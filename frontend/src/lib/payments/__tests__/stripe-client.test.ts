/**
 * @fileoverview Tests for Stripe Client
 */

import {
  StripeClient,
  getStripeClient,
  resetStripeClient,
  type StripeConfig,
  type PaymentIntentParams,
  type SubscriptionParams,
  type WebhookEvent,
} from "../stripe-client";

describe("StripeClient", () => {
  let client: StripeClient;
  const validConfig: StripeConfig = {
    publishableKey: "pk_test_123456789",
    secretKey: "sk_test_123456789",
    webhookSecret: "whsec_test_123456789",
  };

  beforeEach(() => {
    resetStripeClient();
    client = new StripeClient(validConfig);
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe("Constructor", () => {
    it("should create client with valid config", () => {
      expect(client).toBeInstanceOf(StripeClient);
      expect(client.getPublishableKey()).toBe(validConfig.publishableKey);
    });

    it("should throw error if publishable key is missing", () => {
      expect(() => new StripeClient({ publishableKey: "" })).toThrow(
        "Stripe publishable key is required",
      );
    });

    it("should throw error if publishable key has invalid format", () => {
      expect(() => new StripeClient({ publishableKey: "invalid_key" })).toThrow(
        "Invalid Stripe publishable key format",
      );
    });

    it("should accept key without secretKey", () => {
      const clientWithoutSecret = new StripeClient({
        publishableKey: "pk_test_123",
      });
      expect(clientWithoutSecret.getPublishableKey()).toBe("pk_test_123");
    });
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      const result = await client.initialize();
      expect(result).toBe(true);
      expect(client.isInitialized()).toBe(true);
    });

    it("should return true if already initialized", async () => {
      await client.initialize();
      const result = await client.initialize();
      expect(result).toBe(true);
    });

    it("should not be initialized by default", () => {
      expect(client.isInitialized()).toBe(false);
    });
  });

  // ==========================================================================
  // Payment Intent Tests
  // ==========================================================================

  describe("Payment Intents", () => {
    beforeEach(async () => {
      await client.initialize();
    });

    describe("createPaymentIntent", () => {
      it("should create a payment intent with valid params", async () => {
        const params: PaymentIntentParams = {
          amount: 1000,
          currency: "usd",
        };

        const result = await client.createPaymentIntent(params);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.id).toMatch(/^pi_/);
        expect(result.data?.clientSecret).toContain("secret");
        expect(result.data?.amount).toBe(1000);
        expect(result.data?.currency).toBe("usd");
        expect(result.data?.status).toBe("requires_payment_method");
      });

      it("should include customer ID when provided", async () => {
        const params: PaymentIntentParams = {
          amount: 2000,
          currency: "eur",
          customerId: "cus_123",
        };

        const result = await client.createPaymentIntent(params);

        expect(result.success).toBe(true);
        expect(result.data?.customerId).toBe("cus_123");
      });

      it("should include metadata when provided", async () => {
        const params: PaymentIntentParams = {
          amount: 1500,
          currency: "gbp",
          metadata: { orderId: "order_123" },
        };

        const result = await client.createPaymentIntent(params);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toEqual({ orderId: "order_123" });
      });

      it("should fail if client not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.createPaymentIntent({
          amount: 1000,
          currency: "usd",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });

      it("should fail with invalid amount", async () => {
        const result = await client.createPaymentIntent({
          amount: 0,
          currency: "usd",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_amount");
        expect(result.error?.param).toBe("amount");
      });

      it("should fail with negative amount", async () => {
        const result = await client.createPaymentIntent({
          amount: -100,
          currency: "usd",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_amount");
      });

      it("should fail with invalid currency", async () => {
        const result = await client.createPaymentIntent({
          amount: 1000,
          currency: "",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_currency");
      });

      it("should fail with currency code wrong length", async () => {
        const result = await client.createPaymentIntent({
          amount: 1000,
          currency: "us",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_currency");
      });
    });

    describe("confirmPaymentIntent", () => {
      it("should confirm a payment intent", async () => {
        const result = await client.confirmPaymentIntent(
          "pi_123456",
          "pm_123456",
        );

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("succeeded");
        expect(result.data?.paymentMethodId).toBe("pm_123456");
      });

      it("should fail with invalid payment intent ID", async () => {
        const result = await client.confirmPaymentIntent(
          "invalid",
          "pm_123456",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_payment_intent");
      });

      it("should fail with invalid payment method ID", async () => {
        const result = await client.confirmPaymentIntent(
          "pi_123456",
          "invalid",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_payment_method");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.confirmPaymentIntent(
          "pi_123",
          "pm_123",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("cancelPaymentIntent", () => {
      it("should cancel a payment intent", async () => {
        const result = await client.cancelPaymentIntent("pi_123456");

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("canceled");
      });

      it("should fail with invalid payment intent ID", async () => {
        const result = await client.cancelPaymentIntent("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_payment_intent");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.cancelPaymentIntent("pi_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("retrievePaymentIntent", () => {
      it("should retrieve a payment intent", async () => {
        const result = await client.retrievePaymentIntent("pi_123456");

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("pi_123456");
      });

      it("should fail with invalid payment intent ID", async () => {
        const result = await client.retrievePaymentIntent("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_payment_intent");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result =
          await uninitializedClient.retrievePaymentIntent("pi_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });
  });

  // ==========================================================================
  // Subscription Tests
  // ==========================================================================

  describe("Subscriptions", () => {
    beforeEach(async () => {
      await client.initialize();
    });

    describe("createSubscription", () => {
      it("should create a subscription", async () => {
        const params: SubscriptionParams = {
          customerId: "cus_123456",
          priceId: "price_123456",
        };

        const result = await client.createSubscription(params);

        expect(result.success).toBe(true);
        expect(result.data?.id).toMatch(/^sub_/);
        expect(result.data?.customerId).toBe("cus_123456");
        expect(result.data?.priceId).toBe("price_123456");
        expect(result.data?.status).toBe("active");
      });

      it("should create subscription with trial", async () => {
        const params: SubscriptionParams = {
          customerId: "cus_123456",
          priceId: "price_123456",
          trialPeriodDays: 14,
        };

        const result = await client.createSubscription(params);

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("trialing");
        expect(result.data?.trialEnd).toBeDefined();
      });

      it("should include metadata when provided", async () => {
        const params: SubscriptionParams = {
          customerId: "cus_123456",
          priceId: "price_123456",
          metadata: { plan: "pro" },
        };

        const result = await client.createSubscription(params);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toEqual({ plan: "pro" });
      });

      it("should fail with invalid customer ID", async () => {
        const result = await client.createSubscription({
          customerId: "invalid",
          priceId: "price_123456",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_customer");
      });

      it("should fail with invalid price ID", async () => {
        const result = await client.createSubscription({
          customerId: "cus_123456",
          priceId: "invalid",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_price");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.createSubscription({
          customerId: "cus_123",
          priceId: "price_123",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("updateSubscription", () => {
      it("should update a subscription", async () => {
        const result = await client.updateSubscription("sub_123456", {
          priceId: "price_new",
        });

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("sub_123456");
      });

      it("should fail with invalid subscription ID", async () => {
        const result = await client.updateSubscription("invalid", {});

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_subscription");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.updateSubscription(
          "sub_123",
          {},
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("cancelSubscription", () => {
      it("should cancel a subscription at period end", async () => {
        const result = await client.cancelSubscription("sub_123456");

        expect(result.success).toBe(true);
        expect(result.data?.cancelAtPeriodEnd).toBe(true);
        expect(result.data?.status).toBe("active");
      });

      it("should cancel a subscription immediately", async () => {
        const result = await client.cancelSubscription("sub_123456", true);

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("canceled");
        expect(result.data?.cancelAtPeriodEnd).toBe(false);
      });

      it("should fail with invalid subscription ID", async () => {
        const result = await client.cancelSubscription("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_subscription");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.cancelSubscription("sub_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("retrieveSubscription", () => {
      it("should retrieve a subscription", async () => {
        const result = await client.retrieveSubscription("sub_123456");

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("sub_123456");
      });

      it("should fail with invalid subscription ID", async () => {
        const result = await client.retrieveSubscription("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_subscription");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result =
          await uninitializedClient.retrieveSubscription("sub_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("listSubscriptions", () => {
      it("should list subscriptions for a customer", async () => {
        const result = await client.listSubscriptions("cus_123456");

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it("should fail with invalid customer ID", async () => {
        const result = await client.listSubscriptions("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_customer");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.listSubscriptions("cus_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });
  });

  // ==========================================================================
  // Invoice Tests
  // ==========================================================================

  describe("Invoices", () => {
    beforeEach(async () => {
      await client.initialize();
    });

    describe("retrieveInvoice", () => {
      it("should retrieve an invoice", async () => {
        const result = await client.retrieveInvoice("in_123456");

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("in_123456");
        expect(result.data?.status).toBe("paid");
      });

      it("should fail with invalid invoice ID", async () => {
        const result = await client.retrieveInvoice("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_invoice");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.retrieveInvoice("in_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("listInvoices", () => {
      it("should list invoices for a customer", async () => {
        const result = await client.listInvoices("cus_123456");

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it("should fail with invalid customer ID", async () => {
        const result = await client.listInvoices("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_customer");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.listInvoices("cus_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("payInvoice", () => {
      it("should pay an invoice", async () => {
        const result = await client.payInvoice("in_123456");

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("paid");
        expect(result.data?.paidAt).toBeDefined();
      });

      it("should fail with invalid invoice ID", async () => {
        const result = await client.payInvoice("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_invoice");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.payInvoice("in_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("voidInvoice", () => {
      it("should void an invoice", async () => {
        const result = await client.voidInvoice("in_123456");

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("void");
      });

      it("should fail with invalid invoice ID", async () => {
        const result = await client.voidInvoice("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_invoice");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.voidInvoice("in_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });
  });

  // ==========================================================================
  // Webhook Tests
  // ==========================================================================

  describe("Webhooks", () => {
    describe("verifyWebhookSignature", () => {
      const validPayload = JSON.stringify({
        id: "evt_123",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_123" } },
        created: 1234567890,
      });
      const validSignature = "t=1234567890,v1=abc123";

      it("should verify valid webhook signature", () => {
        const result = client.verifyWebhookSignature(
          validPayload,
          validSignature,
        );

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("evt_123");
        expect(result.data?.type).toBe("payment_intent.succeeded");
      });

      it("should parse created timestamp", () => {
        const result = client.verifyWebhookSignature(
          validPayload,
          validSignature,
        );

        expect(result.success).toBe(true);
        expect(result.data?.createdAt).toEqual(new Date(1234567890 * 1000));
      });

      it("should fail without webhook secret", () => {
        const clientNoSecret = new StripeClient({
          publishableKey: "pk_test_123",
        });

        const result = clientNoSecret.verifyWebhookSignature(
          validPayload,
          validSignature,
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("missing_webhook_secret");
      });

      it("should use custom secret when provided", () => {
        const result = client.verifyWebhookSignature(
          validPayload,
          validSignature,
          "custom_secret",
        );

        expect(result.success).toBe(true);
      });

      it("should fail without signature", () => {
        const result = client.verifyWebhookSignature(validPayload, "");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("missing_signature");
      });

      it("should fail with invalid signature format", () => {
        const result = client.verifyWebhookSignature(
          validPayload,
          "invalid_signature",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_signature_format");
      });

      it("should fail with invalid JSON payload", () => {
        const result = client.verifyWebhookSignature(
          "invalid json",
          validSignature,
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_payload");
      });
    });

    describe("handleWebhookEvent", () => {
      const createEvent = (type: string): WebhookEvent => ({
        id: "evt_123",
        type,
        data: { object: {} },
        createdAt: new Date(),
      });

      it("should handle payment_intent.succeeded", async () => {
        const event = createEvent("payment_intent.succeeded");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(true);
        expect(result.data?.type).toBe("payment_intent.succeeded");
      });

      it("should handle payment_intent.payment_failed", async () => {
        const event = createEvent("payment_intent.payment_failed");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(true);
      });

      it("should handle customer.subscription.created", async () => {
        const event = createEvent("customer.subscription.created");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(true);
      });

      it("should handle customer.subscription.updated", async () => {
        const event = createEvent("customer.subscription.updated");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(true);
      });

      it("should handle customer.subscription.deleted", async () => {
        const event = createEvent("customer.subscription.deleted");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(true);
      });

      it("should handle invoice.paid", async () => {
        const event = createEvent("invoice.paid");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(true);
      });

      it("should handle invoice.payment_failed", async () => {
        const event = createEvent("invoice.payment_failed");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(true);
      });

      it("should handle charge.succeeded", async () => {
        const event = createEvent("charge.succeeded");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(true);
      });

      it("should handle charge.failed", async () => {
        const event = createEvent("charge.failed");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(true);
      });

      it("should handle charge.refunded", async () => {
        const event = createEvent("charge.refunded");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(true);
      });

      it("should not handle unknown event types", async () => {
        const event = createEvent("unknown.event.type");
        const result = await client.handleWebhookEvent(event);

        expect(result.success).toBe(true);
        expect(result.data?.handled).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Customer Tests
  // ==========================================================================

  describe("Customers", () => {
    beforeEach(async () => {
      await client.initialize();
    });

    describe("createCustomer", () => {
      it("should create a customer", async () => {
        const result = await client.createCustomer("test@example.com");

        expect(result.success).toBe(true);
        expect(result.data?.id).toMatch(/^cus_/);
        expect(result.data?.email).toBe("test@example.com");
      });

      it("should create customer with name", async () => {
        const result = await client.createCustomer(
          "test@example.com",
          "John Doe",
        );

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe("John Doe");
      });

      it("should create customer with metadata", async () => {
        const result = await client.createCustomer(
          "test@example.com",
          undefined,
          {
            userId: "user_123",
          },
        );

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toEqual({ userId: "user_123" });
      });

      it("should fail with invalid email", async () => {
        const result = await client.createCustomer("invalid-email");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_email");
      });

      it("should fail with empty email", async () => {
        const result = await client.createCustomer("");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_email");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result =
          await uninitializedClient.createCustomer("test@example.com");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("retrieveCustomer", () => {
      it("should retrieve a customer", async () => {
        const result = await client.retrieveCustomer("cus_123456");

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("cus_123456");
      });

      it("should fail with invalid customer ID", async () => {
        const result = await client.retrieveCustomer("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_customer");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.retrieveCustomer("cus_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("updateCustomer", () => {
      it("should update a customer email", async () => {
        const result = await client.updateCustomer("cus_123456", {
          email: "new@example.com",
        });

        expect(result.success).toBe(true);
        expect(result.data?.email).toBe("new@example.com");
      });

      it("should update a customer name", async () => {
        const result = await client.updateCustomer("cus_123456", {
          name: "Jane Doe",
        });

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe("Jane Doe");
      });

      it("should update customer metadata", async () => {
        const result = await client.updateCustomer("cus_123456", {
          metadata: { key: "value" },
        });

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toEqual({ key: "value" });
      });

      it("should fail with invalid customer ID", async () => {
        const result = await client.updateCustomer("invalid", {});

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_customer");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.updateCustomer("cus_123", {});

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("deleteCustomer", () => {
      it("should delete a customer", async () => {
        const result = await client.deleteCustomer("cus_123456");

        expect(result.success).toBe(true);
        expect(result.data?.deleted).toBe(true);
      });

      it("should fail with invalid customer ID", async () => {
        const result = await client.deleteCustomer("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_customer");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.deleteCustomer("cus_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });
  });

  // ==========================================================================
  // Payment Method Tests
  // ==========================================================================

  describe("Payment Methods", () => {
    beforeEach(async () => {
      await client.initialize();
    });

    describe("attachPaymentMethod", () => {
      it("should attach a payment method to a customer", async () => {
        const result = await client.attachPaymentMethod(
          "pm_123456",
          "cus_123456",
        );

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("pm_123456");
        expect(result.data?.type).toBe("card");
      });

      it("should include card details", async () => {
        const result = await client.attachPaymentMethod(
          "pm_123456",
          "cus_123456",
        );

        expect(result.success).toBe(true);
        expect(result.data?.card).toBeDefined();
        expect(result.data?.card?.brand).toBe("visa");
        expect(result.data?.card?.last4).toBe("4242");
      });

      it("should fail with invalid payment method ID", async () => {
        const result = await client.attachPaymentMethod(
          "invalid",
          "cus_123456",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_payment_method");
      });

      it("should fail with invalid customer ID", async () => {
        const result = await client.attachPaymentMethod("pm_123456", "invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_customer");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.attachPaymentMethod(
          "pm_123",
          "cus_123",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("detachPaymentMethod", () => {
      it("should detach a payment method", async () => {
        const result = await client.detachPaymentMethod("pm_123456");

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("pm_123456");
      });

      it("should fail with invalid payment method ID", async () => {
        const result = await client.detachPaymentMethod("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_payment_method");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.detachPaymentMethod("pm_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });

    describe("listPaymentMethods", () => {
      it("should list payment methods for a customer", async () => {
        const result = await client.listPaymentMethods("cus_123456");

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it("should accept type parameter", async () => {
        const result = await client.listPaymentMethods("cus_123456", "card");

        expect(result.success).toBe(true);
      });

      it("should fail with invalid customer ID", async () => {
        const result = await client.listPaymentMethods("invalid");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("invalid_customer");
      });

      it("should fail if not initialized", async () => {
        const uninitializedClient = new StripeClient(validConfig);
        const result = await uninitializedClient.listPaymentMethods("cus_123");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("not_initialized");
      });
    });
  });

  // ==========================================================================
  // Utility Method Tests
  // ==========================================================================

  describe("Utility Methods", () => {
    describe("formatAmount", () => {
      it("should format USD amount correctly", () => {
        expect(client.formatAmount(1000, "usd")).toBe("$10.00");
      });

      it("should format EUR amount correctly", () => {
        expect(client.formatAmount(2999, "eur")).toMatch(/29[,.]99/);
      });

      it("should format GBP amount correctly", () => {
        expect(client.formatAmount(5000, "gbp")).toMatch(/50[,.]00/);
      });

      it("should handle zero amount", () => {
        expect(client.formatAmount(0, "usd")).toBe("$0.00");
      });

      it("should handle small amounts", () => {
        expect(client.formatAmount(1, "usd")).toBe("$0.01");
      });
    });

    describe("parseAmount", () => {
      it("should parse string amount", () => {
        expect(client.parseAmount("10.00")).toBe(1000);
      });

      it("should parse amount with currency symbol", () => {
        expect(client.parseAmount("$29.99")).toBe(2999);
      });

      it("should parse amount with commas", () => {
        expect(client.parseAmount("1,000.00")).toBe(100000);
      });

      it("should handle integer amounts", () => {
        expect(client.parseAmount("50")).toBe(5000);
      });
    });

    describe("validateCardNumber", () => {
      it("should validate Visa card", () => {
        expect(client.validateCardNumber("4242424242424242")).toBe(true);
      });

      it("should validate Mastercard", () => {
        expect(client.validateCardNumber("5555555555554444")).toBe(true);
      });

      it("should validate Amex", () => {
        expect(client.validateCardNumber("378282246310005")).toBe(true);
      });

      it("should handle card with spaces", () => {
        expect(client.validateCardNumber("4242 4242 4242 4242")).toBe(true);
      });

      it("should handle card with dashes", () => {
        expect(client.validateCardNumber("4242-4242-4242-4242")).toBe(true);
      });

      it("should reject invalid card number", () => {
        expect(client.validateCardNumber("1234567890123456")).toBe(false);
      });

      it("should reject too short card number", () => {
        expect(client.validateCardNumber("424242")).toBe(false);
      });

      it("should reject too long card number", () => {
        expect(client.validateCardNumber("42424242424242424242")).toBe(false);
      });
    });

    describe("getCardBrand", () => {
      it("should detect Visa", () => {
        expect(client.getCardBrand("4242424242424242")).toBe("visa");
      });

      it("should detect Mastercard", () => {
        expect(client.getCardBrand("5555555555554444")).toBe("mastercard");
      });

      it("should detect Amex", () => {
        expect(client.getCardBrand("378282246310005")).toBe("amex");
      });

      it("should detect Discover", () => {
        expect(client.getCardBrand("6011111111111117")).toBe("discover");
      });

      it("should detect JCB", () => {
        expect(client.getCardBrand("3530111333300000")).toBe("jcb");
      });

      it("should detect Diners", () => {
        expect(client.getCardBrand("30569309025904")).toBe("diners");
      });

      it("should return unknown for unrecognized cards", () => {
        expect(client.getCardBrand("9999999999999999")).toBe("unknown");
      });

      it("should handle cards with spaces", () => {
        expect(client.getCardBrand("4242 4242 4242 4242")).toBe("visa");
      });
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("Singleton Pattern", () => {
    beforeEach(() => {
      resetStripeClient();
    });

    it("should create singleton instance", () => {
      const instance = getStripeClient(validConfig);
      expect(instance).toBeInstanceOf(StripeClient);
    });

    it("should return same instance on subsequent calls", () => {
      const instance1 = getStripeClient(validConfig);
      const instance2 = getStripeClient();

      expect(instance1).toBe(instance2);
    });

    it("should throw if getting without config and not initialized", () => {
      expect(() => getStripeClient()).toThrow(
        "Stripe client not initialized. Call with config first.",
      );
    });

    it("should reset singleton", () => {
      getStripeClient(validConfig);
      resetStripeClient();

      expect(() => getStripeClient()).toThrow();
    });
  });
});
