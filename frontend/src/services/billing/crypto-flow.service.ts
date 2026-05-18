/**
 * Crypto Payment Flow Service
 *
 * Orchestrates the complete crypto payment lifecycle by composing:
 * - CryptoPaymentFlowMachine (state machine, addresses, confirmations)
 * - PaymentSecurityService (anti-replay, anti-double-spend, fraud)
 *
 * Provides high-level methods for:
 * - Initiating payments
 * - Processing blockchain events (tx detected, confirmations)
 * - Handling expiry
 * - Running reconciliation
 * - Webhook event processing
 *
 * @module @/services/billing/crypto-flow.service
 * @version 1.0.0
 */

import { logger } from "@/lib/logger";
import {
  CryptoPaymentFlowMachine,
  PaymentFlowState,
  ChainNetwork,
  createPaymentFlowMachine,
  type FlowCryptoCurrency,
  type CryptoPaymentRecord,
  type TransitionResult,
  type ReconciliationResult,
  type PaymentFlowConfig,
} from "@/lib/billing/crypto-payment-flow";
import {
  PaymentSecurityService,
  type PaymentSecurityAssessment,
} from "@/services/billing/payment-security.service";
import {
  type CryptoTransactionInput,
  type PaymentAttempt,
  SecurityCheckCode,
} from "@/lib/billing/payment-security";

// ============================================================================
// Types
// ============================================================================

/**
 * Parameters for initiating a crypto payment.
 */
export interface InitiatePaymentParams {
  paymentId: string;
  workspaceId: string;
  userId: string;
  network: ChainNetwork;
  currency: FlowCryptoCurrency;
  expectedAmount: string;
  fiatAmount: number;
  fiatCurrency?: string;
  exchangeRate: string;
  subscriptionId?: string;
  invoiceId?: string;
}

/**
 * Result of initiating a crypto payment.
 */
export interface InitiatePaymentResult {
  success: boolean;
  payment?: CryptoPaymentRecord;
  paymentAddress?: string;
  expiresAt?: number;
  securityAssessment?: PaymentSecurityAssessment;
  error?: string;
}

/**
 * Blockchain event representing a detected transaction.
 */
export interface BlockchainTxEvent {
  paymentId?: string;
  paymentAddress?: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  network: ChainNetwork;
  currency: FlowCryptoCurrency;
  blockNumber?: number;
  confirmations: number;
  timestamp: number;
}

/**
 * Result of processing a blockchain event.
 */
export interface ProcessEventResult {
  success: boolean;
  paymentId?: string;
  previousState?: PaymentFlowState;
  newState?: PaymentFlowState;
  securityBlocked?: boolean;
  error?: string;
}

/**
 * Service configuration.
 */
export interface CryptoFlowServiceConfig {
  masterSeed?: string;
  flowOverrides?: Partial<Omit<PaymentFlowConfig, "masterSeed">>;
  securityConfig?: {
    blacklistedAddresses?: string[];
    sanctionedAddresses?: string[];
  };
  /** Auto-expire check interval in ms (0 = disabled) */
  autoExpireIntervalMs?: number;
  /** Auto-reconcile interval in ms (0 = disabled) */
  autoReconcileIntervalMs?: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class CryptoFlowService {
  private flowMachine: CryptoPaymentFlowMachine;
  private securityService: PaymentSecurityService;
  private log = logger.scope("CryptoFlowService");
  private expireTimer: ReturnType<typeof setInterval> | null = null;
  private reconcileTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: CryptoFlowServiceConfig) {
    this.flowMachine = createPaymentFlowMachine(
      config?.masterSeed,
      config?.flowOverrides,
    );

    this.securityService = new PaymentSecurityService({
      blacklistedAddresses: config?.securityConfig?.blacklistedAddresses,
      sanctionedAddresses: config?.securityConfig?.sanctionedAddresses,
      enableLogging: true,
    });

    // Set up auto-expire if configured
    if (config?.autoExpireIntervalMs && config.autoExpireIntervalMs > 0) {
      this.expireTimer = setInterval(() => {
        this.processExpiredPayments();
      }, config.autoExpireIntervalMs);
    }

    // Set up auto-reconcile if configured
    if (config?.autoReconcileIntervalMs && config.autoReconcileIntervalMs > 0) {
      this.reconcileTimer = setInterval(() => {
        this.runReconciliation();
      }, config.autoReconcileIntervalMs);
    }
  }

  // --------------------------------------------------------------------------
  // Payment Initiation
  // --------------------------------------------------------------------------

  /**
   * Initiate a new crypto payment.
   * Performs security checks, generates address, creates payment record.
   */
  initiatePayment(params: InitiatePaymentParams): InitiatePaymentResult {
    try {
      // Run security assessment on the payment attempt
      const attempt: PaymentAttempt = {
        id: params.paymentId,
        userId: params.userId,
        workspaceId: params.workspaceId,
        amount: params.fiatAmount,
        currency: params.fiatCurrency || "USD",
        method: "crypto",
        timestamp: Date.now(),
      };

      const assessment = this.securityService.assessStripePayment(attempt);

      if (!assessment.allowed) {
        this.log.security("Payment initiation blocked by security", {
          paymentId: params.paymentId,
          riskScore: assessment.riskScore,
          riskLevel: assessment.riskLevel,
          failedChecks: assessment.failedChecks.map((c) => c.code),
        });

        return {
          success: false,
          securityAssessment: assessment,
          error: `Payment blocked: ${assessment.failedChecks.map((c) => c.message).join("; ")}`,
        };
      }

      // Create payment in the flow machine
      const payment = this.flowMachine.createPayment({
        id: params.paymentId,
        workspaceId: params.workspaceId,
        userId: params.userId,
        network: params.network,
        currency: params.currency,
        expectedAmount: params.expectedAmount,
        fiatAmount: params.fiatAmount,
        fiatCurrency: params.fiatCurrency || "USD",
        exchangeRate: params.exchangeRate,
        subscriptionId: params.subscriptionId,
        invoiceId: params.invoiceId,
      });

      this.log.info("Payment initiated", {
        paymentId: payment.id,
        address: payment.paymentAddress,
        network: params.network,
        currency: params.currency,
        amount: params.expectedAmount,
        expiresAt: new Date(payment.expiresAt).toISOString(),
      });

      return {
        success: true,
        payment,
        paymentAddress: payment.paymentAddress,
        expiresAt: payment.expiresAt,
        securityAssessment: assessment,
      };
    } catch (error) {
      this.log.error(
        "Failed to initiate payment",
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Payment initiation failed",
      };
    }
  }

  // --------------------------------------------------------------------------
  // Blockchain Event Processing
  // --------------------------------------------------------------------------

  /**
   * Process a blockchain transaction event.
   * Handles the full lifecycle: detection -> confirmation -> completion.
   */
  processBlockchainEvent(event: BlockchainTxEvent): ProcessEventResult {
    try {
      // Resolve payment ID from address if not provided
      let paymentId = event.paymentId;
      if (!paymentId && event.paymentAddress) {
        const payment = this.flowMachine.getPaymentByAddress(
          event.paymentAddress,
        );
        if (payment) {
          paymentId = payment.id;
        }
      }
      if (!paymentId && event.toAddress) {
        const payment = this.flowMachine.getPaymentByAddress(event.toAddress);
        if (payment) {
          paymentId = payment.id;
        }
      }

      if (!paymentId) {
        return {
          success: false,
          error: "Could not resolve payment for this blockchain event",
        };
      }

      const payment = this.flowMachine.getPayment(paymentId);
      if (!payment) {
        return {
          success: false,
          paymentId,
          error: `Payment ${paymentId} not found`,
        };
      }

      // Run security checks on the transaction
      const txInput: CryptoTransactionInput = {
        txHash: event.txHash,
        fromAddress: event.fromAddress,
        toAddress: event.toAddress,
        amount: event.amount,
        currency: event.currency,
        network: event.network,
        blockNumber: event.blockNumber,
        confirmations: event.confirmations,
        timestamp: event.timestamp,
      };

      const securityAttempt: PaymentAttempt = {
        id: `${paymentId}:${event.txHash}`,
        userId: payment.userId,
        workspaceId: payment.workspaceId,
        amount: payment.fiatAmount,
        currency: payment.fiatCurrency,
        method: "crypto",
        timestamp: event.timestamp,
      };

      const assessment = this.securityService.assessCryptoPayment(
        txInput,
        securityAttempt,
      );

      if (!assessment.allowed) {
        this.log.security("Blockchain event blocked by security", {
          paymentId,
          txHash: event.txHash,
          riskScore: assessment.riskScore,
          failedChecks: assessment.failedChecks.map((c) => c.code),
        });

        // Check for double-spend specifically
        const hasDoubleSpend = assessment.failedChecks.some(
          (c) =>
            c.code === SecurityCheckCode.DOUBLE_SPEND_DETECTED ||
            c.code === SecurityCheckCode.UNCONFIRMED_TX_REUSE,
        );

        if (hasDoubleSpend) {
          const result = this.flowMachine.failPayment(
            paymentId,
            "Double-spend detected",
          );
          return {
            success: false,
            paymentId,
            previousState: result.previousState,
            newState: result.newState,
            securityBlocked: true,
            error: "Double-spend detected",
          };
        }

        return {
          success: false,
          paymentId,
          securityBlocked: true,
          error: `Security check failed: ${assessment.failedChecks.map((c) => c.message).join("; ")}`,
        };
      }

      // Process based on current payment state
      let result: TransitionResult;

      if (payment.state === PaymentFlowState.CREATED) {
        // First detection of transaction
        result = this.flowMachine.recordTransactionDetected(
          paymentId,
          event.txHash,
          event.fromAddress,
          event.amount,
        );

        if (!result.success) {
          return {
            success: false,
            paymentId,
            error: result.error,
          };
        }

        // If we already have confirmations, continue processing
        if (event.confirmations > 0) {
          result = this.flowMachine.updateConfirmations(
            paymentId,
            event.confirmations,
            event.blockNumber,
          );
        }
      } else if (
        payment.state === PaymentFlowState.PENDING ||
        payment.state === PaymentFlowState.CONFIRMING
      ) {
        // Update confirmation count
        result = this.flowMachine.updateConfirmations(
          paymentId,
          event.confirmations,
          event.blockNumber,
        );
      } else {
        return {
          success: true,
          paymentId,
          previousState: payment.state,
          newState: payment.state,
        };
      }

      // Auto-complete if confirmed
      const updatedPayment = this.flowMachine.getPayment(paymentId);
      if (updatedPayment?.state === PaymentFlowState.CONFIRMED) {
        const completeResult = this.flowMachine.completePayment(paymentId);
        if (completeResult.success) {
          result = completeResult;
        }
      }

      return {
        success: result.success,
        paymentId,
        previousState: result.previousState,
        newState: result.newState,
        error: result.error,
      };
    } catch (error) {
      this.log.error(
        "Failed to process blockchain event",
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Event processing failed",
      };
    }
  }

  // --------------------------------------------------------------------------
  // Expiry Processing
  // --------------------------------------------------------------------------

  /**
   * Process all expired payments. Called periodically or manually.
   */
  processExpiredPayments(now?: number): CryptoPaymentRecord[] {
    const timestamp = now ?? Date.now();
    const expired = this.flowMachine.processExpiredPayments(timestamp);

    if (expired.length > 0) {
      this.log.info(`Expired ${expired.length} payments`, {
        paymentIds: expired.map((p) => p.id),
      });
    }

    return expired;
  }

  // --------------------------------------------------------------------------
  // Reconciliation
  // --------------------------------------------------------------------------

  /**
   * Run reconciliation across all payments.
   */
  runReconciliation(now?: number): ReconciliationResult {
    const timestamp = now ?? Date.now();
    const result = this.flowMachine.reconcile(timestamp);

    if (result.issues.length > 0) {
      this.log.warn("Reconciliation issues found", {
        totalPayments: result.totalPayments,
        balanced: result.balanced,
        overpayments: result.overpayments.length,
        underpayments: result.underpayments.length,
        orphans: result.orphans.length,
        expired: result.expired.length,
        issues: result.issues,
      });
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // Query Methods
  // --------------------------------------------------------------------------

  /**
   * Get a payment by ID.
   */
  getPayment(paymentId: string): CryptoPaymentRecord | undefined {
    return this.flowMachine.getPayment(paymentId);
  }

  /**
   * Get a payment by its blockchain address.
   */
  getPaymentByAddress(address: string): CryptoPaymentRecord | undefined {
    return this.flowMachine.getPaymentByAddress(address);
  }

  /**
   * Get all payments in a given state.
   */
  getPaymentsByState(state: PaymentFlowState): CryptoPaymentRecord[] {
    return this.flowMachine.getPaymentsByState(state);
  }

  /**
   * Get payments for a workspace.
   */
  getPaymentsByWorkspace(workspaceId: string): CryptoPaymentRecord[] {
    return this.flowMachine.getPaymentsByWorkspace(workspaceId);
  }

  /**
   * Get state distribution.
   */
  getStateDistribution(): Record<PaymentFlowState, number> {
    return this.flowMachine.getStateDistribution();
  }

  // --------------------------------------------------------------------------
  // Admin / Security Operations
  // --------------------------------------------------------------------------

  /**
   * Blacklist a crypto address.
   */
  blacklistAddress(address: string): void {
    this.securityService.blacklistAddress(address);
  }

  /**
   * Add to sanctions list.
   */
  addSanctionedAddress(address: string): void {
    this.securityService.addSanctionedAddress(address);
  }

  /**
   * Manually fail a payment (admin action).
   */
  manuallyFailPayment(paymentId: string, reason: string): TransitionResult {
    const result = this.flowMachine.failPayment(paymentId, reason);
    if (result.success) {
      this.log.security("Payment manually failed", { paymentId, reason });
    }
    return result;
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Get the underlying flow machine (for advanced usage / testing).
   */
  getFlowMachine(): CryptoPaymentFlowMachine {
    return this.flowMachine;
  }

  /**
   * Shutdown the service, clearing timers.
   */
  shutdown(): void {
    if (this.expireTimer) {
      clearInterval(this.expireTimer);
      this.expireTimer = null;
    }
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
  }

  /**
   * Reset all state (for testing).
   */
  reset(): void {
    this.flowMachine.clear();
    this.securityService.reset();
  }
}

// ============================================================================
// Singleton
// ============================================================================

let cryptoFlowServiceInstance: CryptoFlowService | null = null;

/**
 * Get the singleton crypto flow service.
 */
export function getCryptoFlowService(): CryptoFlowService {
  if (!cryptoFlowServiceInstance) {
    cryptoFlowServiceInstance = new CryptoFlowService();
  }
  return cryptoFlowServiceInstance;
}

/**
 * Create a new crypto flow service with custom config.
 */
export function createCryptoFlowService(
  config?: CryptoFlowServiceConfig,
): CryptoFlowService {
  return new CryptoFlowService(config);
}

/**
 * Reset the singleton (for testing).
 */
export function resetCryptoFlowService(): void {
  if (cryptoFlowServiceInstance) {
    cryptoFlowServiceInstance.shutdown();
  }
  cryptoFlowServiceInstance = null;
}
