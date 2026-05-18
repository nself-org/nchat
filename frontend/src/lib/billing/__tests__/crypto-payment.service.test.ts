/**
 * Crypto Payment Service Tests
 *
 * Tests for cryptocurrency payment processing.
 */

import {
  CryptoPaymentService,
  getCryptoPaymentService,
} from "../crypto-payment.service";
import type {
  CryptoCurrency,
  CryptoNetwork,
  CryptoProvider,
} from "../crypto-payment.service";

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("CryptoPaymentService", () => {
  let service: CryptoPaymentService;

  beforeEach(() => {
    service = new CryptoPaymentService();
    mockFetch.mockReset();
  });

  describe("getExchangeRate", () => {
    it("should fetch exchange rate from CoinGecko", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ethereum: { usd: 2500 } }),
      });

      const rate = await service.getExchangeRate("ETH");

      expect(rate).toBeDefined();
      expect(rate?.currency).toBe("ETH");
      expect(rate?.usdPrice).toBe(2500);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("coingecko"),
        expect.any(Object),
      );
    });

    it("should use fallback rates on API failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const rate = await service.getExchangeRate("ETH");

      expect(rate).toBeDefined();
      expect(rate?.currency).toBe("ETH");
      // Fallback rate for ETH
      expect(rate?.usdPrice).toBe(2500);
    });

    it("should cache exchange rates", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ethereum: { usd: 2500 } }),
      });

      // First call
      await service.getExchangeRate("ETH");
      // Second call should use cache
      await service.getExchangeRate("ETH");

      // Should only fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAllExchangeRates", () => {
    it("should fetch all supported currencies", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ethereum: { usd: 2500 },
          bitcoin: { usd: 45000 },
          "usd-coin": { usd: 1 },
          tether: { usd: 1 },
          dai: { usd: 1 },
        }),
      });

      const rates = await service.getAllExchangeRates();

      expect(rates.size).toBeGreaterThan(0);
      expect(rates.get("ETH")?.usdPrice).toBe(2500);
      expect(rates.get("BTC")?.usdPrice).toBe(45000);
    });
  });

  describe("createPayment", () => {
    beforeEach(() => {
      // Mock exchange rate
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("coingecko")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ethereum: { usd: 2500 } }),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
    });

    it("should reject unsupported currency", async () => {
      const result = await service.createPayment({
        workspaceId: "ws-123",
        userId: "user-123",
        fiatAmount: 1500, // $15
        cryptoCurrency: "DOGE" as CryptoCurrency, // Not supported
        cryptoNetwork: "ethereum",
        provider: "manual",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not accepted");
    });

    it("should reject unsupported network", async () => {
      const result = await service.createPayment({
        workspaceId: "ws-123",
        userId: "user-123",
        fiatAmount: 1500,
        cryptoCurrency: "ETH",
        cryptoNetwork: "solana" as CryptoNetwork, // Not supported
        provider: "manual",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not supported");
    });

    it("should create manual payment with correct crypto amount", async () => {
      // Mock pg pool to avoid database connection
      jest.mock("pg", () => ({
        Pool: jest.fn().mockImplementation(() => ({
          query: jest.fn().mockResolvedValue({ rows: [] }),
          end: jest.fn(),
        })),
      }));

      const result = await service.createPayment({
        workspaceId: "ws-123",
        userId: "user-123",
        fiatAmount: 25000, // $250
        cryptoCurrency: "ETH",
        cryptoNetwork: "ethereum",
        provider: "manual",
      });

      // With ETH at $2500, $250 = 0.1 ETH
      expect(result.success).toBe(true);
      expect(result.payment).toBeDefined();
      expect(result.payment?.cryptoCurrency).toBe("ETH");
      expect(parseFloat(result.payment?.cryptoAmount || "0")).toBeCloseTo(
        0.1,
        6,
      );
    });

    it("should fail Coinbase Commerce without API key", async () => {
      const result = await service.createPayment({
        workspaceId: "ws-123",
        userId: "user-123",
        fiatAmount: 1500,
        cryptoCurrency: "ETH",
        cryptoNetwork: "ethereum",
        provider: "coinbase_commerce",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Coinbase Commerce not configured");
    });
  });

  describe("getAcceptedCurrencies", () => {
    it("should return list of accepted currencies", () => {
      const currencies = service.getAcceptedCurrencies();
      expect(currencies).toContain("ETH");
      expect(currencies).toContain("BTC");
      expect(currencies).toContain("USDC");
    });
  });

  describe("getAcceptedNetworks", () => {
    it("should return list of accepted networks", () => {
      const networks = service.getAcceptedNetworks();
      expect(networks).toContain("ethereum");
      expect(networks).toContain("polygon");
      expect(networks).toContain("base");
    });
  });

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getCryptoPaymentService();
      const instance2 = getCryptoPaymentService();
      expect(instance1).toBe(instance2);
    });
  });
});

describe("CryptoPaymentService - verifyPayment", () => {
  let service: CryptoPaymentService;

  beforeEach(() => {
    service = new CryptoPaymentService();
    mockFetch.mockReset();
  });

  it("should return error for non-existent payment", async () => {
    // Mock empty database result
    const mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      end: jest.fn(),
    };
    jest.doMock("pg", () => ({
      Pool: jest.fn(() => mockPool),
    }));

    const result = await service.verifyPayment(
      "non-existent",
      "0x" + "1".repeat(64),
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Payment not found");
  });
});
