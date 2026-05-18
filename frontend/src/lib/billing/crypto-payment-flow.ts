/**
 * Crypto Payment Flow - Core State Machine & Pipeline
 *
 * Provides a robust, deterministic crypto payment pipeline with:
 * - Payment address generation (BIP-44 style HD wallet derivation)
 * - Configurable per-chain confirmation tracking
 * - Time-windowed payment expiry with automatic cancellation
 * - Deterministic state machine (created -> pending -> confirming -> confirmed -> completed)
 * - Reconciliation (balance checks, orphan detection, overpayment/underpayment handling)
 * - Multi-chain support (ETH, BTC, Polygon) with abstraction for more
 *
 * @module @/lib/billing/crypto-payment-flow
 * @version 1.0.0
 */

import { createHmac } from "crypto";
import { logger } from "@/lib/logger";
import {
  SecurityCheckCode,
  type SecurityCheckResult,
  type CryptoTransactionInput,
  isValidEthAddress,
  isValidBtcAddress,
  isValidTxHash,
} from "@/lib/billing/payment-security";

// ============================================================================
// Types & Enums
// ============================================================================

/**
 * Payment flow states - deterministic transitions only.
 */
export enum PaymentFlowState {
  /** Payment created, address generated, awaiting blockchain tx */
  CREATED = "created",
  /** Transaction detected on-chain but 0 confirmations */
  PENDING = "pending",
  /** Transaction has >0 confirmations but below threshold */
  CONFIRMING = "confirming",
  /** Transaction has met confirmation threshold */
  CONFIRMED = "confirmed",
  /** Payment fully processed and credited */
  COMPLETED = "completed",
  /** Payment window expired without sufficient confirmation */
  EXPIRED = "expired",
  /** Payment failed (reorg, double-spend, security rejection) */
  FAILED = "failed",
  /** Refund initiated for overpayment */
  REFUNDING = "refunding",
}

/**
 * Supported blockchain networks.
 */
export enum ChainNetwork {
  ETHEREUM = "ethereum",
  BITCOIN = "bitcoin",
  POLYGON = "polygon",
}

/**
 * Supported crypto currencies.
 */
export type FlowCryptoCurrency =
  | "ETH"
  | "BTC"
  | "MATIC"
  | "USDC"
  | "USDT"
  | "DAI";

/**
 * Chain-specific configuration.
 */
export interface ChainConfig {
  network: ChainNetwork;
  requiredConfirmations: number;
  avgBlockTimeMs: number;
  nativeCurrency: FlowCryptoCurrency;
  supportedTokens: FlowCryptoCurrency[];
  addressValidator: (address: string) => boolean;
  txHashValidator: (hash: string) => boolean;
}

/**
 * Payment flow configuration.
 */
export interface PaymentFlowConfig {
  /** Payment expiry window in milliseconds (default: 30 minutes) */
  paymentWindowMs: number;
  /** Polling interval for confirmation checks in ms */
  pollIntervalMs: number;
  /** Underpayment tolerance as a fraction (e.g., 0.02 = 2%) */
  underpaymentTolerance: number;
  /** Grace period for underpayment in ms before marking failed */
  underpaymentGracePeriodMs: number;
  /** Overpayment threshold as a fraction (e.g., 0.001 = 0.1%) */
  overpaymentThreshold: number;
  /** Chain-specific configurations */
  chains: Map<ChainNetwork, ChainConfig>;
  /** Master seed for HD wallet derivation (hex string) */
  masterSeed: string;
}

/**
 * State transition log entry.
 */
export interface StateTransitionLog {
  fromState: PaymentFlowState;
  toState: PaymentFlowState;
  trigger: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * A payment in the flow pipeline.
 */
export interface CryptoPaymentRecord {
  id: string;
  workspaceId: string;
  userId: string;
  subscriptionId?: string;
  invoiceId?: string;

  /** Blockchain details */
  network: ChainNetwork;
  currency: FlowCryptoCurrency;
  expectedAmount: string;
  receivedAmount: string;
  paymentAddress: string;
  derivationIndex: number;

  /** Transaction tracking */
  txHash?: string;
  fromAddress?: string;
  blockNumber?: number;
  confirmations: number;
  requiredConfirmations: number;

  /** Fiat conversion snapshot */
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: string;

  /** State machine */
  state: PaymentFlowState;
  stateHistory: StateTransitionLog[];
  version: number;

  /** Timing */
  createdAt: number;
  expiresAt: number;
  pendingAt?: number;
  confirmingAt?: number;
  confirmedAt?: number;
  completedAt?: number;
  expiredAt?: number;
  failedAt?: number;
  failureReason?: string;

  /** Reconciliation */
  isOverpayment: boolean;
  overpaymentAmount: string;
  isUnderpayment: boolean;
  underpaymentAmount: string;
  underpaymentDeadline?: number;
  reconciled: boolean;
  reconciledAt?: number;
}

/**
 * Result of a state transition attempt.
 */
export interface TransitionResult {
  success: boolean;
  previousState: PaymentFlowState;
  newState: PaymentFlowState;
  error?: string;
  payment: CryptoPaymentRecord;
}

/**
 * Result of a reconciliation run.
 */
export interface ReconciliationResult {
  totalPayments: number;
  balanced: number;
  overpayments: CryptoPaymentRecord[];
  underpayments: CryptoPaymentRecord[];
  orphans: CryptoPaymentRecord[];
  expired: CryptoPaymentRecord[];
  issues: string[];
}

/**
 * Address generation result.
 */
export interface GeneratedAddress {
  address: string;
  derivationIndex: number;
  network: ChainNetwork;
}

// ============================================================================
// Default Chain Configurations
// ============================================================================

export const DEFAULT_CHAIN_CONFIGS: Record<string, ChainConfig> = {
  [ChainNetwork.ETHEREUM]: {
    network: ChainNetwork.ETHEREUM,
    requiredConfirmations: 12,
    avgBlockTimeMs: 12_000,
    nativeCurrency: "ETH",
    supportedTokens: ["ETH", "USDC", "USDT", "DAI"],
    addressValidator: isValidEthAddress,
    txHashValidator: (hash: string) => isValidTxHash(hash, "ethereum"),
  },
  [ChainNetwork.BITCOIN]: {
    network: ChainNetwork.BITCOIN,
    requiredConfirmations: 6,
    avgBlockTimeMs: 600_000,
    nativeCurrency: "BTC",
    supportedTokens: ["BTC"],
    addressValidator: isValidBtcAddress,
    txHashValidator: (hash: string) => isValidTxHash(hash, "bitcoin"),
  },
  [ChainNetwork.POLYGON]: {
    network: ChainNetwork.POLYGON,
    requiredConfirmations: 30,
    avgBlockTimeMs: 2_000,
    nativeCurrency: "MATIC",
    supportedTokens: ["MATIC", "USDC", "USDT", "DAI"],
    addressValidator: isValidEthAddress,
    txHashValidator: (hash: string) => isValidTxHash(hash, "ethereum"),
  },
};

export const DEFAULT_PAYMENT_FLOW_CONFIG: Omit<
  PaymentFlowConfig,
  "masterSeed"
> = {
  paymentWindowMs: 30 * 60 * 1000, // 30 minutes
  pollIntervalMs: 15_000, // 15 seconds
  underpaymentTolerance: 0.02, // 2%
  underpaymentGracePeriodMs: 15 * 60 * 1000, // 15 minutes
  overpaymentThreshold: 0.001, // 0.1%
  chains: new Map(
    Object.entries(DEFAULT_CHAIN_CONFIGS).map(([key, val]) => [
      key as ChainNetwork,
      val,
    ]),
  ),
};

// ============================================================================
// State Transition Matrix
// ============================================================================

/**
 * Valid state transitions. Key = fromState, Value = set of allowed toStates.
 * This is the single source of truth for deterministic transitions.
 */
const VALID_TRANSITIONS: Record<PaymentFlowState, Set<PaymentFlowState>> = {
  [PaymentFlowState.CREATED]: new Set([
    PaymentFlowState.PENDING,
    PaymentFlowState.EXPIRED,
    PaymentFlowState.FAILED,
  ]),
  [PaymentFlowState.PENDING]: new Set([
    PaymentFlowState.CONFIRMING,
    PaymentFlowState.EXPIRED,
    PaymentFlowState.FAILED,
  ]),
  [PaymentFlowState.CONFIRMING]: new Set([
    PaymentFlowState.CONFIRMED,
    PaymentFlowState.EXPIRED,
    PaymentFlowState.FAILED,
  ]),
  [PaymentFlowState.CONFIRMED]: new Set([
    PaymentFlowState.COMPLETED,
    PaymentFlowState.REFUNDING,
    PaymentFlowState.FAILED,
  ]),
  [PaymentFlowState.COMPLETED]: new Set([PaymentFlowState.REFUNDING]),
  [PaymentFlowState.EXPIRED]: new Set([]),
  [PaymentFlowState.FAILED]: new Set([]),
  [PaymentFlowState.REFUNDING]: new Set([PaymentFlowState.COMPLETED]),
};

// ============================================================================
// HD Wallet Address Generator
// ============================================================================

/**
 * Deterministic address generation using HMAC-based derivation (BIP-44 style).
 * For a given (masterSeed, network, paymentId), always produces the same address.
 *
 * In a production system this would use actual BIP-32/44 key derivation.
 * This implementation uses HMAC-SHA256 to derive deterministic,
 * unique-per-payment addresses from a master seed.
 */
export class HDAddressGenerator {
  private masterSeed: string;
  private usedIndices: Map<ChainNetwork, Set<number>> = new Map();
  private addressToPaymentId: Map<string, string> = new Map();
  private nextIndex: Map<ChainNetwork, number> = new Map();

  constructor(masterSeed: string) {
    this.masterSeed = masterSeed;
    for (const network of Object.values(ChainNetwork)) {
      this.usedIndices.set(network, new Set());
      this.nextIndex.set(network, 0);
    }
  }

  /**
   * Generate a deterministic address for a given payment ID and network.
   * Same inputs always produce the same output (idempotent).
   */
  deriveAddress(paymentId: string, network: ChainNetwork): GeneratedAddress {
    // Deterministic derivation index from paymentId
    const indexHmac = createHmac("sha256", this.masterSeed)
      .update(`index:${network}:${paymentId}`)
      .digest();
    const derivationIndex = indexHmac.readUInt32BE(0);

    // Derive the address deterministically
    const addressHmac = createHmac("sha256", this.masterSeed)
      .update(`addr:${network}:${derivationIndex}:${paymentId}`)
      .digest("hex");

    let address: string;
    if (network === ChainNetwork.BITCOIN) {
      // Produce a bech32-like address (bc1q + 40 hex chars)
      address = "bc1q" + addressHmac.substring(0, 40);
    } else {
      // Produce an EVM address (0x + 40 hex chars)
      address = "0x" + addressHmac.substring(0, 40);
    }

    // Track usage
    const indices = this.usedIndices.get(network)!;
    indices.add(derivationIndex);
    this.addressToPaymentId.set(address.toLowerCase(), paymentId);

    return {
      address,
      derivationIndex,
      network,
    };
  }

  /**
   * Allocate the next sequential index for a network.
   * Returns a unique, monotonically increasing index.
   */
  allocateNextIndex(network: ChainNetwork): number {
    const current = this.nextIndex.get(network) || 0;
    const indices = this.usedIndices.get(network)!;

    let idx = current;
    while (indices.has(idx)) {
      idx++;
    }
    indices.add(idx);
    this.nextIndex.set(network, idx + 1);
    return idx;
  }

  /**
   * Check if an address has been generated by this generator.
   */
  isOurAddress(address: string): boolean {
    return this.addressToPaymentId.has(address.toLowerCase());
  }

  /**
   * Get the payment ID associated with an address.
   */
  getPaymentIdForAddress(address: string): string | undefined {
    return this.addressToPaymentId.get(address.toLowerCase());
  }

  /**
   * Check if a derivation index is already in use.
   */
  isIndexUsed(network: ChainNetwork, index: number): boolean {
    return this.usedIndices.get(network)?.has(index) ?? false;
  }

  /**
   * Get all used indices for a network.
   */
  getUsedIndices(network: ChainNetwork): number[] {
    return Array.from(this.usedIndices.get(network) || []);
  }

  /**
   * Clear all tracked state (for testing).
   */
  clear(): void {
    for (const network of Object.values(ChainNetwork)) {
      this.usedIndices.set(network, new Set());
      this.nextIndex.set(network, 0);
    }
    this.addressToPaymentId.clear();
  }
}

// ============================================================================
// Confirmation Tracker
// ============================================================================

/**
 * Tracks confirmation progress for crypto payments across chains.
 */
export class ConfirmationTracker {
  private chainConfigs: Map<ChainNetwork, ChainConfig>;

  constructor(chainConfigs?: Map<ChainNetwork, ChainConfig>) {
    this.chainConfigs = chainConfigs || DEFAULT_PAYMENT_FLOW_CONFIG.chains;
  }

  /**
   * Get required confirmations for a network.
   */
  getRequiredConfirmations(network: ChainNetwork): number {
    const config = this.chainConfigs.get(network);
    if (!config) {
      throw new Error(`Unsupported network: ${network}`);
    }
    return config.requiredConfirmations;
  }

  /**
   * Check if confirmations meet the threshold.
   */
  isConfirmed(network: ChainNetwork, confirmations: number): boolean {
    const required = this.getRequiredConfirmations(network);
    return confirmations >= required;
  }

  /**
   * Calculate estimated time remaining until confirmed.
   */
  estimateTimeToConfirmation(
    network: ChainNetwork,
    currentConfirmations: number,
  ): number {
    const config = this.chainConfigs.get(network);
    if (!config) return 0;
    const remaining = Math.max(
      0,
      config.requiredConfirmations - currentConfirmations,
    );
    return remaining * config.avgBlockTimeMs;
  }

  /**
   * Get confirmation progress as a percentage (0-100).
   */
  getProgress(network: ChainNetwork, confirmations: number): number {
    const required = this.getRequiredConfirmations(network);
    if (required === 0) return 100;
    return Math.min(100, Math.round((confirmations / required) * 100));
  }

  /**
   * Detect a potential block reorganization (confirmations decreased).
   */
  detectReorg(
    previousConfirmations: number,
    currentConfirmations: number,
  ): boolean {
    return currentConfirmations < previousConfirmations;
  }

  /**
   * Get the chain config for a network.
   */
  getChainConfig(network: ChainNetwork): ChainConfig | undefined {
    return this.chainConfigs.get(network);
  }

  /**
   * Validate a transaction hash format for a network.
   */
  isValidTxHash(network: ChainNetwork, hash: string): boolean {
    const config = this.chainConfigs.get(network);
    if (!config) return false;
    return config.txHashValidator(hash);
  }

  /**
   * Validate an address format for a network.
   */
  isValidAddress(network: ChainNetwork, address: string): boolean {
    const config = this.chainConfigs.get(network);
    if (!config) return false;
    return config.addressValidator(address);
  }
}

// ============================================================================
// Payment Flow State Machine
// ============================================================================

/**
 * Core state machine for crypto payment flow.
 * Enforces deterministic state transitions with full audit trail.
 */
export class CryptoPaymentFlowMachine {
  private config: PaymentFlowConfig;
  private addressGenerator: HDAddressGenerator;
  private confirmationTracker: ConfirmationTracker;
  private payments: Map<string, CryptoPaymentRecord> = new Map();
  private addressIndex: Map<string, string> = new Map(); // address -> paymentId
  private log = logger.scope("CryptoPaymentFlow");

  constructor(config: PaymentFlowConfig) {
    this.config = config;
    this.addressGenerator = new HDAddressGenerator(config.masterSeed);
    this.confirmationTracker = new ConfirmationTracker(config.chains);
  }

  // --------------------------------------------------------------------------
  // Payment Creation
  // --------------------------------------------------------------------------

  /**
   * Create a new payment record with a unique, deterministic address.
   */
  createPayment(params: {
    id: string;
    workspaceId: string;
    userId: string;
    network: ChainNetwork;
    currency: FlowCryptoCurrency;
    expectedAmount: string;
    fiatAmount: number;
    fiatCurrency: string;
    exchangeRate: string;
    subscriptionId?: string;
    invoiceId?: string;
    now?: number;
  }): CryptoPaymentRecord {
    const now = params.now ?? Date.now();

    // Validate network support
    const chainConfig = this.config.chains.get(params.network);
    if (!chainConfig) {
      throw new Error(`Unsupported network: ${params.network}`);
    }

    // Validate currency is supported on this network
    if (!chainConfig.supportedTokens.includes(params.currency)) {
      throw new Error(
        `Currency ${params.currency} is not supported on ${params.network}`,
      );
    }

    // Check for duplicate payment ID
    if (this.payments.has(params.id)) {
      throw new Error(`Payment ${params.id} already exists`);
    }

    // Generate deterministic payment address
    const generated = this.addressGenerator.deriveAddress(
      params.id,
      params.network,
    );

    // Ensure address uniqueness
    if (this.addressIndex.has(generated.address.toLowerCase())) {
      throw new Error(
        `Address collision detected for payment ${params.id}. This should not happen with a proper seed.`,
      );
    }

    const payment: CryptoPaymentRecord = {
      id: params.id,
      workspaceId: params.workspaceId,
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      invoiceId: params.invoiceId,
      network: params.network,
      currency: params.currency,
      expectedAmount: params.expectedAmount,
      receivedAmount: "0",
      paymentAddress: generated.address,
      derivationIndex: generated.derivationIndex,
      txHash: undefined,
      fromAddress: undefined,
      blockNumber: undefined,
      confirmations: 0,
      requiredConfirmations: chainConfig.requiredConfirmations,
      fiatAmount: params.fiatAmount,
      fiatCurrency: params.fiatCurrency,
      exchangeRate: params.exchangeRate,
      state: PaymentFlowState.CREATED,
      stateHistory: [],
      version: 0,
      createdAt: now,
      expiresAt: now + this.config.paymentWindowMs,
      isOverpayment: false,
      overpaymentAmount: "0",
      isUnderpayment: false,
      underpaymentAmount: "0",
      reconciled: false,
    };

    this.payments.set(params.id, payment);
    this.addressIndex.set(generated.address.toLowerCase(), params.id);

    this.log.info("Payment created", {
      paymentId: params.id,
      network: params.network,
      currency: params.currency,
      amount: params.expectedAmount,
      address: generated.address,
    });

    return { ...payment };
  }

  // --------------------------------------------------------------------------
  // State Transitions
  // --------------------------------------------------------------------------

  /**
   * Check if a transition from current state to target state is valid.
   */
  isValidTransition(
    fromState: PaymentFlowState,
    toState: PaymentFlowState,
  ): boolean {
    const allowed = VALID_TRANSITIONS[fromState];
    return allowed ? allowed.has(toState) : false;
  }

  /**
   * Get all valid transitions from a given state.
   */
  getValidTransitions(state: PaymentFlowState): PaymentFlowState[] {
    const transitions = VALID_TRANSITIONS[state];
    return transitions ? Array.from(transitions) : [];
  }

  /**
   * Execute a state transition with compare-and-swap semantics.
   * The expectedVersion parameter prevents race conditions by ensuring
   * no concurrent modification has occurred.
   */
  transition(
    paymentId: string,
    toState: PaymentFlowState,
    trigger: string,
    expectedVersion: number,
    metadata?: Record<string, unknown>,
    now?: number,
  ): TransitionResult {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return {
        success: false,
        previousState: PaymentFlowState.CREATED,
        newState: PaymentFlowState.CREATED,
        error: `Payment ${paymentId} not found`,
        payment: this.emptyPayment(paymentId),
      };
    }

    // Compare-and-swap: reject if version mismatch (race condition protection)
    if (payment.version !== expectedVersion) {
      return {
        success: false,
        previousState: payment.state,
        newState: payment.state,
        error: `Version mismatch: expected ${expectedVersion}, got ${payment.version}. Concurrent modification detected.`,
        payment: { ...payment },
      };
    }

    const fromState = payment.state;

    // Validate transition
    if (!this.isValidTransition(fromState, toState)) {
      return {
        success: false,
        previousState: fromState,
        newState: fromState,
        error: `Invalid transition from ${fromState} to ${toState}`,
        payment: { ...payment },
      };
    }

    const timestamp = now ?? Date.now();

    // Record state transition in history
    const logEntry: StateTransitionLog = {
      fromState,
      toState,
      trigger,
      timestamp,
      metadata,
    };
    payment.stateHistory.push(logEntry);

    // Update state and version atomically
    payment.state = toState;
    payment.version += 1;

    // Set state-specific timestamps
    switch (toState) {
      case PaymentFlowState.PENDING:
        payment.pendingAt = timestamp;
        break;
      case PaymentFlowState.CONFIRMING:
        payment.confirmingAt = timestamp;
        break;
      case PaymentFlowState.CONFIRMED:
        payment.confirmedAt = timestamp;
        break;
      case PaymentFlowState.COMPLETED:
        payment.completedAt = timestamp;
        break;
      case PaymentFlowState.EXPIRED:
        payment.expiredAt = timestamp;
        break;
      case PaymentFlowState.FAILED:
        payment.failedAt = timestamp;
        if (metadata?.reason) {
          payment.failureReason = String(metadata.reason);
        }
        break;
    }

    this.log.info("State transition", {
      paymentId,
      from: fromState,
      to: toState,
      trigger,
      version: payment.version,
    });

    return {
      success: true,
      previousState: fromState,
      newState: toState,
      payment: { ...payment },
    };
  }

  // --------------------------------------------------------------------------
  // Transaction Detection & Confirmation Updates
  // --------------------------------------------------------------------------

  /**
   * Record detection of a transaction on-chain.
   * Transitions from CREATED -> PENDING.
   */
  recordTransactionDetected(
    paymentId: string,
    txHash: string,
    fromAddress: string,
    amount: string,
    now?: number,
  ): TransitionResult {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return {
        success: false,
        previousState: PaymentFlowState.CREATED,
        newState: PaymentFlowState.CREATED,
        error: `Payment ${paymentId} not found`,
        payment: this.emptyPayment(paymentId),
      };
    }

    // Validate tx hash format
    const chainConfig = this.config.chains.get(payment.network);
    if (chainConfig && !chainConfig.txHashValidator(txHash)) {
      return {
        success: false,
        previousState: payment.state,
        newState: payment.state,
        error: `Invalid transaction hash format for ${payment.network}`,
        payment: { ...payment },
      };
    }

    // Update transaction details before transition
    payment.txHash = txHash;
    payment.fromAddress = fromAddress;
    payment.receivedAmount = amount;

    // Check for amount discrepancies
    this.checkAmountDiscrepancy(payment);

    return this.transition(
      paymentId,
      PaymentFlowState.PENDING,
      "tx_detected",
      payment.version,
      { txHash, fromAddress, amount },
      now,
    );
  }

  /**
   * Update confirmation count for a payment.
   * Handles PENDING -> CONFIRMING and CONFIRMING -> CONFIRMED transitions.
   */
  updateConfirmations(
    paymentId: string,
    confirmations: number,
    blockNumber?: number,
    now?: number,
  ): TransitionResult {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return {
        success: false,
        previousState: PaymentFlowState.CREATED,
        newState: PaymentFlowState.CREATED,
        error: `Payment ${paymentId} not found`,
        payment: this.emptyPayment(paymentId),
      };
    }

    const previousConfirmations = payment.confirmations;

    // Detect block reorganization
    if (
      this.confirmationTracker.detectReorg(previousConfirmations, confirmations)
    ) {
      this.log.security("Block reorganization detected", {
        paymentId,
        previousConfirmations,
        newConfirmations: confirmations,
        network: payment.network,
      });

      // Reorg on a payment that was already confirmed -> FAILED
      if (payment.state === PaymentFlowState.CONFIRMED) {
        return this.transition(
          paymentId,
          PaymentFlowState.FAILED,
          "block_reorg",
          payment.version,
          {
            reason: "Block reorganization detected after confirmation",
            previousConfirmations,
            newConfirmations: confirmations,
          },
          now,
        );
      }

      // Reorg on confirming payment: update count, stay in state
      payment.confirmations = confirmations;
      if (blockNumber !== undefined) {
        payment.blockNumber = blockNumber;
      }
      return {
        success: true,
        previousState: payment.state,
        newState: payment.state,
        payment: { ...payment },
      };
    }

    // Update confirmation count
    payment.confirmations = confirmations;
    if (blockNumber !== undefined) {
      payment.blockNumber = blockNumber;
    }

    // Determine appropriate state transition
    const isFullyConfirmed = this.confirmationTracker.isConfirmed(
      payment.network,
      confirmations,
    );

    if (payment.state === PaymentFlowState.PENDING && confirmations > 0) {
      // PENDING -> CONFIRMING
      return this.transition(
        paymentId,
        PaymentFlowState.CONFIRMING,
        "confirmations_increasing",
        payment.version,
        { confirmations, blockNumber },
        now,
      );
    }

    if (payment.state === PaymentFlowState.CONFIRMING && isFullyConfirmed) {
      // CONFIRMING -> CONFIRMED
      return this.transition(
        paymentId,
        PaymentFlowState.CONFIRMED,
        "threshold_met",
        payment.version,
        { confirmations, blockNumber, required: payment.requiredConfirmations },
        now,
      );
    }

    // Still accumulating confirmations, no state change needed
    return {
      success: true,
      previousState: payment.state,
      newState: payment.state,
      payment: { ...payment },
    };
  }

  /**
   * Complete a confirmed payment (CONFIRMED -> COMPLETED).
   */
  completePayment(paymentId: string, now?: number): TransitionResult {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return {
        success: false,
        previousState: PaymentFlowState.CREATED,
        newState: PaymentFlowState.CREATED,
        error: `Payment ${paymentId} not found`,
        payment: this.emptyPayment(paymentId),
      };
    }

    return this.transition(
      paymentId,
      PaymentFlowState.COMPLETED,
      "payment_processed",
      payment.version,
      undefined,
      now,
    );
  }

  /**
   * Mark payment as failed.
   */
  failPayment(
    paymentId: string,
    reason: string,
    now?: number,
  ): TransitionResult {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return {
        success: false,
        previousState: PaymentFlowState.CREATED,
        newState: PaymentFlowState.CREATED,
        error: `Payment ${paymentId} not found`,
        payment: this.emptyPayment(paymentId),
      };
    }

    return this.transition(
      paymentId,
      PaymentFlowState.FAILED,
      "manual_failure",
      payment.version,
      { reason },
      now,
    );
  }

  // --------------------------------------------------------------------------
  // Expiry Handling
  // --------------------------------------------------------------------------

  /**
   * Check if a payment has expired. Uses the provided timestamp for
   * deterministic behavior (no Date.now() internally).
   */
  isExpired(paymentId: string, now: number): boolean {
    const payment = this.payments.get(paymentId);
    if (!payment) return false;
    return now >= payment.expiresAt;
  }

  /**
   * Expire a payment if it has passed its deadline.
   * Uses compare-and-swap to prevent race conditions.
   * Only CREATED, PENDING, and CONFIRMING payments can expire.
   */
  expirePayment(paymentId: string, now: number): TransitionResult {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return {
        success: false,
        previousState: PaymentFlowState.CREATED,
        newState: PaymentFlowState.CREATED,
        error: `Payment ${paymentId} not found`,
        payment: this.emptyPayment(paymentId),
      };
    }

    // Only expire if past deadline
    if (now < payment.expiresAt) {
      return {
        success: false,
        previousState: payment.state,
        newState: payment.state,
        error: "Payment has not yet expired",
        payment: { ...payment },
      };
    }

    // Can only expire from created, pending, or confirming states
    const expirableStates = new Set([
      PaymentFlowState.CREATED,
      PaymentFlowState.PENDING,
      PaymentFlowState.CONFIRMING,
    ]);

    if (!expirableStates.has(payment.state)) {
      return {
        success: false,
        previousState: payment.state,
        newState: payment.state,
        error: `Cannot expire payment in state ${payment.state}`,
        payment: { ...payment },
      };
    }

    return this.transition(
      paymentId,
      PaymentFlowState.EXPIRED,
      "payment_window_expired",
      payment.version,
      { expiresAt: payment.expiresAt, expiredAt: now },
      now,
    );
  }

  /**
   * Process all expired payments in batch.
   * Returns the list of payments that were expired.
   */
  processExpiredPayments(now: number): CryptoPaymentRecord[] {
    const expired: CryptoPaymentRecord[] = [];

    for (const [id, payment] of this.payments) {
      if (
        now >= payment.expiresAt &&
        [
          PaymentFlowState.CREATED,
          PaymentFlowState.PENDING,
          PaymentFlowState.CONFIRMING,
        ].includes(payment.state)
      ) {
        const result = this.expirePayment(id, now);
        if (result.success) {
          expired.push(result.payment);
        }
      }
    }

    return expired;
  }

  // --------------------------------------------------------------------------
  // Amount Verification & Reconciliation
  // --------------------------------------------------------------------------

  /**
   * Check for overpayment or underpayment.
   */
  private checkAmountDiscrepancy(payment: CryptoPaymentRecord): void {
    const expected = parseFloat(payment.expectedAmount);
    const received = parseFloat(payment.receivedAmount);

    if (expected === 0) return;

    const diff = received - expected;
    const diffPct = Math.abs(diff) / expected;

    if (diff > 0 && diffPct > this.config.overpaymentThreshold) {
      payment.isOverpayment = true;
      payment.overpaymentAmount = diff.toFixed(8);
    } else if (diff < 0 && diffPct > this.config.underpaymentTolerance) {
      payment.isUnderpayment = true;
      payment.underpaymentAmount = Math.abs(diff).toFixed(8);
      payment.underpaymentDeadline =
        (payment.pendingAt || payment.createdAt) +
        this.config.underpaymentGracePeriodMs;
    } else {
      payment.isOverpayment = false;
      payment.overpaymentAmount = "0";
      payment.isUnderpayment = false;
      payment.underpaymentAmount = "0";
    }
  }

  /**
   * Run reconciliation across all tracked payments.
   */
  reconcile(now: number): ReconciliationResult {
    const result: ReconciliationResult = {
      totalPayments: this.payments.size,
      balanced: 0,
      overpayments: [],
      underpayments: [],
      orphans: [],
      expired: [],
      issues: [],
    };

    for (const [, payment] of this.payments) {
      // Check for expired unprocessed payments
      if (
        now >= payment.expiresAt &&
        [
          PaymentFlowState.CREATED,
          PaymentFlowState.PENDING,
          PaymentFlowState.CONFIRMING,
        ].includes(payment.state)
      ) {
        result.expired.push({ ...payment });
        continue;
      }

      // Check for orphan payments (no workspace/subscription)
      if (
        !payment.workspaceId ||
        (!payment.subscriptionId && !payment.invoiceId)
      ) {
        result.orphans.push({ ...payment });
        result.issues.push(
          `Orphan payment: ${payment.id} has no subscription/invoice`,
        );
        continue;
      }

      // Check overpayment
      if (payment.isOverpayment) {
        result.overpayments.push({ ...payment });
        result.issues.push(
          `Overpayment: ${payment.id} received ${payment.receivedAmount} (expected ${payment.expectedAmount})`,
        );
        continue;
      }

      // Check underpayment with grace period
      if (payment.isUnderpayment) {
        if (
          payment.underpaymentDeadline &&
          now > payment.underpaymentDeadline
        ) {
          result.issues.push(
            `Underpayment expired: ${payment.id} received ${payment.receivedAmount} (expected ${payment.expectedAmount})`,
          );
        }
        result.underpayments.push({ ...payment });
        continue;
      }

      // Balanced
      if (
        payment.state === PaymentFlowState.COMPLETED ||
        payment.state === PaymentFlowState.CONFIRMED
      ) {
        result.balanced++;
      }
    }

    // Mark reconciliation timestamp
    for (const [, payment] of this.payments) {
      if (payment.state === PaymentFlowState.COMPLETED && !payment.reconciled) {
        payment.reconciled = true;
        payment.reconciledAt = now;
      }
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // Payment Queries
  // --------------------------------------------------------------------------

  /**
   * Get a payment by ID (immutable copy).
   */
  getPayment(paymentId: string): CryptoPaymentRecord | undefined {
    const payment = this.payments.get(paymentId);
    return payment
      ? { ...payment, stateHistory: [...payment.stateHistory] }
      : undefined;
  }

  /**
   * Get a payment by its payment address.
   */
  getPaymentByAddress(address: string): CryptoPaymentRecord | undefined {
    const paymentId = this.addressIndex.get(address.toLowerCase());
    if (!paymentId) return undefined;
    return this.getPayment(paymentId);
  }

  /**
   * Get all payments in a given state.
   */
  getPaymentsByState(state: PaymentFlowState): CryptoPaymentRecord[] {
    const results: CryptoPaymentRecord[] = [];
    for (const [, payment] of this.payments) {
      if (payment.state === state) {
        results.push({ ...payment, stateHistory: [...payment.stateHistory] });
      }
    }
    return results;
  }

  /**
   * Get all payments for a workspace.
   */
  getPaymentsByWorkspace(workspaceId: string): CryptoPaymentRecord[] {
    const results: CryptoPaymentRecord[] = [];
    for (const [, payment] of this.payments) {
      if (payment.workspaceId === workspaceId) {
        results.push({ ...payment, stateHistory: [...payment.stateHistory] });
      }
    }
    return results;
  }

  /**
   * Get count of payments in each state.
   */
  getStateDistribution(): Record<PaymentFlowState, number> {
    const dist: Record<string, number> = {};
    for (const state of Object.values(PaymentFlowState)) {
      dist[state] = 0;
    }
    for (const [, payment] of this.payments) {
      dist[payment.state] = (dist[payment.state] || 0) + 1;
    }
    return dist as Record<PaymentFlowState, number>;
  }

  /**
   * Total number of tracked payments.
   */
  get totalPayments(): number {
    return this.payments.size;
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  /**
   * Get the internal address generator (for testing/inspection).
   */
  getAddressGenerator(): HDAddressGenerator {
    return this.addressGenerator;
  }

  /**
   * Get the internal confirmation tracker (for testing/inspection).
   */
  getConfirmationTracker(): ConfirmationTracker {
    return this.confirmationTracker;
  }

  /**
   * Create an empty payment record for error responses.
   */
  private emptyPayment(id: string): CryptoPaymentRecord {
    return {
      id,
      workspaceId: "",
      userId: "",
      network: ChainNetwork.ETHEREUM,
      currency: "ETH",
      expectedAmount: "0",
      receivedAmount: "0",
      paymentAddress: "",
      derivationIndex: 0,
      confirmations: 0,
      requiredConfirmations: 0,
      fiatAmount: 0,
      fiatCurrency: "USD",
      exchangeRate: "0",
      state: PaymentFlowState.CREATED,
      stateHistory: [],
      version: 0,
      createdAt: 0,
      expiresAt: 0,
      isOverpayment: false,
      overpaymentAmount: "0",
      isUnderpayment: false,
      underpaymentAmount: "0",
      reconciled: false,
    };
  }

  /**
   * Clear all payments (for testing).
   */
  clear(): void {
    this.payments.clear();
    this.addressIndex.clear();
    this.addressGenerator.clear();
  }
}

// ============================================================================
// Factory & Singleton
// ============================================================================

/**
 * Create a payment flow machine with default configuration.
 */
export function createPaymentFlowMachine(
  masterSeed?: string,
  overrides?: Partial<Omit<PaymentFlowConfig, "masterSeed">>,
): CryptoPaymentFlowMachine {
  const seed =
    masterSeed ||
    process.env.CRYPTO_PAYMENT_MASTER_SEED ||
    "default-dev-seed-not-for-production";

  const chains = overrides?.chains || DEFAULT_PAYMENT_FLOW_CONFIG.chains;

  const config: PaymentFlowConfig = {
    paymentWindowMs:
      overrides?.paymentWindowMs ?? DEFAULT_PAYMENT_FLOW_CONFIG.paymentWindowMs,
    pollIntervalMs:
      overrides?.pollIntervalMs ?? DEFAULT_PAYMENT_FLOW_CONFIG.pollIntervalMs,
    underpaymentTolerance:
      overrides?.underpaymentTolerance ??
      DEFAULT_PAYMENT_FLOW_CONFIG.underpaymentTolerance,
    underpaymentGracePeriodMs:
      overrides?.underpaymentGracePeriodMs ??
      DEFAULT_PAYMENT_FLOW_CONFIG.underpaymentGracePeriodMs,
    overpaymentThreshold:
      overrides?.overpaymentThreshold ??
      DEFAULT_PAYMENT_FLOW_CONFIG.overpaymentThreshold,
    chains,
    masterSeed: seed,
  };

  return new CryptoPaymentFlowMachine(config);
}

let flowMachineInstance: CryptoPaymentFlowMachine | null = null;

/**
 * Get the singleton payment flow machine.
 */
export function getPaymentFlowMachine(): CryptoPaymentFlowMachine {
  if (!flowMachineInstance) {
    flowMachineInstance = createPaymentFlowMachine();
  }
  return flowMachineInstance;
}

/**
 * Reset the singleton (for testing).
 */
export function resetPaymentFlowMachine(): void {
  flowMachineInstance = null;
}
