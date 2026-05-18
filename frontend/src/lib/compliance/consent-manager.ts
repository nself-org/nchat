/**
 * Consent Manager
 *
 * Handles user consent tracking and management for GDPR compliance.
 */

import type {
  UserConsent,
  ConsentType,
  ConsentStatus,
  ConsentConfig,
  CookiePreferences,
} from "./compliance-types";

// ============================================================================
// CONSENT CONFIGURATIONS
// ============================================================================

export const CONSENT_CONFIGS: ConsentConfig[] = [
  {
    type: "essential",
    name: "Essential",
    description:
      "Required for the application to function properly. Cannot be disabled.",
    required: true,
    defaultValue: true,
    category: "essential",
    legalBasis: "contract",
    dataProcessed: ["Session data", "Authentication tokens", "Security logs"],
    retentionPeriod: "Duration of session",
    version: "1.0",
  },
  {
    type: "analytics",
    name: "Analytics",
    description:
      "Help us understand how you use our application to improve your experience.",
    required: false,
    defaultValue: false,
    category: "analytics",
    legalBasis: "consent",
    dataProcessed: ["Page views", "Feature usage", "Performance metrics"],
    thirdParties: ["Google Analytics", "Mixpanel"],
    retentionPeriod: "26 months",
    version: "1.0",
  },
  {
    type: "marketing",
    name: "Marketing",
    description:
      "Allow us to send you relevant product updates and promotional content.",
    required: false,
    defaultValue: false,
    category: "marketing",
    legalBasis: "consent",
    dataProcessed: ["Email address", "Preferences", "Interaction history"],
    thirdParties: ["Mailchimp", "HubSpot"],
    retentionPeriod: "Until consent withdrawn",
    version: "1.0",
  },
  {
    type: "personalization",
    name: "Personalization",
    description:
      "Customize your experience based on your preferences and usage patterns.",
    required: false,
    defaultValue: true,
    category: "functional",
    legalBasis: "legitimate_interest",
    dataProcessed: ["Preferences", "Settings", "Feature usage"],
    retentionPeriod: "While account active",
    version: "1.0",
  },
  {
    type: "third_party",
    name: "Third-Party Integrations",
    description: "Allow data sharing with integrated third-party services.",
    required: false,
    defaultValue: false,
    category: "functional",
    legalBasis: "consent",
    dataProcessed: ["Profile data", "Messages", "Files"],
    thirdParties: ["Slack", "GitHub", "Google Drive"],
    retentionPeriod: "Per third-party policy",
    version: "1.0",
  },
  {
    type: "data_processing",
    name: "Data Processing Agreement",
    description:
      "Consent to process your personal data as described in our privacy policy.",
    required: true,
    defaultValue: false,
    category: "essential",
    legalBasis: "consent",
    dataProcessed: ["All personal data"],
    retentionPeriod: "As per retention policy",
    version: "1.0",
  },
  {
    type: "communications",
    name: "Communications",
    description: "Receive important updates and notifications via email.",
    required: false,
    defaultValue: true,
    category: "functional",
    legalBasis: "legitimate_interest",
    dataProcessed: ["Email address", "Notification preferences"],
    retentionPeriod: "While account active",
    version: "1.0",
  },
  {
    type: "cookies_essential",
    name: "Essential Cookies",
    description: "Necessary for basic site functionality.",
    required: true,
    defaultValue: true,
    category: "essential",
    legalBasis: "contract",
    dataProcessed: ["Session cookies", "Authentication cookies"],
    retentionPeriod: "Session/1 year",
    version: "1.0",
  },
  {
    type: "cookies_functional",
    name: "Functional Cookies",
    description: "Remember your preferences and settings.",
    required: false,
    defaultValue: true,
    category: "functional",
    legalBasis: "consent",
    dataProcessed: ["Preference cookies", "Language settings"],
    retentionPeriod: "1 year",
    version: "1.0",
  },
  {
    type: "cookies_analytics",
    name: "Analytics Cookies",
    description: "Help us understand how you use our service.",
    required: false,
    defaultValue: false,
    category: "analytics",
    legalBasis: "consent",
    dataProcessed: ["Usage data", "Performance data"],
    thirdParties: ["Google Analytics"],
    retentionPeriod: "26 months",
    version: "1.0",
  },
  {
    type: "cookies_advertising",
    name: "Advertising Cookies",
    description: "Used to show relevant ads and measure ad performance.",
    required: false,
    defaultValue: false,
    category: "marketing",
    legalBasis: "consent",
    dataProcessed: ["Browsing behavior", "Ad interactions"],
    thirdParties: ["Google Ads", "Facebook Pixel"],
    retentionPeriod: "90 days",
    version: "1.0",
  },
];

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

/**
 * Create a new consent record
 */
export function createConsent(
  userId: string,
  consentType: ConsentType,
  status: ConsentStatus,
  options: {
    ipAddress?: string;
    userAgent?: string;
    source?: UserConsent["source"];
  } = {},
): UserConsent {
  const config = CONSENT_CONFIGS.find((c) => c.type === consentType);
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    userId,
    consentType,
    status,
    version: config?.version || "1.0",
    grantedAt: status === "granted" ? now : undefined,
    revokedAt: status === "denied" ? now : undefined,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    source: options.source || "settings",
  };
}

/**
 * Update consent status
 */
export function updateConsentStatus(
  consent: UserConsent,
  newStatus: ConsentStatus,
  options: {
    ipAddress?: string;
    userAgent?: string;
  } = {},
): UserConsent {
  const now = new Date();

  return {
    ...consent,
    status: newStatus,
    grantedAt: newStatus === "granted" ? now : consent.grantedAt,
    revokedAt: newStatus === "denied" ? now : consent.revokedAt,
    ipAddress: options.ipAddress || consent.ipAddress,
    userAgent: options.userAgent || consent.userAgent,
  };
}

// ============================================================================
// CONSENT VALIDATION
// ============================================================================

/**
 * Check if all required consents are granted
 */
export function hasRequiredConsents(consents: UserConsent[]): {
  valid: boolean;
  missing: ConsentType[];
} {
  const requiredTypes = CONSENT_CONFIGS.filter((c) => c.required).map(
    (c) => c.type,
  );
  const grantedTypes = consents
    .filter((c) => c.status === "granted")
    .map((c) => c.consentType);

  const missing = requiredTypes.filter((type) => !grantedTypes.includes(type));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get consent config by type
 */
export function getConsentConfig(type: ConsentType): ConsentConfig | undefined {
  return CONSENT_CONFIGS.find((c) => c.type === type);
}

/**
 * Check if consent type is required
 */
export function isConsentRequired(type: ConsentType): boolean {
  const config = getConsentConfig(type);
  return config?.required || false;
}

/**
 * Get current consent status for a type
 */
export function getCurrentConsentStatus(
  consents: UserConsent[],
  type: ConsentType,
): ConsentStatus {
  const consent = consents.find((c) => c.consentType === type);
  return consent?.status || "pending";
}

// ============================================================================
// COOKIE PREFERENCES
// ============================================================================

/**
 * Create default cookie preferences
 */
export function createDefaultCookiePreferences(): CookiePreferences {
  return {
    essential: true, // Always true
    functional: true,
    analytics: false,
    advertising: false,
    updatedAt: new Date(),
  };
}

/**
 * Update cookie preferences
 */
export function updateCookiePreferences(
  current: CookiePreferences,
  updates: Partial<Omit<CookiePreferences, "essential" | "updatedAt">>,
): CookiePreferences {
  return {
    ...current,
    ...updates,
    essential: true, // Always true
    updatedAt: new Date(),
  };
}

/**
 * Convert cookie preferences to consent records
 */
export function cookiePreferencesToConsents(
  userId: string,
  preferences: CookiePreferences,
  options: {
    ipAddress?: string;
    userAgent?: string;
  } = {},
): UserConsent[] {
  const consents: UserConsent[] = [];

  // Essential cookies (always granted)
  consents.push(
    createConsent(userId, "cookies_essential", "granted", {
      ...options,
      source: "banner",
    }),
  );

  // Functional cookies
  consents.push(
    createConsent(
      userId,
      "cookies_functional",
      preferences.functional ? "granted" : "denied",
      {
        ...options,
        source: "banner",
      },
    ),
  );

  // Analytics cookies
  consents.push(
    createConsent(
      userId,
      "cookies_analytics",
      preferences.analytics ? "granted" : "denied",
      {
        ...options,
        source: "banner",
      },
    ),
  );

  // Advertising cookies
  consents.push(
    createConsent(
      userId,
      "cookies_advertising",
      preferences.advertising ? "granted" : "denied",
      {
        ...options,
        source: "banner",
      },
    ),
  );

  return consents;
}

// ============================================================================
// CONSENT SUMMARY
// ============================================================================

export interface ConsentSummary {
  totalConsents: number;
  granted: number;
  denied: number;
  pending: number;
  byCategory: Record<
    string,
    { granted: number; denied: number; pending: number }
  >;
  lastUpdated?: Date;
}

/**
 * Generate consent summary
 */
export function generateConsentSummary(
  consents: UserConsent[],
): ConsentSummary {
  const summary: ConsentSummary = {
    totalConsents: consents.length,
    granted: 0,
    denied: 0,
    pending: 0,
    byCategory: {},
    lastUpdated: undefined,
  };

  const categories = new Set(CONSENT_CONFIGS.map((c) => c.category));
  categories.forEach((cat) => {
    summary.byCategory[cat] = { granted: 0, denied: 0, pending: 0 };
  });

  for (const consent of consents) {
    const config = getConsentConfig(consent.consentType);
    const category = config?.category || "other";

    switch (consent.status) {
      case "granted":
        summary.granted++;
        if (summary.byCategory[category]) {
          summary.byCategory[category].granted++;
        }
        break;
      case "denied":
        summary.denied++;
        if (summary.byCategory[category]) {
          summary.byCategory[category].denied++;
        }
        break;
      case "pending":
        summary.pending++;
        if (summary.byCategory[category]) {
          summary.byCategory[category].pending++;
        }
        break;
    }

    // Track last updated
    const updateDate = consent.grantedAt || consent.revokedAt;
    if (updateDate) {
      if (!summary.lastUpdated || updateDate > summary.lastUpdated) {
        summary.lastUpdated = updateDate;
      }
    }
  }

  return summary;
}

// ============================================================================
// CONSENT EXPORT (FOR GDPR REQUESTS)
// ============================================================================

/**
 * Export consent history for user
 */
export function exportConsentHistory(consents: UserConsent[]): {
  consents: Array<{
    type: string;
    name: string;
    status: string;
    grantedAt?: string;
    revokedAt?: string;
    version: string;
    source: string;
  }>;
  summary: ConsentSummary;
  exportedAt: string;
} {
  const exportedConsents = consents.map((consent) => {
    const config = getConsentConfig(consent.consentType);
    return {
      type: consent.consentType,
      name: config?.name || consent.consentType,
      status: consent.status,
      grantedAt: consent.grantedAt?.toISOString(),
      revokedAt: consent.revokedAt?.toISOString(),
      version: consent.version,
      source: consent.source,
    };
  });

  return {
    consents: exportedConsents,
    summary: generateConsentSummary(consents),
    exportedAt: new Date().toISOString(),
  };
}

// ============================================================================
// LEGAL BASIS HELPERS
// ============================================================================

export type LegalBasis = ConsentConfig["legalBasis"];

/**
 * Get legal basis display info
 */
export function getLegalBasisInfo(basis: LegalBasis): {
  name: string;
  description: string;
  gdprArticle: string;
} {
  const basisInfo: Record<
    LegalBasis,
    { name: string; description: string; gdprArticle: string }
  > = {
    consent: {
      name: "Consent",
      description: "Processing based on explicit user consent",
      gdprArticle: "Article 6(1)(a)",
    },
    contract: {
      name: "Contract",
      description: "Necessary for the performance of a contract",
      gdprArticle: "Article 6(1)(b)",
    },
    legal_obligation: {
      name: "Legal Obligation",
      description: "Necessary for compliance with a legal obligation",
      gdprArticle: "Article 6(1)(c)",
    },
    legitimate_interest: {
      name: "Legitimate Interest",
      description:
        "Necessary for legitimate interests pursued by the controller",
      gdprArticle: "Article 6(1)(f)",
    },
  };

  return basisInfo[basis];
}

// ============================================================================
// EXPORT
// ============================================================================

export const ConsentManager = {
  CONSENT_CONFIGS,
  createConsent,
  updateConsentStatus,
  hasRequiredConsents,
  getConsentConfig,
  isConsentRequired,
  getCurrentConsentStatus,
  createDefaultCookiePreferences,
  updateCookiePreferences,
  cookiePreferencesToConsents,
  generateConsentSummary,
  exportConsentHistory,
  getLegalBasisInfo,
};
