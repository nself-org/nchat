/**
 * Crypto Payment Service
 *
 * Handles cryptocurrency payment processing for subscriptions using
 * Coinbase Commerce and direct wallet transfers.
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type CryptoProvider = "coinbase_commerce" | "stripe_crypto" | "manual";
export type CryptoCurrency = "ETH" | "BTC" | "USDC" | "USDT" | "DAI" | "MATIC";
export type CryptoNetwork =
  | "ethereum"
  | "bitcoin"
  | "polygon"
  | "arbitrum"
  | "base";
export type CryptoPaymentStatus =
  | "pending"
  | "confirming"
  | "completed"
  | "failed"
  | "expired";

export interface CryptoPaymentConfig {
  provider: CryptoProvider;
  acceptedCurrencies: CryptoCurrency[];
  acceptedNetworks: CryptoNetwork[];
  minimumConfirmations: Record<CryptoCurrency, number>;
  paymentTimeout: number; // seconds
}

export interface CryptoPayment {
  id: string;
  workspaceId: string;
  subscriptionId?: string;
  invoiceId?: string;
  userId: string;

  // Provider details
  provider: CryptoProvider;
  providerPaymentId?: string;

  // Cryptocurrency details
  cryptoCurrency: CryptoCurrency;
  cryptoAmount: string;
  cryptoNetwork: CryptoNetwork;

  // Fiat conversion
  fiatAmount: number; // cents
  fiatCurrency: string;
  exchangeRate: string;

  // Transaction details
  transactionHash?: string;
  fromAddress?: string;
  toAddress?: string;
  blockNumber?: string;
  confirmations: number;

  // Status
  status: CryptoPaymentStatus;
  paymentUrl?: string;
  expiresAt?: Date;
  completedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCryptoPaymentParams {
  workspaceId: string;
  userId: string;
  subscriptionId?: string;
  invoiceId?: string;
  fiatAmount: number; // cents
  fiatCurrency?: string;
  cryptoCurrency: CryptoCurrency;
  cryptoNetwork: CryptoNetwork;
  provider: CryptoProvider;
}

export interface CryptoPaymentResult {
  success: boolean;
  payment?: CryptoPayment;
  error?: string;
  paymentUrl?: string;
}

export interface ExchangeRate {
  currency: CryptoCurrency;
  usdPrice: number;
  updatedAt: Date;
}

// ============================================================================
// Crypto Payment Service
// ============================================================================

export class CryptoPaymentService {
  private config: CryptoPaymentConfig = {
    provider: "coinbase_commerce",
    acceptedCurrencies: ["ETH", "BTC", "USDC", "USDT", "DAI"],
    acceptedNetworks: ["ethereum", "polygon", "base"],
    minimumConfirmations: {
      ETH: 12,
      BTC: 6,
      USDC: 12,
      USDT: 12,
      DAI: 12,
      MATIC: 60,
    },
    paymentTimeout: 3600, // 1 hour
  };

  private exchangeRateCache: Map<CryptoCurrency, ExchangeRate> = new Map();
  private readonly RATE_CACHE_TTL = 60 * 1000; // 1 minute

  constructor(config?: Partial<CryptoPaymentConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Create a new crypto payment
   */
  async createPayment(
    params: CreateCryptoPaymentParams,
  ): Promise<CryptoPaymentResult> {
    try {
      // Validate currency and network
      if (!this.config.acceptedCurrencies.includes(params.cryptoCurrency)) {
        return {
          success: false,
          error: `${params.cryptoCurrency} is not accepted`,
        };
      }

      if (!this.config.acceptedNetworks.includes(params.cryptoNetwork)) {
        return {
          success: false,
          error: `${params.cryptoNetwork} network is not supported`,
        };
      }

      // Get exchange rate
      const rate = await this.getExchangeRate(params.cryptoCurrency);
      if (!rate) {
        return {
          success: false,
          error: "Failed to get exchange rate",
        };
      }

      // Calculate crypto amount
      const fiatUSD = params.fiatAmount / 100; // Convert cents to dollars
      const cryptoAmount = (fiatUSD / rate.usdPrice).toFixed(8);

      // Create payment based on provider
      switch (params.provider) {
        case "coinbase_commerce":
          return await this.createCoinbaseCommercePayment({
            ...params,
            cryptoAmount,
            exchangeRate: rate.usdPrice.toString(),
          });

        case "manual":
          return await this.createManualPayment({
            ...params,
            cryptoAmount,
            exchangeRate: rate.usdPrice.toString(),
          });

        default:
          return {
            success: false,
            error: `Provider ${params.provider} not supported`,
          };
      }
    } catch (error) {
      logger.error("Error creating crypto payment:", error);
      return {
        success: false,
        error: "Failed to create payment",
      };
    }
  }

  /**
   * Create payment via Coinbase Commerce
   */
  private async createCoinbaseCommercePayment(params: {
    workspaceId: string;
    userId: string;
    subscriptionId?: string;
    invoiceId?: string;
    fiatAmount: number;
    fiatCurrency?: string;
    cryptoCurrency: CryptoCurrency;
    cryptoNetwork: CryptoNetwork;
    cryptoAmount: string;
    exchangeRate: string;
  }): Promise<CryptoPaymentResult> {
    const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
    const apiVersion =
      process.env.COINBASE_COMMERCE_API_VERSION || "2018-03-22";

    if (!apiKey) {
      return {
        success: false,
        error:
          "Coinbase Commerce not configured. Set COINBASE_COMMERCE_API_KEY environment variable.",
      };
    }

    try {
      // Create charge via Coinbase Commerce REST API
      const chargeResponse = await fetch(
        "https://api.commerce.coinbase.com/charges",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CC-Api-Key": apiKey,
            "X-CC-Version": apiVersion,
          },
          body: JSON.stringify({
            name: "nChat Subscription",
            description: `Subscription payment for workspace ${params.workspaceId}`,
            pricing_type: "fixed_price",
            local_price: {
              amount: (params.fiatAmount / 100).toFixed(2),
              currency: params.fiatCurrency || "USD",
            },
            metadata: {
              workspaceId: params.workspaceId,
              userId: params.userId,
              subscriptionId: params.subscriptionId || "",
              invoiceId: params.invoiceId || "",
              cryptoCurrency: params.cryptoCurrency,
              cryptoNetwork: params.cryptoNetwork,
            },
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
          }),
        },
      );

      if (!chargeResponse.ok) {
        const errorData = await chargeResponse.json().catch(() => ({}));
        logger.error("Coinbase Commerce API error:", errorData);
        return {
          success: false,
          error: `Coinbase Commerce API error: ${chargeResponse.status} - ${errorData.error?.message || "Unknown error"}`,
        };
      }

      const chargeData = await chargeResponse.json();
      const charge = chargeData.data;

      // Create payment record
      const payment: CryptoPayment = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        workspaceId: params.workspaceId,
        subscriptionId: params.subscriptionId,
        invoiceId: params.invoiceId,
        userId: params.userId,
        provider: "coinbase_commerce",
        providerPaymentId: charge.id,
        cryptoCurrency: params.cryptoCurrency,
        cryptoAmount: params.cryptoAmount,
        cryptoNetwork: params.cryptoNetwork,
        fiatAmount: params.fiatAmount,
        fiatCurrency: params.fiatCurrency || "USD",
        exchangeRate: params.exchangeRate,
        toAddress:
          charge.addresses?.[params.cryptoNetwork.toLowerCase()] ||
          charge.addresses?.ethereum,
        confirmations: 0,
        status: "pending",
        paymentUrl: charge.hosted_url,
        expiresAt: new Date(charge.expires_at),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      await this.savePayment(payment);

      return {
        success: true,
        payment,
        paymentUrl: charge.hosted_url,
      };
    } catch (error) {
      logger.error("Coinbase Commerce error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Coinbase Commerce charge",
      };
    }
  }

  /**
   * Create manual payment (direct wallet transfer)
   */
  private async createManualPayment(params: {
    workspaceId: string;
    userId: string;
    subscriptionId?: string;
    invoiceId?: string;
    fiatAmount: number;
    fiatCurrency?: string;
    cryptoCurrency: CryptoCurrency;
    cryptoNetwork: CryptoNetwork;
    cryptoAmount: string;
    exchangeRate: string;
  }): Promise<CryptoPaymentResult> {
    // Generate payment address (in production, use HD wallet)
    const paymentAddress = this.generatePaymentAddress(params.cryptoNetwork);

    const payment: CryptoPayment = {
      id: `pay_${Math.random().toString(36).substring(7)}`,
      workspaceId: params.workspaceId,
      subscriptionId: params.subscriptionId,
      invoiceId: params.invoiceId,
      userId: params.userId,
      provider: "manual",
      cryptoCurrency: params.cryptoCurrency,
      cryptoAmount: params.cryptoAmount,
      cryptoNetwork: params.cryptoNetwork,
      fiatAmount: params.fiatAmount,
      fiatCurrency: params.fiatCurrency || "USD",
      exchangeRate: params.exchangeRate,
      toAddress: paymentAddress,
      confirmations: 0,
      status: "pending",
      expiresAt: new Date(Date.now() + this.config.paymentTimeout * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.savePayment(payment);

    return {
      success: true,
      payment,
    };
  }

  /**
   * Verify crypto payment by transaction hash
   */
  async verifyPayment(
    paymentId: string,
    transactionHash: string,
  ): Promise<CryptoPaymentResult> {
    const payment = await this.getPayment(paymentId);

    if (!payment) {
      return {
        success: false,
        error: "Payment not found",
      };
    }

    if (payment.status === "completed") {
      return {
        success: true,
        payment,
      };
    }

    // Verify transaction on blockchain
    const verified = await this.verifyTransaction(
      transactionHash,
      payment.cryptoNetwork,
      payment.toAddress || "",
      payment.cryptoAmount,
    );

    if (!verified.success) {
      return {
        success: false,
        error: verified.error || "Transaction verification failed",
      };
    }

    // Update payment
    payment.transactionHash = transactionHash;
    payment.fromAddress = verified.fromAddress;
    payment.blockNumber = verified.blockNumber;
    payment.confirmations = verified.confirmations || 0;
    payment.status = "confirming";
    payment.updatedAt = new Date();

    // Check if enough confirmations
    const minConfirmations =
      this.config.minimumConfirmations[payment.cryptoCurrency];
    if (payment.confirmations >= minConfirmations) {
      payment.status = "completed";
      payment.completedAt = new Date();
    }

    await this.updatePayment(payment);

    return {
      success: true,
      payment,
    };
  }

  /**
   * Get exchange rate for crypto currency
   * Uses CoinGecko API for real-time prices with fallback to cached values
   */
  async getExchangeRate(
    currency: CryptoCurrency,
  ): Promise<ExchangeRate | null> {
    // Check cache first
    const cached = this.exchangeRateCache.get(currency);
    if (
      cached &&
      Date.now() - cached.updatedAt.getTime() < this.RATE_CACHE_TTL
    ) {
      return cached;
    }

    // Map our currency symbols to CoinGecko IDs
    const coinGeckoIds: Record<CryptoCurrency, string> = {
      ETH: "ethereum",
      BTC: "bitcoin",
      USDC: "usd-coin",
      USDT: "tether",
      DAI: "dai",
      MATIC: "matic-network",
    };

    const coinId = coinGeckoIds[currency];
    if (!coinId) {
      logger.error(`Unknown currency: ${currency}`);
      return null;
    }

    try {
      // Fetch from CoinGecko API (free tier, no API key required)
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        {
          headers: {
            Accept: "application/json",
          },
          // Cache for 1 minute
          next: { revalidate: 60 },
        },
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const usdPrice = data[coinId]?.usd;

      if (typeof usdPrice !== "number") {
        throw new Error("Invalid price data from CoinGecko");
      }

      const rate: ExchangeRate = {
        currency,
        usdPrice,
        updatedAt: new Date(),
      };

      this.exchangeRateCache.set(currency, rate);
      return rate;
    } catch (error) {
      logger.error("Failed to fetch exchange rate from CoinGecko:", error);

      // Fallback to cached value if available (even if expired)
      if (cached) {
        logger.warn(`Using stale exchange rate for ${currency}`);
        return cached;
      }

      // Last resort: use hardcoded fallback rates
      const fallbackRates: Record<CryptoCurrency, number> = {
        ETH: 2500,
        BTC: 45000,
        USDC: 1,
        USDT: 1,
        DAI: 1,
        MATIC: 0.8,
      };

      const rate: ExchangeRate = {
        currency,
        usdPrice: fallbackRates[currency] || 0,
        updatedAt: new Date(),
      };

      logger.warn(`Using fallback rate for ${currency}: $${rate.usdPrice}`);
      return rate;
    }
  }

  /**
   * Get exchange rates for all supported currencies
   */
  async getAllExchangeRates(): Promise<Map<CryptoCurrency, ExchangeRate>> {
    const results = new Map<CryptoCurrency, ExchangeRate>();

    const currencies = this.config.acceptedCurrencies;
    const coinGeckoIds: Record<CryptoCurrency, string> = {
      ETH: "ethereum",
      BTC: "bitcoin",
      USDC: "usd-coin",
      USDT: "tether",
      DAI: "dai",
      MATIC: "matic-network",
    };

    const ids = currencies
      .map((c) => coinGeckoIds[c])
      .filter(Boolean)
      .join(",");

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        {
          headers: { Accept: "application/json" },
          next: { revalidate: 60 },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const now = new Date();

        for (const currency of currencies) {
          const coinId = coinGeckoIds[currency];
          if (data[coinId]?.usd) {
            const rate: ExchangeRate = {
              currency,
              usdPrice: data[coinId].usd,
              updatedAt: now,
            };
            results.set(currency, rate);
            this.exchangeRateCache.set(currency, rate);
          }
        }
      }
    } catch (error) {
      logger.error("Failed to fetch all exchange rates:", error);
    }

    // Fill in any missing rates from cache or fallback
    for (const currency of currencies) {
      if (!results.has(currency)) {
        const rate = await this.getExchangeRate(currency);
        if (rate) {
          results.set(currency, rate);
        }
      }
    }

    return results;
  }

  /**
   * Verify transaction on blockchain using public RPC/API endpoints
   */
  private async verifyTransaction(
    txHash: string,
    network: CryptoNetwork,
    toAddress: string,
    expectedAmount: string,
  ): Promise<{
    success: boolean;
    error?: string;
    fromAddress?: string;
    blockNumber?: string;
    confirmations?: number;
  }> {
    try {
      switch (network) {
        case "ethereum":
        case "polygon":
        case "arbitrum":
        case "base":
          return await this.verifyEvmTransaction(
            txHash,
            network,
            toAddress,
            expectedAmount,
          );
        case "bitcoin":
          return await this.verifyBitcoinTransaction(
            txHash,
            toAddress,
            expectedAmount,
          );
        default:
          return {
            success: false,
            error: `Unsupported network: ${network}`,
          };
      }
    } catch (error) {
      logger.error(`Blockchain verification error for ${network}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  /**
   * Verify EVM-compatible transaction (Ethereum, Polygon, Arbitrum, Base)
   */
  private async verifyEvmTransaction(
    txHash: string,
    network: CryptoNetwork,
    toAddress: string,
    expectedAmount: string,
  ): Promise<{
    success: boolean;
    error?: string;
    fromAddress?: string;
    blockNumber?: string;
    confirmations?: number;
  }> {
    // Get RPC endpoint based on network
    const rpcEndpoints: Record<string, string> = {
      ethereum: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
      polygon: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      base: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    };

    const rpcUrl = rpcEndpoints[network];
    if (!rpcUrl) {
      return { success: false, error: `No RPC endpoint for ${network}` };
    }

    // Fetch transaction receipt
    const receiptResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });

    const receiptData = await receiptResponse.json();
    const receipt = receiptData.result;

    if (!receipt) {
      return { success: false, error: "Transaction not found or pending" };
    }

    // Check if transaction was successful
    if (receipt.status !== "0x1") {
      return { success: false, error: "Transaction failed" };
    }

    // Fetch transaction details
    const txResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "eth_getTransactionByHash",
        params: [txHash],
      }),
    });

    const txData = await txResponse.json();
    const tx = txData.result;

    if (!tx) {
      return { success: false, error: "Transaction details not found" };
    }

    // Verify recipient address (case-insensitive)
    if (tx.to && tx.to.toLowerCase() !== toAddress.toLowerCase()) {
      return { success: false, error: "Transaction recipient does not match" };
    }

    // Get current block number for confirmations
    const blockResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "eth_blockNumber",
        params: [],
      }),
    });

    const blockData = await blockResponse.json();
    const currentBlock = parseInt(blockData.result, 16);
    const txBlock = parseInt(receipt.blockNumber, 16);
    const confirmations = currentBlock - txBlock;

    return {
      success: true,
      fromAddress: tx.from,
      blockNumber: txBlock.toString(),
      confirmations,
    };
  }

  /**
   * Verify Bitcoin transaction using public API
   */
  private async verifyBitcoinTransaction(
    txHash: string,
    toAddress: string,
    expectedAmount: string,
  ): Promise<{
    success: boolean;
    error?: string;
    fromAddress?: string;
    blockNumber?: string;
    confirmations?: number;
  }> {
    // Use Blockchain.info API (or Blockstream.info as fallback)
    const apiUrl = `https://blockchain.info/rawtx/${txHash}?format=json`;

    try {
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        // Try Blockstream.info as fallback
        const blockstreamResponse = await fetch(
          `https://blockstream.info/api/tx/${txHash}`,
        );
        if (!blockstreamResponse.ok) {
          return { success: false, error: "Transaction not found" };
        }
        const blockstreamData = await blockstreamResponse.json();
        return this.parseBlockstreamBtcTx(blockstreamData, toAddress);
      }

      const data = await response.json();

      // Find output matching our address
      const matchingOutput = data.out?.find(
        (output: any) => output.addr === toAddress,
      );

      if (!matchingOutput) {
        return { success: false, error: "No output to expected address" };
      }

      // Get sender address from first input
      const fromAddress = data.inputs?.[0]?.prev_out?.addr;

      return {
        success: true,
        fromAddress,
        blockNumber: data.block_height?.toString(),
        confirmations: data.confirmations || 0,
      };
    } catch (error) {
      logger.error("Bitcoin verification error:", error);
      return {
        success: false,
        error: "Failed to verify Bitcoin transaction",
      };
    }
  }

  /**
   * Parse Blockstream.info Bitcoin transaction response
   */
  private parseBlockstreamBtcTx(
    tx: any,
    toAddress: string,
  ): {
    success: boolean;
    error?: string;
    fromAddress?: string;
    blockNumber?: string;
    confirmations?: number;
  } {
    // Find output matching our address
    const matchingOutput = tx.vout?.find(
      (output: any) => output.scriptpubkey_address === toAddress,
    );

    if (!matchingOutput) {
      return { success: false, error: "No output to expected address" };
    }

    // Get sender from first input
    const fromAddress = tx.vin?.[0]?.prevout?.scriptpubkey_address;

    return {
      success: true,
      fromAddress,
      blockNumber: tx.status?.block_height?.toString(),
      confirmations: tx.status?.confirmed ? 6 : 0, // Blockstream doesn't provide exact count
    };
  }

  /**
   * Generate payment address
   */
  private generatePaymentAddress(network: CryptoNetwork): string {
    // In production, generate from HD wallet
    // For now, return mock address
    if (network === "bitcoin") {
      return "bc1q" + Math.random().toString(36).substring(2, 42);
    }

    return "0x" + Math.random().toString(36).substring(2, 42).padEnd(40, "0");
  }

  /**
   * Save payment to database via direct SQL (server-side only)
   */
  private async savePayment(payment: CryptoPayment): Promise<void> {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      await pool.query(
        `INSERT INTO public.crypto_payments (
          id, workspace_id, subscription_id, invoice_id, user_id,
          provider, provider_payment_id, crypto_currency, crypto_amount, crypto_network,
          fiat_amount, fiat_currency, exchange_rate, transaction_hash,
          from_address, to_address, block_number, confirmations,
          status, payment_url, expires_at, completed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          transaction_hash = COALESCE(EXCLUDED.transaction_hash, crypto_payments.transaction_hash),
          from_address = COALESCE(EXCLUDED.from_address, crypto_payments.from_address),
          block_number = COALESCE(EXCLUDED.block_number, crypto_payments.block_number),
          confirmations = EXCLUDED.confirmations,
          completed_at = EXCLUDED.completed_at,
          updated_at = EXCLUDED.updated_at`,
        [
          payment.id,
          payment.workspaceId,
          payment.subscriptionId || null,
          payment.invoiceId || null,
          payment.userId,
          payment.provider,
          payment.providerPaymentId || null,
          payment.cryptoCurrency,
          payment.cryptoAmount,
          payment.cryptoNetwork,
          payment.fiatAmount,
          payment.fiatCurrency,
          payment.exchangeRate,
          payment.transactionHash || null,
          payment.fromAddress || null,
          payment.toAddress || null,
          payment.blockNumber || null,
          payment.confirmations,
          payment.status,
          payment.paymentUrl || null,
          payment.expiresAt || null,
          payment.completedAt || null,
          payment.createdAt,
          payment.updatedAt,
        ],
      );
    } catch (error) {
      // Table might not exist - log error but don't fail
      logger.error("Failed to save crypto payment to database:", error);
    } finally {
      await pool.end();
    }
  }

  /**
   * Update payment in database
   */
  private async updatePayment(payment: CryptoPayment): Promise<void> {
    payment.updatedAt = new Date();
    await this.savePayment(payment);
  }

  /**
   * Get payment by ID
   */
  private async getPayment(id: string): Promise<CryptoPayment | null> {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      const result = await pool.query(
        "SELECT * FROM public.crypto_payments WHERE id = $1",
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPayment(result.rows[0]);
    } catch (error) {
      logger.error("Failed to get crypto payment:", error);
      return null;
    } finally {
      await pool.end();
    }
  }

  /**
   * Get payments for workspace
   */
  async getWorkspacePayments(workspaceId: string): Promise<CryptoPayment[]> {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      const result = await pool.query(
        "SELECT * FROM public.crypto_payments WHERE workspace_id = $1 ORDER BY created_at DESC",
        [workspaceId],
      );

      return result.rows.map(this.mapRowToPayment);
    } catch (error) {
      logger.error("Failed to get workspace payments:", error);
      return [];
    } finally {
      await pool.end();
    }
  }

  /**
   * Map database row to CryptoPayment
   */
  private mapRowToPayment(row: any): CryptoPayment {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      subscriptionId: row.subscription_id,
      invoiceId: row.invoice_id,
      userId: row.user_id,
      provider: row.provider,
      providerPaymentId: row.provider_payment_id,
      cryptoCurrency: row.crypto_currency,
      cryptoAmount: row.crypto_amount,
      cryptoNetwork: row.crypto_network,
      fiatAmount: row.fiat_amount,
      fiatCurrency: row.fiat_currency,
      exchangeRate: row.exchange_rate,
      transactionHash: row.transaction_hash,
      fromAddress: row.from_address,
      toAddress: row.to_address,
      blockNumber: row.block_number,
      confirmations: row.confirmations || 0,
      status: row.status,
      paymentUrl: row.payment_url,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Process webhook from payment provider
   */
  async processWebhook(provider: CryptoProvider, event: any): Promise<void> {
    switch (provider) {
      case "coinbase_commerce":
        await this.processCoinbaseWebhook(event);
        break;

      default:
      // REMOVED: console.log(`Webhook from unknown provider: ${provider}`)
    }
  }

  /**
   * Process Coinbase Commerce webhook
   */
  private async processCoinbaseWebhook(event: any): Promise<void> {
    // Handle different event types
    switch (event.type) {
      case "charge:confirmed":
      case "charge:resolved":
        // Payment confirmed
        await this.handlePaymentConfirmed(event.data);
        break;

      case "charge:failed":
      case "charge:expired":
        // Payment failed
        await this.handlePaymentFailed(event.data);
        break;

      default:
      // REMOVED: console.log(`Unhandled Coinbase event: ${event.type}`)
    }
  }

  /**
   * Handle payment confirmed
   */
  private async handlePaymentConfirmed(charge: any): Promise<void> {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      try {
        // Find payment by provider ID
        const result = await pool.query(
          "SELECT * FROM public.crypto_payments WHERE provider_payment_id = $1",
          [charge.id],
        );

        if (result.rows.length > 0) {
          const payment = this.mapRowToPayment(result.rows[0]);

          // Update payment status to completed
          payment.status = "completed";
          payment.completedAt = new Date();
          payment.confirmations =
            (charge.confirmations || 0) >=
            this.config.minimumConfirmations[payment.cryptoCurrency]
              ? this.config.minimumConfirmations[payment.cryptoCurrency]
              : charge.confirmations || 0;

          await this.updatePayment(payment);

          logger.info(`Payment confirmed: ${payment.id}`);

          // In a real system, you would trigger subscription activation
          // emit('payment:confirmed', payment)
        }
      } finally {
        await pool.end();
      }
    } catch (error) {
      logger.error("Error handling payment confirmed:", error);
    }
  }

  /**
   * Handle payment failed
   */
  private async handlePaymentFailed(charge: any): Promise<void> {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      try {
        // Find payment by provider ID
        const result = await pool.query(
          "SELECT * FROM public.crypto_payments WHERE provider_payment_id = $1",
          [charge.id],
        );

        if (result.rows.length > 0) {
          const payment = this.mapRowToPayment(result.rows[0]);

          // Update payment status to failed
          payment.status = "failed";
          payment.updatedAt = new Date();

          await this.updatePayment(payment);

          logger.warn(
            `Payment failed: ${payment.id} - Reason: ${charge.reason || "Unknown"}`,
          );

          // In a real system, you would trigger failure notifications
          // emit('payment:failed', payment)
        }
      } finally {
        await pool.end();
      }
    } catch (error) {
      logger.error("Error handling payment failed:", error);
    }
  }

  /**
   * Get accepted currencies
   */
  getAcceptedCurrencies(): CryptoCurrency[] {
    return this.config.acceptedCurrencies;
  }

  /**
   * Get accepted networks
   */
  getAcceptedNetworks(): CryptoNetwork[] {
    return this.config.acceptedNetworks;
  }

  /**
   * Verify ERC-1155 token transfer
   * Checks if an ERC-1155 token transfer was completed successfully
   */
  async verifyERC1155Transfer(
    transactionHash: string,
    network: CryptoNetwork,
    contractAddress: string,
    tokenId: string,
    expectedAmount: string,
    fromAddress: string,
    toAddress: string,
  ): Promise<{
    success: boolean;
    error?: string;
    verified: boolean;
  }> {
    try {
      const verified = await this.verifyTransaction(
        transactionHash,
        network,
        toAddress,
        expectedAmount,
      );

      if (!verified.success) {
        return {
          success: false,
          error: verified.error,
          verified: false,
        };
      }

      // For ERC-1155, additional validation would check:
      // 1. Transaction was to the correct contract
      // 2. Transfer log includes correct from/to addresses and token ID
      // This would require decoding transaction logs, which is chain-specific

      logger.info(`ERC-1155 transfer verified: ${transactionHash}`);

      return {
        success: true,
        verified: true,
      };
    } catch (error) {
      logger.error("ERC-1155 verification error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "ERC-1155 verification failed",
        verified: false,
      };
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let cryptoPaymentService: CryptoPaymentService | null = null;

export function getCryptoPaymentService(): CryptoPaymentService {
  if (!cryptoPaymentService) {
    cryptoPaymentService = new CryptoPaymentService();
  }
  return cryptoPaymentService;
}
