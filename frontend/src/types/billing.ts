/**
 * Billing Types
 * Type definitions for billing, subscriptions, and payments
 */

export type PlanTier = "free" | "starter" | "pro" | "business" | "enterprise";

export type BillingInterval = "month" | "year";

export type PaymentMethod = "card" | "crypto";

export type CryptoNetwork = "ethereum" | "polygon" | "bsc" | "arbitrum";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

export interface PlanFeatures {
  maxUsers: number | null; // null = unlimited
  maxChannels: number | null;
  maxMessagesPerMonth: number | null;
  maxStorageGB: number | null;
  maxFileUploadMB: number;
  maxIntegrations: number | null;
  maxBots: number | null;
  maxAdmins: number | null;

  // Feature flags
  customBranding: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  sla: boolean;
  ssoIntegration: boolean;
  auditLogs: boolean;
  dataExport: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  customDomain: boolean;
  whiteLabel: boolean;

  // AI features
  aiSummarization: boolean;
  aiModerationMinutes: number | null;
  aiSearchQueries: number | null;

  // Communication features
  videoConferencing: boolean;
  screenSharing: boolean;
  voiceMessages: boolean;
  maxCallParticipants: number;
  recordingStorage: boolean;

  // Advanced features
  guestAccess: boolean;
  tokenGating: boolean;
  cryptoPayments: boolean;
  nftIntegration: boolean;
}

export interface PlanPrice {
  monthly: number; // USD
  yearly: number; // USD (annual billing)
  monthlyStripeId?: string;
  yearlyStripeId?: string;
  cryptoMonthly?: {
    eth: number;
    usdc: number;
    usdt: number;
  };
}

export interface Plan {
  id: PlanTier;
  name: string;
  description: string;
  tagline: string;
  price: PlanPrice;
  features: PlanFeatures;
  popular?: boolean;
  recommended?: boolean;
  color?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanTier;
  status: SubscriptionStatus;
  interval: BillingInterval;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  cryptoAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageMetrics {
  userId: string;
  period: string; // YYYY-MM
  users: number;
  channels: number;
  messages: number;
  storageGB: number;
  integrations: number;
  bots: number;
  aiMinutes: number;
  aiQueries: number;
  callMinutes: number;
  recordingGB: number;
}

export interface UsageLimits {
  plan: PlanTier;
  current: UsageMetrics;
  limits: PlanFeatures;
  warnings: UsageWarning[];
  exceeded: boolean;
}

export interface UsageWarning {
  feature: string;
  current: number;
  limit: number;
  percentage: number;
  severity: "info" | "warning" | "critical";
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  stripePaymentIntentId?: string;
  cryptoTxHash?: string;
  cryptoNetwork?: CryptoNetwork;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  dueDate: Date;
  paidAt?: Date;
  stripeInvoiceId?: string;
  downloadUrl?: string;
  createdAt: Date;
}

// Token Gating Types
export type TokenType = "erc20" | "erc721" | "erc1155";

export interface TokenRequirement {
  id: string;
  channelId?: string;
  roleId?: string;
  featureId?: string;

  tokenType: TokenType;
  contractAddress: string;
  network: CryptoNetwork;

  // For ERC-20
  minBalance?: number;

  // For ERC-721/ERC-1155
  tokenIds?: string[];
  minTokenCount?: number;

  name: string;
  description?: string;
  enabled: boolean;
  createdAt: Date;
}

export interface TokenVerification {
  id: string;
  userId: string;
  requirementId: string;
  walletAddress: string;
  verified: boolean;
  balance?: number;
  tokenIds?: string[];
  lastChecked: Date;
  expiresAt?: Date;
}

// Crypto Wallet Types
export interface CryptoWallet {
  id: string;
  userId: string;
  address: string;
  network: CryptoNetwork;
  provider: "metamask" | "coinbase" | "walletconnect";
  verified: boolean;
  primary: boolean;
  createdAt: Date;
}

export interface CryptoPayment {
  id: string;
  userId: string;
  subscriptionId?: string;
  amount: number;
  currency: "ETH" | "USDC" | "USDT" | "MATIC" | "BNB";
  network: CryptoNetwork;
  fromAddress: string;
  toAddress: string;
  txHash?: string;
  status: PaymentStatus;
  confirmations: number;
  createdAt: Date;
  completedAt?: Date;
}

// Billing Admin Types
export interface BillingStats {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;

  planDistribution: Record<PlanTier, number>;
  paymentMethodDistribution: Record<PaymentMethod, number>;

  recentPayments: PaymentIntent[];
  failedPayments: PaymentIntent[];
  upcomingRenewals: Subscription[];
}

export interface ChannelSubscription {
  id: string;
  channelId: string;
  userId: string;
  planId: string;
  price: number;
  currency: string;
  interval: BillingInterval;
  status: SubscriptionStatus;
  paymentMethod: PaymentMethod;

  // Token gating
  tokenRequirement?: TokenRequirement;

  createdAt: Date;
  expiresAt: Date;
}
