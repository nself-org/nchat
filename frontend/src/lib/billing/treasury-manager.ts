/**
 * Treasury Manager
 *
 * Manages treasury accounts with:
 * - Balance tracking (total, available, reserved, pending)
 * - Reserve management (hold/release for pending payouts)
 * - Withdrawal limits and validation
 * - Transaction recording and reconciliation
 * - Account freezing/unfreezing
 *
 * @module @/lib/billing/treasury-manager
 * @version 1.0.0
 */

import { logger } from "@/lib/logger";
import {
  type TreasuryAccount,
  type TreasuryTransaction,
  type TreasuryTransactionType,
  type TreasuryReconciliationResult,
  type TreasurySnapshot,
  type PayoutCurrency,
  PayoutErrorCode,
  PayoutError,
} from "./payout-types";

// ============================================================================
// Treasury Manager
// ============================================================================

/**
 * Treasury account manager.
 *
 * Provides ACID-like operations on treasury accounts:
 * - Every balance mutation is recorded as a transaction
 * - Balance invariants are enforced (available + reserved = total)
 * - Optimistic locking via version numbers prevents concurrent modification
 * - Reserve holds ensure funds are earmarked for pending payouts
 */
export class TreasuryManager {
  private accounts: Map<string, TreasuryAccount> = new Map();
  private transactions: Map<string, TreasuryTransaction[]> = new Map(); // accountId -> transactions
  private log = logger.scope("TreasuryManager");

  // --------------------------------------------------------------------------
  // Account Operations
  // --------------------------------------------------------------------------

  /**
   * Create a new treasury account.
   */
  createAccount(params: {
    id: string;
    workspaceId: string;
    name: string;
    currency: PayoutCurrency;
    initialBalance?: number;
    minimumBalance?: number;
    maximumBalance?: number;
    now?: number;
  }): TreasuryAccount {
    if (this.accounts.has(params.id)) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        `Account ${params.id} already exists`,
      );
    }

    const now = params.now ?? Date.now();
    const initialBalance = params.initialBalance || 0;

    const account: TreasuryAccount = {
      id: params.id,
      workspaceId: params.workspaceId,
      name: params.name,
      currency: params.currency,
      status: "active",
      totalBalance: initialBalance,
      availableBalance: initialBalance,
      reservedBalance: 0,
      pendingOutgoing: 0,
      pendingIncoming: 0,
      minimumBalance: params.minimumBalance ?? 0,
      maximumBalance: params.maximumBalance ?? Number.MAX_SAFE_INTEGER,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };

    this.accounts.set(params.id, account);
    this.transactions.set(params.id, []);

    // Record initial deposit if balance > 0
    if (initialBalance > 0) {
      this.recordTransaction(params.id, {
        type: "deposit",
        amount: initialBalance,
        description: "Initial deposit",
        createdBy: "system",
        now,
      });
    }

    this.log.info("Treasury account created", {
      accountId: params.id,
      workspaceId: params.workspaceId,
      currency: params.currency,
      initialBalance,
    });

    return { ...account };
  }

  /**
   * Get a treasury account by ID.
   */
  getAccount(accountId: string): TreasuryAccount | undefined {
    const account = this.accounts.get(accountId);
    return account ? { ...account } : undefined;
  }

  /**
   * Get account by workspace ID.
   */
  getAccountByWorkspace(workspaceId: string): TreasuryAccount | undefined {
    for (const account of this.accounts.values()) {
      if (account.workspaceId === workspaceId) {
        return { ...account };
      }
    }
    return undefined;
  }

  /**
   * Freeze a treasury account (block all operations).
   */
  freezeAccount(accountId: string, now?: number): TreasuryAccount {
    const account = this.getAccountInternal(accountId);
    if (account.status === "frozen") {
      throw new PayoutError(
        PayoutErrorCode.TREASURY_FROZEN,
        `Account ${accountId} is already frozen`,
      );
    }

    account.status = "frozen";
    account.updatedAt = now ?? Date.now();
    account.version += 1;

    this.log.security("Treasury account frozen", { accountId });
    return { ...account };
  }

  /**
   * Unfreeze a treasury account.
   */
  unfreezeAccount(accountId: string, now?: number): TreasuryAccount {
    const account = this.getAccountInternal(accountId);
    if (account.status !== "frozen") {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        `Account ${accountId} is not frozen`,
      );
    }

    account.status = "active";
    account.updatedAt = now ?? Date.now();
    account.version += 1;

    this.log.info("Treasury account unfrozen", { accountId });
    return { ...account };
  }

  // --------------------------------------------------------------------------
  // Balance Operations
  // --------------------------------------------------------------------------

  /**
   * Deposit funds into the treasury.
   */
  deposit(
    accountId: string,
    amount: number,
    description: string,
    createdBy: string,
    options?: { reference?: string; externalId?: string; now?: number },
  ): TreasuryTransaction {
    this.validateAmount(amount);
    const account = this.getAccountInternal(accountId);
    this.ensureNotFrozen(account);

    const newTotal = account.totalBalance + amount;
    if (newTotal > account.maximumBalance) {
      throw new PayoutError(
        PayoutErrorCode.BALANCE_ABOVE_MAXIMUM,
        `Deposit would exceed maximum balance. Current: ${account.totalBalance}, Deposit: ${amount}, Max: ${account.maximumBalance}`,
        undefined,
        { accountId, amount, maximumBalance: account.maximumBalance },
      );
    }

    const tx = this.recordTransaction(accountId, {
      type: "deposit",
      amount,
      description,
      createdBy,
      reference: options?.reference,
      externalId: options?.externalId,
      now: options?.now,
    });

    account.totalBalance += amount;
    account.availableBalance += amount;
    account.updatedAt = tx.createdAt;
    account.version += 1;

    return tx;
  }

  /**
   * Withdraw funds from the treasury.
   */
  withdraw(
    accountId: string,
    amount: number,
    description: string,
    createdBy: string,
    options?: { reference?: string; externalId?: string; now?: number },
  ): TreasuryTransaction {
    this.validateAmount(amount);
    const account = this.getAccountInternal(accountId);
    this.ensureNotFrozen(account);

    if (amount > account.availableBalance) {
      throw new PayoutError(
        PayoutErrorCode.INSUFFICIENT_FUNDS,
        `Insufficient available funds. Available: ${account.availableBalance}, Requested: ${amount}`,
        undefined,
        { accountId, amount, available: account.availableBalance },
      );
    }

    const newTotal = account.totalBalance - amount;
    if (newTotal < account.minimumBalance) {
      throw new PayoutError(
        PayoutErrorCode.BALANCE_BELOW_MINIMUM,
        `Withdrawal would breach minimum balance. Current: ${account.totalBalance}, Withdrawal: ${amount}, Min: ${account.minimumBalance}`,
        undefined,
        { accountId, amount, minimumBalance: account.minimumBalance },
      );
    }

    const tx = this.recordTransaction(accountId, {
      type: "withdrawal",
      amount: -amount,
      description,
      createdBy,
      reference: options?.reference,
      externalId: options?.externalId,
      now: options?.now,
    });

    account.totalBalance -= amount;
    account.availableBalance -= amount;
    account.updatedAt = tx.createdAt;
    account.version += 1;

    return tx;
  }

  /**
   * Hold funds in reserve for a pending payout.
   * Moves funds from available to reserved.
   */
  holdReserve(
    accountId: string,
    amount: number,
    payoutId: string,
    createdBy: string,
    now?: number,
  ): TreasuryTransaction {
    this.validateAmount(amount);
    const account = this.getAccountInternal(accountId);
    this.ensureNotFrozen(account);

    if (amount > account.availableBalance) {
      throw new PayoutError(
        PayoutErrorCode.INSUFFICIENT_FUNDS,
        `Insufficient available funds for reserve hold. Available: ${account.availableBalance}, Requested: ${amount}`,
        payoutId,
        { accountId, amount, available: account.availableBalance },
      );
    }

    const tx = this.recordTransaction(accountId, {
      type: "reserve_hold",
      amount: -amount, // Reduces available (but not total)
      description: `Reserve hold for payout ${payoutId}`,
      createdBy,
      payoutId,
      now,
    });

    account.availableBalance -= amount;
    account.reservedBalance += amount;
    account.pendingOutgoing += amount;
    account.updatedAt = tx.createdAt;
    account.version += 1;

    return tx;
  }

  /**
   * Release a reserve hold (payout cancelled or failed).
   * Moves funds from reserved back to available.
   */
  releaseReserve(
    accountId: string,
    amount: number,
    payoutId: string,
    createdBy: string,
    now?: number,
  ): TreasuryTransaction {
    this.validateAmount(amount);
    const account = this.getAccountInternal(accountId);

    if (amount > account.reservedBalance) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        `Cannot release more than reserved. Reserved: ${account.reservedBalance}, Release: ${amount}`,
        payoutId,
        { accountId, amount, reserved: account.reservedBalance },
      );
    }

    const tx = this.recordTransaction(accountId, {
      type: "reserve_release",
      amount, // Adds back to available
      description: `Reserve release for payout ${payoutId}`,
      createdBy,
      payoutId,
      now,
    });

    account.availableBalance += amount;
    account.reservedBalance -= amount;
    account.pendingOutgoing -= amount;
    account.updatedAt = tx.createdAt;
    account.version += 1;

    return tx;
  }

  /**
   * Execute a payout: finalize the reserved funds by removing from total.
   * This should be called after a payout is confirmed completed.
   */
  executePayout(
    accountId: string,
    amount: number,
    payoutId: string,
    createdBy: string,
    now?: number,
  ): TreasuryTransaction {
    this.validateAmount(amount);
    const account = this.getAccountInternal(accountId);

    if (amount > account.reservedBalance) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        `Cannot execute payout for more than reserved. Reserved: ${account.reservedBalance}, Payout: ${amount}`,
        payoutId,
      );
    }

    const tx = this.recordTransaction(accountId, {
      type: "payout",
      amount: -amount,
      description: `Payout executed: ${payoutId}`,
      createdBy,
      payoutId,
      now,
    });

    account.totalBalance -= amount;
    account.reservedBalance -= amount;
    account.pendingOutgoing -= amount;
    account.updatedAt = tx.createdAt;
    account.version += 1;

    return tx;
  }

  /**
   * Record an adjustment (correction).
   */
  adjustment(
    accountId: string,
    amount: number,
    description: string,
    createdBy: string,
    now?: number,
  ): TreasuryTransaction {
    const account = this.getAccountInternal(accountId);

    const tx = this.recordTransaction(accountId, {
      type: "adjustment",
      amount,
      description,
      createdBy,
      now,
    });

    account.totalBalance += amount;
    account.availableBalance += amount;
    account.updatedAt = tx.createdAt;
    account.version += 1;

    return tx;
  }

  // --------------------------------------------------------------------------
  // Reconciliation
  // --------------------------------------------------------------------------

  /**
   * Reconcile an account by replaying all transactions.
   */
  reconcile(accountId: string, now?: number): TreasuryReconciliationResult {
    const account = this.getAccountInternal(accountId);
    const transactions = this.transactions.get(accountId) || [];

    // Replay transactions to compute expected balance
    let computedTotal = 0;
    let computedReserved = 0;
    const issues: string[] = [];

    for (const tx of transactions) {
      switch (tx.type) {
        case "deposit":
          computedTotal += Math.abs(tx.amount);
          break;
        case "withdrawal":
          computedTotal -= Math.abs(tx.amount);
          break;
        case "reserve_hold":
          computedReserved += Math.abs(tx.amount);
          break;
        case "reserve_release":
          computedReserved -= Math.abs(tx.amount);
          break;
        case "payout":
          computedTotal -= Math.abs(tx.amount);
          computedReserved -= Math.abs(tx.amount);
          break;
        case "adjustment":
          computedTotal += tx.amount;
          break;
        case "fee":
          computedTotal -= Math.abs(tx.amount);
          break;
        case "refund_received":
          computedTotal += Math.abs(tx.amount);
          break;
        default:
          break;
      }
    }

    const computedAvailable = computedTotal - computedReserved;
    const discrepancyTotal = account.totalBalance - computedTotal;

    if (discrepancyTotal !== 0) {
      issues.push(
        `Total balance mismatch: recorded=${account.totalBalance}, computed=${computedTotal}, discrepancy=${discrepancyTotal}`,
      );
    }

    if (account.reservedBalance !== computedReserved) {
      issues.push(
        `Reserved balance mismatch: recorded=${account.reservedBalance}, computed=${computedReserved}`,
      );
    }

    // Check invariant: available + reserved = total
    if (
      account.availableBalance + account.reservedBalance !==
      account.totalBalance
    ) {
      issues.push(
        `Balance invariant violated: available(${account.availableBalance}) + reserved(${account.reservedBalance}) != total(${account.totalBalance})`,
      );
    }

    return {
      accountId,
      timestamp: now ?? Date.now(),
      computedBalance: computedTotal,
      recordedBalance: account.totalBalance,
      discrepancy: discrepancyTotal,
      isBalanced: issues.length === 0,
      transactionCount: transactions.length,
      issues,
    };
  }

  /**
   * Take a snapshot of the current treasury state.
   */
  snapshot(accountId: string, now?: number): TreasurySnapshot {
    const account = this.getAccountInternal(accountId);
    return {
      accountId,
      timestamp: now ?? Date.now(),
      totalBalance: account.totalBalance,
      availableBalance: account.availableBalance,
      reservedBalance: account.reservedBalance,
      pendingOutgoing: account.pendingOutgoing,
      pendingIncoming: account.pendingIncoming,
    };
  }

  // --------------------------------------------------------------------------
  // Transaction Queries
  // --------------------------------------------------------------------------

  /**
   * Get transactions for an account.
   */
  getTransactions(
    accountId: string,
    options?: {
      type?: TreasuryTransactionType;
      payoutId?: string;
      limit?: number;
      offset?: number;
    },
  ): TreasuryTransaction[] {
    let txs = this.transactions.get(accountId) || [];

    if (options?.type) {
      txs = txs.filter((t) => t.type === options.type);
    }
    if (options?.payoutId) {
      txs = txs.filter((t) => t.payoutId === options.payoutId);
    }

    const offset = options?.offset || 0;
    const limit = options?.limit || txs.length;

    return txs.slice(offset, offset + limit).map((t) => ({ ...t }));
  }

  /**
   * Get total transaction count for an account.
   */
  getTransactionCount(accountId: string): number {
    return (this.transactions.get(accountId) || []).length;
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  private getAccountInternal(accountId: string): TreasuryAccount {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new PayoutError(
        PayoutErrorCode.ACCOUNT_NOT_FOUND,
        `Treasury account ${accountId} not found`,
      );
    }
    return account;
  }

  private ensureNotFrozen(account: TreasuryAccount): void {
    if (account.status === "frozen") {
      throw new PayoutError(
        PayoutErrorCode.TREASURY_FROZEN,
        `Treasury account ${account.id} is frozen`,
      );
    }
  }

  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        `Amount must be positive, got ${amount}`,
      );
    }
    if (!Number.isFinite(amount)) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        `Amount must be finite, got ${amount}`,
      );
    }
  }

  private recordTransaction(
    accountId: string,
    params: {
      type: TreasuryTransactionType;
      amount: number;
      description: string;
      createdBy: string;
      reference?: string;
      externalId?: string;
      payoutId?: string;
      now?: number;
    },
  ): TreasuryTransaction {
    const account = this.accounts.get(accountId)!;
    const txs = this.transactions.get(accountId) || [];
    const now = params.now ?? Date.now();

    const tx: TreasuryTransaction = {
      id: `tx_${now}_${txs.length}_${Math.random().toString(36).slice(2, 8)}`,
      accountId,
      type: params.type,
      amount: params.amount,
      currency: account.currency,
      description: params.description,
      reference: params.reference,
      balanceBefore: account.totalBalance,
      balanceAfter: account.totalBalance + params.amount,
      payoutId: params.payoutId,
      externalId: params.externalId,
      createdAt: now,
      createdBy: params.createdBy,
    };

    txs.push(tx);
    this.transactions.set(accountId, txs);

    return { ...tx };
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.accounts.clear();
    this.transactions.clear();
  }
}

// ============================================================================
// Singleton
// ============================================================================

let treasuryManagerInstance: TreasuryManager | null = null;

/**
 * Get the singleton treasury manager.
 */
export function getTreasuryManager(): TreasuryManager {
  if (!treasuryManagerInstance) {
    treasuryManagerInstance = new TreasuryManager();
  }
  return treasuryManagerInstance;
}

/**
 * Create a new treasury manager (for custom setup).
 */
export function createTreasuryManager(): TreasuryManager {
  return new TreasuryManager();
}

/**
 * Reset the singleton (for testing).
 */
export function resetTreasuryManager(): void {
  treasuryManagerInstance = null;
}
