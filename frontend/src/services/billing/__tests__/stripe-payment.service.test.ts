/**
 * Tests for Stripe Payment Service
 *
 * @module @/services/billing/__tests__/stripe-payment.service.test
 */

// Set environment variables BEFORE any imports
process.env.STRIPE_SECRET_KEY = "sk_test_mock_key";
process.env.STRIPE_PRICE_ID_STARTER_MONTHLY = "price_starter_monthly";
process.env.STRIPE_PRICE_ID_STARTER_YEARLY = "price_starter_yearly";
process.env.STRIPE_PRICE_ID_PRO_MONTHLY = "price_pro_monthly";
process.env.STRIPE_PRICE_ID_PRO_YEARLY = "price_pro_yearly";
process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY = "price_enterprise_monthly";
process.env.STRIPE_PRICE_ID_ENTERPRISE_YEARLY = "price_enterprise_yearly";

// Mock functions - defined before jest.mock
const mockCheckoutSessionsCreate = jest.fn();
const mockCheckoutSessionsRetrieve = jest.fn();
const mockCheckoutSessionsExpire = jest.fn();
const mockPaymentIntentsCreate = jest.fn();
const mockPaymentIntentsConfirm = jest.fn();
const mockPaymentIntentsCapture = jest.fn();
const mockPaymentIntentsCancel = jest.fn();
const mockRefundsCreate = jest.fn();
const mockRefundsRetrieve = jest.fn();
const mockInvoicesCreate = jest.fn();
const mockInvoicesRetrieve = jest.fn();
const mockInvoicesList = jest.fn();
const mockInvoicesFinalizeInvoice = jest.fn();
const mockInvoicesPay = jest.fn();
const mockInvoicesVoidInvoice = jest.fn();
const mockInvoicesCreatePreview = jest.fn();
const mockInvoiceItemsCreate = jest.fn();
const mockCustomersCreate = jest.fn();
const mockCustomersUpdate = jest.fn();
const mockCustomersRetrieve = jest.fn();
const mockPaymentMethodsAttach = jest.fn();
const mockPaymentMethodsDetach = jest.fn();
const mockPaymentMethodsList = jest.fn();
const mockPromotionCodesList = jest.fn();
const mockChargesList = jest.fn();

// Mock plan-config module to provide price IDs
jest.mock("@/lib/billing/plan-config", () => ({
  STRIPE_PRICE_IDS: {
    free: { monthly: undefined, yearly: undefined },
    starter: {
      monthly: "price_starter_monthly",
      yearly: "price_starter_yearly",
    },
    professional: { monthly: "price_pro_monthly", yearly: "price_pro_yearly" },
    enterprise: {
      monthly: "price_enterprise_monthly",
      yearly: "price_enterprise_yearly",
    },
    custom: { monthly: undefined, yearly: undefined },
  },
  PLAN_PRICING: {
    free: { monthly: 0, yearly: 0, currency: "USD" },
    starter: { monthly: 500, yearly: 5000, currency: "USD" },
    professional: { monthly: 1500, yearly: 15000, currency: "USD" },
    enterprise: { monthly: 9900, yearly: 99000, currency: "USD" },
    custom: { monthly: 0, yearly: null, currency: "USD" },
  },
}));

// Mock Stripe module
jest.mock("stripe", () => {
  class MockStripeError extends Error {
    type: string;
    code?: string;
    constructor(message: string) {
      super(message);
      this.type = "StripeError";
    }
  }

  const MockStripe = jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCheckoutSessionsCreate,
        retrieve: mockCheckoutSessionsRetrieve,
        expire: mockCheckoutSessionsExpire,
      },
    },
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      confirm: mockPaymentIntentsConfirm,
      capture: mockPaymentIntentsCapture,
      cancel: mockPaymentIntentsCancel,
    },
    refunds: {
      create: mockRefundsCreate,
      retrieve: mockRefundsRetrieve,
    },
    invoices: {
      create: mockInvoicesCreate,
      retrieve: mockInvoicesRetrieve,
      list: mockInvoicesList,
      finalizeInvoice: mockInvoicesFinalizeInvoice,
      pay: mockInvoicesPay,
      voidInvoice: mockInvoicesVoidInvoice,
      createPreview: mockInvoicesCreatePreview,
    },
    invoiceItems: {
      create: mockInvoiceItemsCreate,
    },
    customers: {
      create: mockCustomersCreate,
      update: mockCustomersUpdate,
      retrieve: mockCustomersRetrieve,
    },
    paymentMethods: {
      attach: mockPaymentMethodsAttach,
      detach: mockPaymentMethodsDetach,
      list: mockPaymentMethodsList,
    },
    promotionCodes: {
      list: mockPromotionCodesList,
    },
    charges: {
      list: mockChargesList,
    },
  }));

  MockStripe.errors = {
    StripeError: MockStripeError,
  };

  return MockStripe;
});

import {
  StripePaymentService,
  createStripePaymentService,
  resetStripePaymentService,
} from "../stripe-payment.service";
import {
  StripePaymentError,
  StripeErrorCode,
} from "@/lib/billing/stripe-types";

// Store original env
const originalEnv = { ...process.env };

describe("StripePaymentService", () => {
  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    resetStripePaymentService();
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create service with default config", () => {
      const service = createStripePaymentService();
      expect(service).toBeInstanceOf(StripePaymentService);
    });

    it("should create service with custom config", () => {
      const service = createStripePaymentService({
        idempotencyCacheTTL: 1000,
        enableLogging: false,
        maxRetries: 5,
      });
      expect(service).toBeInstanceOf(StripePaymentService);
    });

    it("should throw error without STRIPE_SECRET_KEY", () => {
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => createStripePaymentService()).toThrow(StripePaymentError);

      process.env.STRIPE_SECRET_KEY = originalKey;
    });
  });

  describe("createCheckoutSession", () => {
    const mockSession = {
      id: "cs_test_123",
      url: "https://checkout.stripe.com/123",
      status: "open",
      payment_status: "unpaid",
      customer: "cus_123",
      subscription: "sub_123",
      amount_total: 1500,
      currency: "usd",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      metadata: { workspace_id: "ws_123" },
    };

    beforeEach(() => {
      mockCheckoutSessionsCreate.mockResolvedValue(mockSession);
      mockPromotionCodesList.mockResolvedValue({ data: [] });
    });

    it("should create checkout session successfully", async () => {
      const service = createStripePaymentService();
      const result = await service.createCheckoutSession({
        workspaceId: "ws_123",
        plan: "professional",
        interval: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.success).toBe(true);
      expect(result.data?.sessionId).toBe("cs_test_123");
      expect(result.data?.url).toBe("https://checkout.stripe.com/123");
      expect(result.wasReplay).toBe(false);
    });

    it("should return cached result for duplicate request", async () => {
      const service = createStripePaymentService();
      const idempotencyKey = "test-key-123";

      const result1 = await service.createCheckoutSession(
        {
          workspaceId: "ws_123",
          plan: "professional",
          interval: "monthly",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        },
        idempotencyKey,
      );

      const result2 = await service.createCheckoutSession(
        {
          workspaceId: "ws_123",
          plan: "professional",
          interval: "monthly",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        },
        idempotencyKey,
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.wasReplay).toBe(true);
    });

    it("should include trial days when specified", async () => {
      resetStripePaymentService();
      const service = createStripePaymentService();
      const result = await service.createCheckoutSession({
        workspaceId: "ws_trial",
        plan: "starter",
        interval: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        trialDays: 14,
      });

      expect(result.success).toBe(true);
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 14,
          }),
        }),
        expect.any(Object),
      );
    });

    it("should include customer ID when provided", async () => {
      // Create a fresh service to avoid caching
      resetStripePaymentService();
      const service = createStripePaymentService();
      const result = await service.createCheckoutSession({
        workspaceId: "ws_with_customer",
        plan: "professional",
        interval: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        customerId: "cus_existing",
      });

      expect(result.success).toBe(true);
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_existing",
        }),
        expect.any(Object),
      );
    });

    it("should include customer email when provided", async () => {
      // Create a fresh service to avoid caching
      resetStripePaymentService();
      const service = createStripePaymentService();
      const result = await service.createCheckoutSession({
        workspaceId: "ws_with_email",
        plan: "professional",
        interval: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        customerEmail: "test@example.com",
      });

      expect(result.success).toBe(true);
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: "test@example.com",
        }),
        expect.any(Object),
      );
    });

    it("should handle Stripe errors", async () => {
      mockCheckoutSessionsCreate.mockRejectedValueOnce(
        new Error("Stripe error"),
      );

      const service = createStripePaymentService();
      const result = await service.createCheckoutSession({
        workspaceId: "ws_123",
        plan: "professional",
        interval: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getCheckoutSession", () => {
    it("should retrieve checkout session", async () => {
      mockCheckoutSessionsRetrieve.mockResolvedValue({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/123",
        status: "complete",
        payment_status: "paid",
        customer: "cus_123",
        subscription: "sub_123",
        amount_total: 1500,
        currency: "usd",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        metadata: {},
      });

      const service = createStripePaymentService();
      const session = await service.getCheckoutSession("cs_test_123");

      expect(session).not.toBeNull();
      expect(session?.sessionId).toBe("cs_test_123");
      expect(session?.status).toBe("complete");
    });

    it("should return null for invalid session", async () => {
      mockCheckoutSessionsRetrieve.mockRejectedValue(
        new Error("Session not found"),
      );

      const service = createStripePaymentService();
      const session = await service.getCheckoutSession("invalid");

      expect(session).toBeNull();
    });
  });

  describe("expireCheckoutSession", () => {
    it("should expire session successfully", async () => {
      mockCheckoutSessionsExpire.mockResolvedValue({
        id: "cs_test_123",
        status: "expired",
      });

      const service = createStripePaymentService();
      const result = await service.expireCheckoutSession("cs_test_123");

      expect(result).toBe(true);
    });

    it("should return false on error", async () => {
      mockCheckoutSessionsExpire.mockRejectedValue(new Error("Cannot expire"));

      const service = createStripePaymentService();
      const result = await service.expireCheckoutSession("cs_test_123");

      expect(result).toBe(false);
    });
  });

  describe("createPaymentIntent", () => {
    const mockPaymentIntent = {
      id: "pi_test_123",
      client_secret: "pi_test_secret",
      status: "requires_payment_method",
      amount: 1000,
      currency: "usd",
      customer: "cus_123",
      payment_method: "pm_123",
      created: Math.floor(Date.now() / 1000),
      metadata: {},
    };

    beforeEach(() => {
      mockPaymentIntentsCreate.mockResolvedValue(mockPaymentIntent);
    });

    it("should create payment intent successfully", async () => {
      const service = createStripePaymentService();
      const result = await service.createPaymentIntent({
        amount: 1000,
        currency: "USD",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("pi_test_123");
      expect(result.data?.clientSecret).toBe("pi_test_secret");
    });

    it("should include customer and payment method", async () => {
      const service = createStripePaymentService();
      await service.createPaymentIntent({
        amount: 1000,
        currency: "USD",
        customerId: "cus_123",
        paymentMethodId: "pm_123",
      });

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_123",
          payment_method: "pm_123",
        }),
        expect.any(Object),
      );
    });

    it("should cache result with idempotency key", async () => {
      const service = createStripePaymentService();
      const key = "payment-intent-key";

      await service.createPaymentIntent({ amount: 1000, currency: "USD" }, key);
      const result2 = await service.createPaymentIntent(
        { amount: 1000, currency: "USD" },
        key,
      );

      expect(result2.wasReplay).toBe(true);
    });
  });

  describe("confirmPaymentIntent", () => {
    it("should confirm payment intent", async () => {
      mockPaymentIntentsConfirm.mockResolvedValue({
        id: "pi_test_123",
        client_secret: "pi_test_secret",
        status: "succeeded",
        amount: 1000,
        currency: "usd",
        customer: "cus_123",
        payment_method: "pm_123",
        created: Math.floor(Date.now() / 1000),
        metadata: {},
      });

      const service = createStripePaymentService();
      const result = await service.confirmPaymentIntent({
        paymentIntentId: "pi_test_123",
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("succeeded");
    });
  });

  describe("capturePaymentIntent", () => {
    it("should capture payment intent", async () => {
      mockPaymentIntentsCapture.mockResolvedValue({
        id: "pi_test_123",
        client_secret: "pi_test_secret",
        status: "succeeded",
        amount: 1000,
        currency: "usd",
        customer: "cus_123",
        payment_method: "pm_123",
        created: Math.floor(Date.now() / 1000),
        metadata: {},
      });

      const service = createStripePaymentService();
      const result = await service.capturePaymentIntent({
        paymentIntentId: "pi_test_123",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("cancelPaymentIntent", () => {
    it("should cancel payment intent", async () => {
      mockPaymentIntentsCancel.mockResolvedValue({
        id: "pi_test_123",
        status: "canceled",
      });

      const service = createStripePaymentService();
      const result = await service.cancelPaymentIntent("pi_test_123");

      expect(result).toBe(true);
    });

    it("should return false on error", async () => {
      mockPaymentIntentsCancel.mockRejectedValue(new Error("Cannot cancel"));

      const service = createStripePaymentService();
      const result = await service.cancelPaymentIntent("pi_test_123");

      expect(result).toBe(false);
    });
  });

  describe("createRefund", () => {
    const mockRefund = {
      id: "re_test_123",
      amount: 500,
      currency: "usd",
      status: "succeeded",
      reason: "requested_by_customer",
      payment_intent: "pi_123",
      charge: "ch_123",
      created: Math.floor(Date.now() / 1000),
      metadata: {},
      failure_reason: null,
    };

    beforeEach(() => {
      mockRefundsCreate.mockResolvedValue(mockRefund);
    });

    it("should create refund with payment intent", async () => {
      const service = createStripePaymentService();
      const result = await service.createRefund({
        paymentIntentId: "pi_123",
        amount: 500,
        reason: "requested_by_customer",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("re_test_123");
      expect(result.data?.amount).toBe(500);
    });

    it("should create refund with charge ID", async () => {
      const service = createStripePaymentService();
      await service.createRefund({
        chargeId: "ch_123",
        amount: 500,
      });

      expect(mockRefundsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          charge: "ch_123",
        }),
        expect.any(Object),
      );
    });

    it("should fail without payment intent or charge", async () => {
      const service = createStripePaymentService();
      const result = await service.createRefund({
        amount: 500,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("createBulkRefunds", () => {
    it("should process multiple refunds", async () => {
      mockRefundsCreate.mockResolvedValue({
        id: "re_test_123",
        amount: 500,
        currency: "usd",
        status: "succeeded",
        reason: null,
        payment_intent: "pi_123",
        charge: "ch_123",
        created: Math.floor(Date.now() / 1000),
        metadata: {},
        failure_reason: null,
      });

      const service = createStripePaymentService();
      const result = await service.createBulkRefunds({
        refunds: [
          { paymentIntentId: "pi_1", amount: 100 },
          { paymentIntentId: "pi_2", amount: 200 },
        ],
      });

      expect(result.totalSucceeded).toBe(2);
      expect(result.totalFailed).toBe(0);
    });

    it("should stop on error when configured", async () => {
      // Reset and configure mock fresh
      resetStripePaymentService();
      jest.clearAllMocks();

      mockRefundsCreate
        .mockResolvedValueOnce({
          id: "re_1",
          amount: 100,
          currency: "usd",
          status: "succeeded",
          reason: null,
          payment_intent: "pi_1",
          charge: "ch_1",
          created: Math.floor(Date.now() / 1000),
          metadata: {},
          failure_reason: null,
        })
        .mockRejectedValueOnce(new Error("Refund failed"))
        .mockResolvedValueOnce({
          id: "re_3",
          amount: 300,
          currency: "usd",
          status: "succeeded",
          reason: null,
          payment_intent: "pi_3",
          charge: "ch_3",
          created: Math.floor(Date.now() / 1000),
          metadata: {},
          failure_reason: null,
        });

      const service = createStripePaymentService();
      const result = await service.createBulkRefunds({
        refunds: [
          { paymentIntentId: "pi_stop_1", amount: 100 },
          { paymentIntentId: "pi_stop_2", amount: 200 },
          { paymentIntentId: "pi_stop_3", amount: 300 },
        ],
        stopOnError: true,
      });

      expect(result.totalSucceeded).toBe(1);
      expect(result.totalFailed).toBe(1);
    });
  });

  describe("getRefund", () => {
    it("should retrieve refund", async () => {
      mockRefundsRetrieve.mockResolvedValue({
        id: "re_test_123",
        amount: 500,
        currency: "usd",
        status: "succeeded",
        reason: "requested_by_customer",
        payment_intent: "pi_123",
        charge: "ch_123",
        created: Math.floor(Date.now() / 1000),
        metadata: {},
        failure_reason: null,
      });

      const service = createStripePaymentService();
      const refund = await service.getRefund("re_test_123");

      expect(refund).not.toBeNull();
      expect(refund?.id).toBe("re_test_123");
    });
  });

  describe("createInvoice", () => {
    const mockInvoice = {
      id: "in_test_123",
      number: "INV-001",
      customer: "cus_123",
      subscription: "sub_123",
      status: "draft",
      collection_method: "charge_automatically",
      currency: "usd",
      amount_due: 1500,
      amount_paid: 0,
      amount_remaining: 1500,
      subtotal: 1500,
      total: 1500,
      tax: null,
      due_date: null,
      created: Math.floor(Date.now() / 1000),
      period_start: null,
      period_end: null,
      status_transitions: {},
      hosted_invoice_url: "https://invoice.stripe.com/123",
      invoice_pdf: "https://invoice.stripe.com/123.pdf",
      lines: { data: [] },
      metadata: {},
    };

    beforeEach(() => {
      mockInvoicesCreate.mockResolvedValue(mockInvoice);
    });

    it("should create invoice", async () => {
      const service = createStripePaymentService();
      const result = await service.createInvoice({
        customerId: "cus_123",
        description: "Test invoice",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("in_test_123");
    });

    it("should include subscription when provided", async () => {
      const service = createStripePaymentService();
      await service.createInvoice({
        customerId: "cus_123",
        subscriptionId: "sub_123",
      });

      expect(mockInvoicesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription: "sub_123",
        }),
        expect.any(Object),
      );
    });
  });

  describe("addInvoiceItem", () => {
    it("should add invoice item", async () => {
      mockInvoiceItemsCreate.mockResolvedValue({
        id: "ii_test_123",
      });

      const service = createStripePaymentService();
      const result = await service.addInvoiceItem({
        customerId: "cus_123",
        amount: 1000,
        currency: "USD",
        description: "Additional service",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe("ii_test_123");
    });
  });

  describe("finalizeInvoice", () => {
    it("should finalize invoice", async () => {
      mockInvoicesFinalizeInvoice.mockResolvedValue({
        id: "in_test_123",
        number: "INV-001",
        customer: "cus_123",
        subscription: null,
        status: "open",
        collection_method: "charge_automatically",
        currency: "usd",
        amount_due: 1500,
        amount_paid: 0,
        amount_remaining: 1500,
        subtotal: 1500,
        total: 1500,
        tax: null,
        due_date: null,
        created: Math.floor(Date.now() / 1000),
        period_start: null,
        period_end: null,
        status_transitions: {},
        hosted_invoice_url: "https://invoice.stripe.com/123",
        invoice_pdf: "https://invoice.stripe.com/123.pdf",
        lines: { data: [] },
        metadata: {},
      });

      const service = createStripePaymentService();
      const result = await service.finalizeInvoice({
        invoiceId: "in_test_123",
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("open");
    });
  });

  describe("payInvoice", () => {
    it("should pay invoice", async () => {
      mockInvoicesPay.mockResolvedValue({
        id: "in_test_123",
        number: "INV-001",
        customer: "cus_123",
        subscription: null,
        status: "paid",
        collection_method: "charge_automatically",
        currency: "usd",
        amount_due: 0,
        amount_paid: 1500,
        amount_remaining: 0,
        subtotal: 1500,
        total: 1500,
        tax: null,
        due_date: null,
        created: Math.floor(Date.now() / 1000),
        period_start: null,
        period_end: null,
        status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
        hosted_invoice_url: "https://invoice.stripe.com/123",
        invoice_pdf: "https://invoice.stripe.com/123.pdf",
        lines: { data: [] },
        metadata: {},
      });

      const service = createStripePaymentService();
      const result = await service.payInvoice({
        invoiceId: "in_test_123",
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("paid");
    });
  });

  describe("voidInvoice", () => {
    it("should void invoice", async () => {
      mockInvoicesVoidInvoice.mockResolvedValue({
        id: "in_test_123",
        number: "INV-001",
        customer: "cus_123",
        subscription: null,
        status: "void",
        collection_method: "charge_automatically",
        currency: "usd",
        amount_due: 0,
        amount_paid: 0,
        amount_remaining: 0,
        subtotal: 1500,
        total: 1500,
        tax: null,
        due_date: null,
        created: Math.floor(Date.now() / 1000),
        period_start: null,
        period_end: null,
        status_transitions: {},
        hosted_invoice_url: null,
        invoice_pdf: null,
        lines: { data: [] },
        metadata: {},
      });

      const service = createStripePaymentService();
      const result = await service.voidInvoice({
        invoiceId: "in_test_123",
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("void");
    });
  });

  describe("getInvoice", () => {
    it("should retrieve invoice", async () => {
      mockInvoicesRetrieve.mockResolvedValue({
        id: "in_test_123",
        number: "INV-001",
        customer: "cus_123",
        subscription: null,
        status: "paid",
        collection_method: "charge_automatically",
        currency: "usd",
        amount_due: 0,
        amount_paid: 1500,
        amount_remaining: 0,
        subtotal: 1500,
        total: 1500,
        tax: null,
        due_date: null,
        created: Math.floor(Date.now() / 1000),
        period_start: null,
        period_end: null,
        status_transitions: {},
        hosted_invoice_url: "https://invoice.stripe.com/123",
        invoice_pdf: "https://invoice.stripe.com/123.pdf",
        lines: { data: [] },
        metadata: {},
      });

      const service = createStripePaymentService();
      const invoice = await service.getInvoice("in_test_123");

      expect(invoice).not.toBeNull();
      expect(invoice?.id).toBe("in_test_123");
    });
  });

  describe("listInvoices", () => {
    it("should list invoices", async () => {
      mockInvoicesList.mockResolvedValue({
        data: [
          {
            id: "in_1",
            number: "INV-001",
            customer: "cus_123",
            subscription: null,
            status: "paid",
            collection_method: "charge_automatically",
            currency: "usd",
            amount_due: 0,
            amount_paid: 1000,
            amount_remaining: 0,
            subtotal: 1000,
            total: 1000,
            tax: null,
            due_date: null,
            created: Math.floor(Date.now() / 1000),
            period_start: null,
            period_end: null,
            status_transitions: {},
            hosted_invoice_url: null,
            invoice_pdf: null,
            lines: { data: [] },
            metadata: {},
          },
        ],
      });

      const service = createStripePaymentService();
      const invoices = await service.listInvoices("cus_123");

      expect(invoices).toHaveLength(1);
      expect(invoices[0].id).toBe("in_1");
    });
  });

  describe("getUpcomingInvoice", () => {
    it("should retrieve upcoming invoice", async () => {
      mockInvoicesCreatePreview.mockResolvedValue({
        id: "in_upcoming",
        customer: "cus_123",
        subscription: "sub_123",
        status: "draft",
        collection_method: "charge_automatically",
        currency: "usd",
        amount_due: 1500,
        amount_paid: 0,
        amount_remaining: 1500,
        subtotal: 1500,
        total: 1500,
        tax: null,
        created: Math.floor(Date.now() / 1000),
        period_start: Math.floor(Date.now() / 1000),
        period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        lines: { data: [] },
        metadata: {},
      });

      const service = createStripePaymentService();
      const invoice = await service.getUpcomingInvoice("cus_123");

      expect(invoice).not.toBeNull();
      expect(invoice?.amountDue).toBe(1500);
    });
  });

  describe("createCustomer", () => {
    const mockCustomer = {
      id: "cus_test_123",
      email: "test@example.com",
      name: "Test User",
      description: null,
      invoice_settings: { default_payment_method: null },
      balance: 0,
      currency: "usd",
      created: Math.floor(Date.now() / 1000),
      metadata: {},
    };

    beforeEach(() => {
      mockCustomersCreate.mockResolvedValue(mockCustomer);
    });

    it("should create customer", async () => {
      const service = createStripePaymentService();
      const result = await service.createCustomer({
        email: "test@example.com",
        name: "Test User",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("cus_test_123");
    });

    it("should include payment method", async () => {
      // Use unique email to avoid caching
      resetStripePaymentService();
      const service = createStripePaymentService();
      const result = await service.createCustomer({
        email: "test_with_pm@example.com",
        paymentMethodId: "pm_123",
      });

      expect(result.success).toBe(true);
      expect(mockCustomersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: "pm_123",
        }),
        expect.any(Object),
      );
    });
  });

  describe("updateCustomer", () => {
    it("should update customer", async () => {
      mockCustomersUpdate.mockResolvedValue({
        id: "cus_test_123",
        email: "updated@example.com",
        name: "Updated User",
        description: null,
        invoice_settings: { default_payment_method: null },
        balance: 0,
        currency: "usd",
        created: Math.floor(Date.now() / 1000),
        metadata: {},
      });

      const service = createStripePaymentService();
      const result = await service.updateCustomer("cus_test_123", {
        email: "updated@example.com",
        name: "Updated User",
      });

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe("updated@example.com");
    });
  });

  describe("getCustomer", () => {
    it("should retrieve customer", async () => {
      mockCustomersRetrieve.mockResolvedValue({
        id: "cus_test_123",
        email: "test@example.com",
        name: "Test User",
        description: null,
        invoice_settings: { default_payment_method: null },
        balance: 0,
        currency: "usd",
        created: Math.floor(Date.now() / 1000),
        metadata: {},
      });

      const service = createStripePaymentService();
      const customer = await service.getCustomer("cus_test_123");

      expect(customer).not.toBeNull();
      expect(customer?.id).toBe("cus_test_123");
    });

    it("should return null for deleted customer", async () => {
      mockCustomersRetrieve.mockResolvedValue({
        id: "cus_test_123",
        deleted: true,
      });

      const service = createStripePaymentService();
      const customer = await service.getCustomer("cus_test_123");

      expect(customer).toBeNull();
    });
  });

  describe("attachPaymentMethod", () => {
    it("should attach payment method", async () => {
      mockPaymentMethodsAttach.mockResolvedValue({
        id: "pm_test_123",
        type: "card",
        customer: "cus_123",
        billing_details: { email: "test@example.com" },
        card: {
          brand: "visa",
          last4: "4242",
          exp_month: 12,
          exp_year: 2025,
          funding: "credit",
          country: "US",
        },
        created: Math.floor(Date.now() / 1000),
      });

      const service = createStripePaymentService();
      const result = await service.attachPaymentMethod({
        paymentMethodId: "pm_test_123",
        customerId: "cus_123",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("pm_test_123");
    });
  });

  describe("detachPaymentMethod", () => {
    it("should detach payment method", async () => {
      mockPaymentMethodsDetach.mockResolvedValue({
        id: "pm_test_123",
        type: "card",
        customer: null,
        billing_details: {},
        created: Math.floor(Date.now() / 1000),
      });

      const service = createStripePaymentService();
      const result = await service.detachPaymentMethod({
        paymentMethodId: "pm_test_123",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("listPaymentMethods", () => {
    it("should list payment methods", async () => {
      mockPaymentMethodsList.mockResolvedValue({
        data: [
          {
            id: "pm_1",
            type: "card",
            customer: "cus_123",
            billing_details: {},
            card: {
              brand: "visa",
              last4: "4242",
              exp_month: 12,
              exp_year: 2025,
              funding: "credit",
              country: "US",
            },
            created: Math.floor(Date.now() / 1000),
          },
        ],
      });

      const service = createStripePaymentService();
      const methods = await service.listPaymentMethods("cus_123");

      expect(methods).toHaveLength(1);
      expect(methods[0].id).toBe("pm_1");
    });
  });

  describe("generateReconciliationReport", () => {
    it("should generate reconciliation report", async () => {
      mockChargesList.mockResolvedValue({
        data: [
          {
            id: "ch_1",
            payment_intent: "pi_1",
            customer: "cus_123",
            invoice: "in_123",
            amount: 1000,
            currency: "usd",
            paid: true,
            refunded: false,
            created: Math.floor(Date.now() / 1000),
            description: "Test charge",
            receipt_url: "https://receipt.stripe.com/123",
            metadata: { workspace_id: "ws_123" },
          },
        ],
      });

      const service = createStripePaymentService();
      const report = await service.generateReconciliationReport({
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(report.totalTransactions).toBe(1);
      expect(report.totalStripeAmount).toBe(1000);
      expect(report.entries).toHaveLength(1);
    });
  });

  describe("Cache Management", () => {
    it("should clear cache", () => {
      const service = createStripePaymentService();
      service.clearCache();
      // No error should be thrown
      expect(true).toBe(true);
    });

    it("should cleanup expired entries", () => {
      const service = createStripePaymentService();
      const cleaned = service.cleanupExpiredEntries();
      expect(typeof cleaned).toBe("number");
    });
  });
});
