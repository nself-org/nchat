/**
 * Payout & Treasury Types
 *
 * Complete type definitions for payout policies, multi-approval workflows,
 * treasury management, and audit logging for treasury operations.
 *
 * @module @/lib/billing/payout-types
 * @version 1.0.0
 */

// ============================================================================
// Payout Status & Method
// ============================================================================

/**
 * Payout lifecycle states.
 *
 * State flow:
 * - draft -> pending_approval (submitted for approval)
 * - pending_approval -> approved (all required approvals met)
 * - pending_approval -> rejected (approver rejected)
 * - pending_approval -> expired (approval window expired)
 * - approved -> processing (payout initiated)
 * - processing -> completed (funds transferred)
 * - processing -> failed (transfer failed)
 * - completed -> reversed (payout clawed back)
 * - any non-terminal -> cancelled (manually cancelled)
 */
export type PayoutStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "reversed"
  | "expired";

/**
 * Payout method types.
 */
export type PayoutMethod =
  | "bank_transfer"
  | "crypto_withdrawal"
  | "stripe_payout"
  | "wire_transfer"
  | "internal_transfer";

/**
 * Supported payout currencies.
 */
export type PayoutCurrency = "USD" | "EUR" | "GBP" | "BTC" | "ETH" | "USDC";

// ============================================================================
// Payout Policy Types
// ============================================================================

/**
 * Policy rule severity when violated.
 */
export type PolicyViolationSeverity = "warning" | "block";

/**
 * Payout policy rule.
 */
export interface PayoutPolicyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: PolicyViolationSeverity;
  /** Evaluation function receives the payout and returns violation or null */
  type: PayoutPolicyRuleType;
  /** Parameters for the rule */
  params: Record<string, unknown>;
}

/**
 * Rule types for the policy engine.
 */
export type PayoutPolicyRuleType =
  | "min_amount"
  | "max_amount"
  | "daily_limit"
  | "weekly_limit"
  | "monthly_limit"
  | "frequency_limit"
  | "cooldown_period"
  | "recipient_whitelist"
  | "method_restriction"
  | "currency_restriction"
  | "time_window"
  | "reserve_minimum"
  | "approval_threshold"
  | "compliance_check"
  | "custom";

/**
 * Policy evaluation result.
 */
export interface PolicyEvaluationResult {
  allowed: boolean;
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  appliedRules: string[];
  evaluatedAt: number;
}

/**
 * A specific policy violation.
 */
export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: PolicyViolationSeverity;
  message: string;
  details: Record<string, unknown>;
}

/**
 * Complete payout policy configuration.
 */
export interface PayoutPolicy {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  enabled: boolean;

  /** Amount limits */
  minPayoutAmount: number;
  maxPayoutAmount: number;

  /** Frequency limits */
  maxPayoutsPerDay: number;
  maxPayoutsPerWeek: number;
  maxPayoutsPerMonth: number;

  /** Aggregate limits */
  dailyAmountLimit: number;
  weeklyAmountLimit: number;
  monthlyAmountLimit: number;

  /** Cooldown between payouts in milliseconds */
  cooldownPeriodMs: number;

  /** Reserve requirement as a fraction of treasury balance (0-1) */
  minimumReserveFraction: number;

  /** Allowed payout methods */
  allowedMethods: PayoutMethod[];

  /** Allowed currencies */
  allowedCurrencies: PayoutCurrency[];

  /** Approval thresholds */
  approvalThresholds: ApprovalThreshold[];

  /** Time window restrictions (e.g., business hours only) */
  timeWindowRestrictions: TimeWindowRestriction[];

  /** Custom rules */
  rules: PayoutPolicyRule[];

  /** Metadata */
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  version: number;
}

/**
 * Default policy values.
 */
export const DEFAULT_PAYOUT_POLICY: Omit<
  PayoutPolicy,
  "id" | "workspaceId" | "createdBy"
> = {
  name: "Default Payout Policy",
  description: "Standard payout controls with multi-approval for large amounts",
  enabled: true,
  minPayoutAmount: 100, // $1.00 in cents
  maxPayoutAmount: 10_000_000, // $100,000 in cents
  maxPayoutsPerDay: 10,
  maxPayoutsPerWeek: 25,
  maxPayoutsPerMonth: 50,
  dailyAmountLimit: 5_000_000, // $50,000
  weeklyAmountLimit: 15_000_000, // $150,000
  monthlyAmountLimit: 50_000_000, // $500,000
  cooldownPeriodMs: 5 * 60 * 1000, // 5 minutes
  minimumReserveFraction: 0.1, // 10% reserve
  allowedMethods: ["bank_transfer", "crypto_withdrawal", "stripe_payout"],
  allowedCurrencies: ["USD", "EUR", "GBP", "BTC", "ETH", "USDC"],
  approvalThresholds: [
    {
      id: "small",
      name: "Small Payout",
      minAmount: 0,
      maxAmount: 100_000, // $1,000
      requiredApprovals: 1,
      requiredRoles: ["admin", "owner"],
      expiresAfterMs: 24 * 60 * 60 * 1000, // 24 hours
    },
    {
      id: "medium",
      name: "Medium Payout",
      minAmount: 100_000,
      maxAmount: 1_000_000, // $10,000
      requiredApprovals: 2,
      requiredRoles: ["admin", "owner"],
      expiresAfterMs: 48 * 60 * 60 * 1000, // 48 hours
    },
    {
      id: "large",
      name: "Large Payout",
      minAmount: 1_000_000,
      maxAmount: Infinity,
      requiredApprovals: 3,
      requiredRoles: ["owner"],
      expiresAfterMs: 72 * 60 * 60 * 1000, // 72 hours
    },
  ],
  timeWindowRestrictions: [],
  rules: [],
  createdAt: 0,
  updatedAt: 0,
  version: 1,
};

// ============================================================================
// Approval Types
// ============================================================================

/**
 * Approval threshold definition.
 */
export interface ApprovalThreshold {
  id: string;
  name: string;
  /** Minimum payout amount (cents) for this threshold */
  minAmount: number;
  /** Maximum payout amount (cents) for this threshold */
  maxAmount: number;
  /** Number of approvals required */
  requiredApprovals: number;
  /** Roles that can approve at this level */
  requiredRoles: string[];
  /** How long before the approval request expires (ms) */
  expiresAfterMs: number;
}

/**
 * Approval decision.
 */
export type ApprovalDecision = "approved" | "rejected";

/**
 * Individual approval record.
 */
export interface ApprovalRecord {
  id: string;
  payoutId: string;
  approverId: string;
  approverRole: string;
  decision: ApprovalDecision;
  reason?: string;
  timestamp: number;
  ipAddress?: string;
}

/**
 * Approval status for a payout.
 */
export interface ApprovalStatus {
  payoutId: string;
  threshold: ApprovalThreshold;
  requiredApprovals: number;
  currentApprovals: number;
  approvals: ApprovalRecord[];
  rejections: ApprovalRecord[];
  isFullyApproved: boolean;
  isRejected: boolean;
  isExpired: boolean;
  expiresAt: number;
}

// ============================================================================
// Payout Request Types
// ============================================================================

/**
 * A payout request record.
 */
export interface PayoutRequest {
  id: string;
  workspaceId: string;
  requestedBy: string;

  /** Amount in smallest currency unit (cents) */
  amount: number;
  currency: PayoutCurrency;
  method: PayoutMethod;

  /** Recipient details */
  recipientId?: string;
  recipientName: string;
  recipientDetails: Record<string, unknown>;

  /** Description and purpose */
  description: string;
  category: PayoutCategory;
  reference?: string;

  /** Status tracking */
  status: PayoutStatus;
  statusHistory: PayoutStatusChange[];

  /** Approval tracking */
  approvalStatus?: ApprovalStatus;

  /** Processing details */
  externalId?: string;
  processingStartedAt?: number;
  completedAt?: number;
  failedAt?: number;
  failureReason?: string;

  /** Audit */
  createdAt: number;
  updatedAt: number;
  version: number;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Status change history entry.
 */
export interface PayoutStatusChange {
  fromStatus: PayoutStatus;
  toStatus: PayoutStatus;
  changedBy: string;
  reason?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Payout categories.
 */
export type PayoutCategory =
  | "vendor_payment"
  | "employee_salary"
  | "refund"
  | "withdrawal"
  | "transfer"
  | "dividend"
  | "expense"
  | "other";

/**
 * Input for creating a payout request.
 */
export interface CreatePayoutInput {
  workspaceId: string;
  requestedBy: string;
  amount: number;
  currency: PayoutCurrency;
  method: PayoutMethod;
  recipientName: string;
  recipientDetails: Record<string, unknown>;
  description: string;
  category: PayoutCategory;
  reference?: string;
  recipientId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Treasury Types
// ============================================================================

/**
 * Treasury account status.
 */
export type TreasuryAccountStatus = "active" | "frozen" | "closed";

/**
 * Treasury account record.
 */
export interface TreasuryAccount {
  id: string;
  workspaceId: string;
  name: string;
  currency: PayoutCurrency;
  status: TreasuryAccountStatus;

  /** Balances */
  totalBalance: number;
  availableBalance: number;
  reservedBalance: number;
  pendingOutgoing: number;
  pendingIncoming: number;

  /** Limits */
  minimumBalance: number;
  maximumBalance: number;

  /** Metadata */
  createdAt: number;
  updatedAt: number;
  version: number;
}

/**
 * Treasury transaction types.
 */
export type TreasuryTransactionType =
  | "deposit"
  | "withdrawal"
  | "payout"
  | "refund_received"
  | "fee"
  | "reserve_hold"
  | "reserve_release"
  | "adjustment"
  | "transfer_in"
  | "transfer_out";

/**
 * Treasury transaction record.
 */
export interface TreasuryTransaction {
  id: string;
  accountId: string;
  type: TreasuryTransactionType;
  amount: number;
  currency: PayoutCurrency;
  description: string;
  reference?: string;

  /** Balance before and after */
  balanceBefore: number;
  balanceAfter: number;

  /** Related entities */
  payoutId?: string;
  externalId?: string;
  counterpartyAccountId?: string;

  /** Audit */
  createdAt: number;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

/**
 * Treasury reconciliation result.
 */
export interface TreasuryReconciliationResult {
  accountId: string;
  timestamp: number;
  computedBalance: number;
  recordedBalance: number;
  discrepancy: number;
  isBalanced: boolean;
  transactionCount: number;
  issues: string[];
}

/**
 * Treasury snapshot for reporting.
 */
export interface TreasurySnapshot {
  accountId: string;
  timestamp: number;
  totalBalance: number;
  availableBalance: number;
  reservedBalance: number;
  pendingOutgoing: number;
  pendingIncoming: number;
}

// ============================================================================
// Audit Types
// ============================================================================

/**
 * Treasury audit event types.
 */
export type TreasuryAuditEventType =
  | "payout_requested"
  | "payout_submitted_for_approval"
  | "payout_approved"
  | "payout_rejected"
  | "payout_cancelled"
  | "payout_processing"
  | "payout_completed"
  | "payout_failed"
  | "payout_reversed"
  | "payout_expired"
  | "approval_requested"
  | "approval_granted"
  | "approval_denied"
  | "approval_expired"
  | "policy_evaluated"
  | "policy_violation"
  | "policy_updated"
  | "treasury_deposit"
  | "treasury_withdrawal"
  | "treasury_reserve_hold"
  | "treasury_reserve_release"
  | "treasury_adjustment"
  | "treasury_reconciliation"
  | "treasury_frozen"
  | "treasury_unfrozen";

/**
 * Treasury audit log entry.
 */
export interface TreasuryAuditEntry {
  id: string;
  eventType: TreasuryAuditEventType;
  timestamp: number;
  actorId: string;
  actorRole: string;
  workspaceId: string;

  /** Related entity IDs */
  payoutId?: string;
  accountId?: string;
  approvalId?: string;
  transactionId?: string;

  /** Event details */
  description: string;
  amount?: number;
  currency?: PayoutCurrency;
  previousState?: string;
  newState?: string;

  /** Security context */
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;

  /** Immutability */
  checksum: string;
  previousChecksum?: string;

  /** Additional data */
  metadata?: Record<string, unknown>;
}

/**
 * Audit query filters.
 */
export interface TreasuryAuditFilters {
  eventTypes?: TreasuryAuditEventType[];
  actorId?: string;
  workspaceId?: string;
  payoutId?: string;
  accountId?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Valid State Transitions
// ============================================================================

/**
 * Map of valid payout state transitions.
 */
export const VALID_PAYOUT_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  draft: ["pending_approval", "cancelled"],
  pending_approval: ["approved", "expired", "cancelled"],
  approved: ["processing", "cancelled"],
  processing: ["completed", "failed"],
  completed: ["reversed"],
  failed: ["draft"], // Allow retry by going back to draft
  cancelled: [],
  reversed: [],
  expired: ["draft"], // Allow resubmission
};

/**
 * Terminal states that cannot transition further (except reversed and failed -> draft).
 */
export const TERMINAL_PAYOUT_STATES: PayoutStatus[] = ["cancelled", "reversed"];

// ============================================================================
// Error Types
// ============================================================================

/**
 * Payout error codes.
 */
export enum PayoutErrorCode {
  // Policy violations
  POLICY_VIOLATION = "POLICY_VIOLATION",
  MIN_AMOUNT_VIOLATION = "MIN_AMOUNT_VIOLATION",
  MAX_AMOUNT_VIOLATION = "MAX_AMOUNT_VIOLATION",
  FREQUENCY_LIMIT_EXCEEDED = "FREQUENCY_LIMIT_EXCEEDED",
  DAILY_LIMIT_EXCEEDED = "DAILY_LIMIT_EXCEEDED",
  WEEKLY_LIMIT_EXCEEDED = "WEEKLY_LIMIT_EXCEEDED",
  MONTHLY_LIMIT_EXCEEDED = "MONTHLY_LIMIT_EXCEEDED",
  COOLDOWN_ACTIVE = "COOLDOWN_ACTIVE",
  METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED",
  CURRENCY_NOT_ALLOWED = "CURRENCY_NOT_ALLOWED",
  TIME_WINDOW_VIOLATION = "TIME_WINDOW_VIOLATION",
  RESERVE_VIOLATION = "RESERVE_VIOLATION",

  // Approval errors
  APPROVAL_REQUIRED = "APPROVAL_REQUIRED",
  SELF_APPROVAL_DENIED = "SELF_APPROVAL_DENIED",
  DUPLICATE_APPROVAL = "DUPLICATE_APPROVAL",
  INSUFFICIENT_ROLE = "INSUFFICIENT_ROLE",
  APPROVAL_EXPIRED = "APPROVAL_EXPIRED",
  ALREADY_DECIDED = "ALREADY_DECIDED",

  // Treasury errors
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  TREASURY_FROZEN = "TREASURY_FROZEN",
  BALANCE_BELOW_MINIMUM = "BALANCE_BELOW_MINIMUM",
  BALANCE_ABOVE_MAXIMUM = "BALANCE_ABOVE_MAXIMUM",

  // State errors
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  PAYOUT_NOT_FOUND = "PAYOUT_NOT_FOUND",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  CONCURRENT_MODIFICATION = "CONCURRENT_MODIFICATION",

  // General
  INVALID_INPUT = "INVALID_INPUT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Payout error class.
 */
export class PayoutError extends Error {
  constructor(
    public readonly code: PayoutErrorCode,
    message: string,
    public readonly payoutId?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PayoutError";
  }
}

// ============================================================================
// Time Window Types
// ============================================================================

/**
 * Day of week (0 = Sunday, 6 = Saturday).
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Time window restriction for payouts.
 */
export interface TimeWindowRestriction {
  id: string;
  name: string;
  /** Days when payouts are allowed */
  allowedDays: DayOfWeek[];
  /** Start hour (0-23) in UTC */
  startHourUTC: number;
  /** End hour (0-23) in UTC */
  endHourUTC: number;
  /** Whether to block or warn */
  severity: PolicyViolationSeverity;
}

/**
 * Default business hours restriction.
 */
export const DEFAULT_BUSINESS_HOURS: TimeWindowRestriction = {
  id: "business_hours",
  name: "Business Hours Only",
  allowedDays: [1, 2, 3, 4, 5], // Monday-Friday
  startHourUTC: 9,
  endHourUTC: 17,
  severity: "warning",
};
