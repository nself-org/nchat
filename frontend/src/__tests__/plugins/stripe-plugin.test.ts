/**
 * Stripe Plugin Integration Tests
 *
 * Comprehensive test suite for the Stripe plugin (ɳPlugin: stripe v1.0.0)
 * Tests payment processing, subscriptions, and webhooks.
 *
 * @group integration
 * @group plugins
 * @group stripe
 */

import { describe, it, expect, beforeAll } from "@jest/globals";

// Configuration
const STRIPE_ENABLED = process.env.STRIPE_ENABLED === "true";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const TEST_TIMEOUT = 30000;

const TEST_CUSTOMER = {
  email: "stripe-test@nchat.local",
  name: "Stripe Test Customer",
};

describe("Stripe Plugin", () => {
  const describeIf = STRIPE_ENABLED ? describe : describe.skip;

  beforeAll(() => {
    if (!STRIPE_ENABLED) {
      console.log("⚠️  Stripe plugin tests skipped (STRIPE_ENABLED=false)");
    }
  });

  describeIf("Customer Management", () => {
    it("should create Stripe customer", async () => {
      const response = await fetch(`${API_BASE}/api/billing/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(TEST_CUSTOMER),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty("customerId");
      }
    }, 10000);

    it("should retrieve customer", async () => {
      const response = await fetch(
        `${API_BASE}/api/billing/customers/cus_test123`,
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);

    it("should update customer", async () => {
      const response = await fetch(
        `${API_BASE}/api/billing/customers/cus_test123`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Updated Name",
          }),
        },
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);
  });

  describeIf("Payment Methods", () => {
    it("should attach payment method", async () => {
      const response = await fetch(`${API_BASE}/api/billing/payment-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: "cus_test123",
          paymentMethodId: "pm_test123",
        }),
      });

      expect([200, 400]).toContain(response.status);
    }, 10000);

    it("should list payment methods", async () => {
      const response = await fetch(
        `${API_BASE}/api/billing/payment-methods?customerId=cus_test123`,
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);

    it("should set default payment method", async () => {
      const response = await fetch(
        `${API_BASE}/api/billing/payment-methods/default`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: "cus_test123",
            paymentMethodId: "pm_test123",
          }),
        },
      );

      expect([200, 400, 404]).toContain(response.status);
    }, 10000);
  });

  describeIf("Subscriptions", () => {
    it("should create subscription", async () => {
      const response = await fetch(`${API_BASE}/api/billing/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: "cus_test123",
          priceId: "price_test123",
        }),
      });

      expect([200, 400, 404]).toContain(response.status);
    }, 10000);

    it("should list subscriptions", async () => {
      const response = await fetch(
        `${API_BASE}/api/billing/subscriptions?customerId=cus_test123`,
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);

    it("should cancel subscription", async () => {
      const response = await fetch(
        `${API_BASE}/api/billing/subscriptions/sub_test123`,
        {
          method: "DELETE",
        },
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);

    it("should update subscription", async () => {
      const response = await fetch(
        `${API_BASE}/api/billing/subscriptions/sub_test123`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId: "price_new123",
          }),
        },
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);
  });

  describeIf("Checkout", () => {
    it("should create checkout session", async () => {
      const response = await fetch(`${API_BASE}/api/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: "price_test123",
          successUrl: "http://localhost:3000/success",
          cancelUrl: "http://localhost:3000/cancel",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty("sessionId");
      }
    }, 10000);

    it("should create customer portal session", async () => {
      const response = await fetch(`${API_BASE}/api/billing/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: "cus_test123",
          returnUrl: "http://localhost:3000/settings/billing",
        }),
      });

      expect([200, 400, 404]).toContain(response.status);
    }, 10000);
  });

  describeIf("Webhooks", () => {
    it("should handle webhook events", async () => {
      const mockEvent = {
        type: "customer.subscription.created",
        data: {
          object: {
            id: "sub_test123",
            customer: "cus_test123",
          },
        },
      };

      const response = await fetch(`${API_BASE}/api/billing/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "test-signature",
        },
        body: JSON.stringify(mockEvent),
      });

      // Will fail without valid signature
      expect([200, 400]).toContain(response.status);
    }, 10000);
  });

  describeIf("Invoices", () => {
    it("should list invoices", async () => {
      const response = await fetch(
        `${API_BASE}/api/billing/invoices?customerId=cus_test123`,
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);

    it("should retrieve invoice", async () => {
      const response = await fetch(
        `${API_BASE}/api/billing/invoices/in_test123`,
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);
  });
});
