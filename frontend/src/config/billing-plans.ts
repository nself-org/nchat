/**
 * Billing Plans Configuration
 * Defines all subscription tiers and their features
 */

import type { Plan, PlanTier } from "@/types/billing";

export const PLANS: Record<PlanTier, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Perfect for personal use and small teams",
    tagline: "Get started for free",
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: {
      maxUsers: 10,
      maxChannels: 5,
      maxMessagesPerMonth: 10000,
      maxStorageGB: 5,
      maxFileUploadMB: 10,
      maxIntegrations: 2,
      maxBots: 1,
      maxAdmins: 1,

      customBranding: false,
      advancedAnalytics: false,
      prioritySupport: false,
      sla: false,
      ssoIntegration: false,
      auditLogs: false,
      dataExport: true,
      apiAccess: false,
      webhooks: false,
      customDomain: false,
      whiteLabel: false,

      aiSummarization: false,
      aiModerationMinutes: null,
      aiSearchQueries: 100,

      videoConferencing: true,
      screenSharing: false,
      voiceMessages: true,
      maxCallParticipants: 4,
      recordingStorage: false,

      guestAccess: false,
      tokenGating: false,
      cryptoPayments: false,
      nftIntegration: false,
    },
    color: "slate",
  },

  starter: {
    id: "starter",
    name: "Starter",
    description: "For growing teams with basic needs",
    tagline: "Everything in Free, plus more",
    price: {
      monthly: 8,
      yearly: 80, // ~17% discount
      monthlyStripeId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
      yearlyStripeId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
      cryptoMonthly: {
        eth: 0.0025,
        usdc: 8,
        usdt: 8,
      },
    },
    features: {
      maxUsers: 50,
      maxChannels: 25,
      maxMessagesPerMonth: 100000,
      maxStorageGB: 50,
      maxFileUploadMB: 50,
      maxIntegrations: 10,
      maxBots: 5,
      maxAdmins: 3,

      customBranding: true,
      advancedAnalytics: false,
      prioritySupport: false,
      sla: false,
      ssoIntegration: false,
      auditLogs: true,
      dataExport: true,
      apiAccess: true,
      webhooks: true,
      customDomain: false,
      whiteLabel: false,

      aiSummarization: true,
      aiModerationMinutes: 100,
      aiSearchQueries: 1000,

      videoConferencing: true,
      screenSharing: true,
      voiceMessages: true,
      maxCallParticipants: 10,
      recordingStorage: true,

      guestAccess: true,
      tokenGating: false,
      cryptoPayments: false,
      nftIntegration: false,
    },
    popular: true,
    color: "blue",
  },

  pro: {
    id: "pro",
    name: "Pro",
    description: "For professional teams with advanced needs",
    tagline: "Most popular for teams",
    price: {
      monthly: 25,
      yearly: 250, // ~17% discount
      monthlyStripeId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      yearlyStripeId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
      cryptoMonthly: {
        eth: 0.008,
        usdc: 25,
        usdt: 25,
      },
    },
    features: {
      maxUsers: 200,
      maxChannels: 100,
      maxMessagesPerMonth: 500000,
      maxStorageGB: 250,
      maxFileUploadMB: 200,
      maxIntegrations: 50,
      maxBots: 20,
      maxAdmins: 10,

      customBranding: true,
      advancedAnalytics: true,
      prioritySupport: true,
      sla: false,
      ssoIntegration: true,
      auditLogs: true,
      dataExport: true,
      apiAccess: true,
      webhooks: true,
      customDomain: true,
      whiteLabel: true,

      aiSummarization: true,
      aiModerationMinutes: 500,
      aiSearchQueries: 5000,

      videoConferencing: true,
      screenSharing: true,
      voiceMessages: true,
      maxCallParticipants: 25,
      recordingStorage: true,

      guestAccess: true,
      tokenGating: true,
      cryptoPayments: true,
      nftIntegration: true,
    },
    recommended: true,
    color: "indigo",
  },

  business: {
    id: "business",
    name: "Business",
    description: "For large organizations with complex requirements",
    tagline: "Advanced features and support",
    price: {
      monthly: 75,
      yearly: 750, // ~17% discount
      monthlyStripeId: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
      yearlyStripeId: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
      cryptoMonthly: {
        eth: 0.024,
        usdc: 75,
        usdt: 75,
      },
    },
    features: {
      maxUsers: 1000,
      maxChannels: 500,
      maxMessagesPerMonth: 2000000,
      maxStorageGB: 1000,
      maxFileUploadMB: 500,
      maxIntegrations: null,
      maxBots: 100,
      maxAdmins: 50,

      customBranding: true,
      advancedAnalytics: true,
      prioritySupport: true,
      sla: true,
      ssoIntegration: true,
      auditLogs: true,
      dataExport: true,
      apiAccess: true,
      webhooks: true,
      customDomain: true,
      whiteLabel: true,

      aiSummarization: true,
      aiModerationMinutes: 2000,
      aiSearchQueries: 20000,

      videoConferencing: true,
      screenSharing: true,
      voiceMessages: true,
      maxCallParticipants: 100,
      recordingStorage: true,

      guestAccess: true,
      tokenGating: true,
      cryptoPayments: true,
      nftIntegration: true,
    },
    color: "purple",
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for enterprise organizations",
    tagline: "Unlimited everything + dedicated support",
    price: {
      monthly: 0, // Custom pricing
      yearly: 0,
    },
    features: {
      maxUsers: null,
      maxChannels: null,
      maxMessagesPerMonth: null,
      maxStorageGB: null,
      maxFileUploadMB: 2000,
      maxIntegrations: null,
      maxBots: null,
      maxAdmins: null,

      customBranding: true,
      advancedAnalytics: true,
      prioritySupport: true,
      sla: true,
      ssoIntegration: true,
      auditLogs: true,
      dataExport: true,
      apiAccess: true,
      webhooks: true,
      customDomain: true,
      whiteLabel: true,

      aiSummarization: true,
      aiModerationMinutes: null,
      aiSearchQueries: null,

      videoConferencing: true,
      screenSharing: true,
      voiceMessages: true,
      maxCallParticipants: 500,
      recordingStorage: true,

      guestAccess: true,
      tokenGating: true,
      cryptoPayments: true,
      nftIntegration: true,
    },
    color: "amber",
  },
};

export const DEFAULT_PLAN: PlanTier = "free";

export const TRIAL_DAYS = 14;

export const CRYPTO_NETWORKS = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    rpcUrl: "https://mainnet.infura.io/v3/",
    symbol: "ETH",
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpcUrl: "https://polygon-rpc.com",
    symbol: "MATIC",
  },
  bsc: {
    name: "Binance Smart Chain",
    chainId: 56,
    rpcUrl: "https://bsc-dataseed.binance.org",
    symbol: "BNB",
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    symbol: "ETH",
  },
} as const;

export const PAYMENT_TOKENS = {
  USDC: {
    ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    bsc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    arbitrum: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  },
  USDT: {
    ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    bsc: "0x55d398326f99059fF775485246999027B3197955",
    arbitrum: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  },
} as const;

export function getPlanByTier(tier: PlanTier): Plan {
  return PLANS[tier];
}

export function getAllPlans(): Plan[] {
  return Object.values(PLANS);
}

export function comparePlans(
  currentTier: PlanTier,
  targetTier: PlanTier,
): "upgrade" | "downgrade" | "same" {
  const tierOrder: PlanTier[] = [
    "free",
    "starter",
    "pro",
    "business",
    "enterprise",
  ];
  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);

  if (currentIndex < targetIndex) return "upgrade";
  if (currentIndex > targetIndex) return "downgrade";
  return "same";
}

export function calculateAnnualSavings(plan: Plan): number {
  if (plan.price.monthly === 0) return 0;
  const monthlyTotal = plan.price.monthly * 12;
  const annualTotal = plan.price.yearly;
  return monthlyTotal - annualTotal;
}

export function formatPrice(amount: number, currency: string = "USD"): string {
  if (amount === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}
