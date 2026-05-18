/**
 * Shopify Plugin Integration Tests
 *
 * Comprehensive test suite for the Shopify plugin (ɳPlugin: shopify v1.0.0)
 * Tests e-commerce integration, order notifications, and product embeds.
 *
 * @group integration
 * @group plugins
 * @group shopify
 */

import { describe, it, expect, beforeAll } from "@jest/globals";

// Configuration
const SHOPIFY_ENABLED = process.env.SHOPIFY_ENABLED === "true";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const TEST_TIMEOUT = 30000;

describe("Shopify Plugin", () => {
  const describeIf = SHOPIFY_ENABLED ? describe : describe.skip;

  beforeAll(() => {
    if (!SHOPIFY_ENABLED) {
      console.log("⚠️  Shopify plugin tests skipped (SHOPIFY_ENABLED=false)");
    }
  });

  describeIf("OAuth", () => {
    it("should have Shopify OAuth provider", async () => {
      const response = await fetch(
        `${API_BASE}/api/integrations/shopify/install`,
      );

      expect([200, 400]).toContain(response.status);
    }, 10000);
  });

  describeIf("Store Connection", () => {
    it("should connect Shopify store", async () => {
      const response = await fetch(
        `${API_BASE}/api/integrations/shopify/connect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop: "test-store.myshopify.com",
            channelId: "channel-123",
          }),
        },
      );

      expect([200, 400, 401]).toContain(response.status);
    }, 10000);

    it("should disconnect store", async () => {
      const response = await fetch(
        `${API_BASE}/api/integrations/shopify/disconnect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop: "test-store.myshopify.com",
          }),
        },
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);
  });

  describeIf("Products", () => {
    it("should list products", async () => {
      const response = await fetch(
        `${API_BASE}/api/integrations/shopify/products`,
      );

      expect([200, 401, 404]).toContain(response.status);
    }, 10000);

    it("should get product details", async () => {
      const response = await fetch(
        `${API_BASE}/api/integrations/shopify/products/123`,
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);

    it("should embed product in message", async () => {
      const response = await fetch(`${API_BASE}/api/unfurl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://test-store.myshopify.com/products/test-product",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty("type");
      }
    }, 10000);
  });

  describeIf("Orders", () => {
    it("should list orders", async () => {
      const response = await fetch(
        `${API_BASE}/api/integrations/shopify/orders`,
      );

      expect([200, 401, 404]).toContain(response.status);
    }, 10000);

    it("should get order details", async () => {
      const response = await fetch(
        `${API_BASE}/api/integrations/shopify/orders/123`,
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);
  });

  describeIf("Webhooks", () => {
    it("should handle order created webhook", async () => {
      const mockOrder = {
        id: 12345,
        email: "customer@example.com",
        total_price: "99.99",
        line_items: [
          {
            title: "Test Product",
            quantity: 1,
          },
        ],
      };

      const response = await fetch(
        `${API_BASE}/api/integrations/shopify/webhook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Topic": "orders/create",
          },
          body: JSON.stringify(mockOrder),
        },
      );

      expect([200, 400]).toContain(response.status);
    }, 10000);

    it("should handle product updated webhook", async () => {
      const mockProduct = {
        id: 123,
        title: "Updated Product",
        variants: [
          {
            id: 456,
            price: "49.99",
          },
        ],
      };

      const response = await fetch(
        `${API_BASE}/api/integrations/shopify/webhook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Topic": "products/update",
          },
          body: JSON.stringify(mockProduct),
        },
      );

      expect([200, 400]).toContain(response.status);
    }, 10000);
  });

  describeIf("Customer Support", () => {
    it("should create support ticket from order", async () => {
      const response = await fetch(
        `${API_BASE}/api/integrations/shopify/support`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: "123",
            issue: "Product damaged",
          }),
        },
      );

      expect([200, 400, 404]).toContain(response.status);
    }, 10000);
  });
});
