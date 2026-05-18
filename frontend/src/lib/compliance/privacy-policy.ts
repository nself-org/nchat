/**
 * Privacy Policy Helpers
 *
 * Utilities for managing privacy settings and generating privacy documentation.
 */

import type { PrivacySettings } from "./compliance-types";

// ============================================================================
// DEFAULT PRIVACY SETTINGS
// ============================================================================

/**
 * Create default privacy settings for a user
 */
export function createDefaultPrivacySettings(userId: string): PrivacySettings {
  return {
    userId,
    profileVisibility: "members",
    showOnlineStatus: true,
    showLastSeen: true,
    showReadReceipts: true,
    showTypingIndicator: true,
    allowDirectMessages: "everyone",
    allowInvites: true,
    allowMentions: true,
    searchable: true,
    activityStatusVisible: true,
    shareAnalytics: false,
    personalizedAds: false,
    dataProcessingConsent: false,
    marketingEmails: false,
    productUpdates: true,
    securityAlerts: true,
    updatedAt: new Date(),
  };
}

// ============================================================================
// PRIVACY SETTING OPTIONS
// ============================================================================

export const PROFILE_VISIBILITY_OPTIONS: {
  value: PrivacySettings["profileVisibility"];
  label: string;
  description: string;
}[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can view your profile",
  },
  {
    value: "members",
    label: "Members Only",
    description: "Only workspace members can view your profile",
  },
  {
    value: "contacts",
    label: "Contacts Only",
    description: "Only your contacts can view your profile",
  },
  {
    value: "private",
    label: "Private",
    description: "Your profile is hidden from everyone",
  },
];

export const DIRECT_MESSAGE_OPTIONS: {
  value: PrivacySettings["allowDirectMessages"];
  label: string;
  description: string;
}[] = [
  {
    value: "everyone",
    label: "Everyone",
    description: "Anyone can send you direct messages",
  },
  {
    value: "contacts",
    label: "Contacts Only",
    description: "Only your contacts can send you direct messages",
  },
  {
    value: "none",
    label: "Nobody",
    description: "Disable direct messages",
  },
];

// ============================================================================
// PRIVACY SETTING CATEGORIES
// ============================================================================

export interface PrivacySettingCategory {
  id: string;
  name: string;
  description: string;
  settings: PrivacySettingConfig[];
}

export interface PrivacySettingConfig {
  key: keyof PrivacySettings;
  name: string;
  description: string;
  type: "boolean" | "select";
  options?: { value: string; label: string }[];
  sensitive?: boolean;
}

export const PRIVACY_SETTING_CATEGORIES: PrivacySettingCategory[] = [
  {
    id: "profile",
    name: "Profile Privacy",
    description: "Control who can see your profile information",
    settings: [
      {
        key: "profileVisibility",
        name: "Profile Visibility",
        description: "Who can view your profile",
        type: "select",
        options: PROFILE_VISIBILITY_OPTIONS,
      },
      {
        key: "searchable",
        name: "Searchable",
        description: "Allow others to find you in search",
        type: "boolean",
      },
    ],
  },
  {
    id: "activity",
    name: "Activity & Status",
    description: "Control visibility of your activity",
    settings: [
      {
        key: "showOnlineStatus",
        name: "Show Online Status",
        description: "Let others see when you are online",
        type: "boolean",
      },
      {
        key: "showLastSeen",
        name: "Show Last Seen",
        description: "Let others see when you were last active",
        type: "boolean",
      },
      {
        key: "activityStatusVisible",
        name: "Activity Status",
        description: 'Show your current activity (e.g., "In a meeting")',
        type: "boolean",
      },
    ],
  },
  {
    id: "messaging",
    name: "Messaging",
    description: "Control your messaging preferences",
    settings: [
      {
        key: "showReadReceipts",
        name: "Read Receipts",
        description: "Let others know when you read their messages",
        type: "boolean",
      },
      {
        key: "showTypingIndicator",
        name: "Typing Indicator",
        description: "Show when you are typing",
        type: "boolean",
      },
      {
        key: "allowDirectMessages",
        name: "Direct Messages",
        description: "Who can send you direct messages",
        type: "select",
        options: DIRECT_MESSAGE_OPTIONS,
      },
      {
        key: "allowMentions",
        name: "Allow Mentions",
        description: "Allow others to @mention you",
        type: "boolean",
      },
    ],
  },
  {
    id: "invitations",
    name: "Invitations",
    description: "Control invitation preferences",
    settings: [
      {
        key: "allowInvites",
        name: "Allow Invitations",
        description: "Allow others to invite you to channels and groups",
        type: "boolean",
      },
    ],
  },
  {
    id: "data",
    name: "Data & Analytics",
    description: "Control how your data is used",
    settings: [
      {
        key: "shareAnalytics",
        name: "Share Analytics",
        description: "Help improve the product by sharing usage data",
        type: "boolean",
        sensitive: true,
      },
      {
        key: "personalizedAds",
        name: "Personalized Ads",
        description: "Allow personalized advertising",
        type: "boolean",
        sensitive: true,
      },
      {
        key: "dataProcessingConsent",
        name: "Data Processing",
        description: "Consent to data processing as per privacy policy",
        type: "boolean",
        sensitive: true,
      },
    ],
  },
  {
    id: "communications",
    name: "Email Communications",
    description: "Control email notifications and updates",
    settings: [
      {
        key: "marketingEmails",
        name: "Marketing Emails",
        description: "Receive promotional emails and offers",
        type: "boolean",
      },
      {
        key: "productUpdates",
        name: "Product Updates",
        description: "Receive emails about new features and updates",
        type: "boolean",
      },
      {
        key: "securityAlerts",
        name: "Security Alerts",
        description: "Receive important security notifications",
        type: "boolean",
      },
    ],
  },
];

// ============================================================================
// PRIVACY POLICY GENERATION
// ============================================================================

export interface PrivacyPolicySection {
  id: string;
  title: string;
  content: string;
}

/**
 * Generate privacy policy sections
 */
export function generatePrivacyPolicySections(
  appName: string,
  companyName: string,
  contactEmail: string,
): PrivacyPolicySection[] {
  const sections: PrivacyPolicySection[] = [
    {
      id: "introduction",
      title: "Introduction",
      content: `This Privacy Policy describes how ${companyName} ("we", "us", or "our") collects, uses, and shares information when you use ${appName} (the "Service"). By using our Service, you agree to the collection and use of information in accordance with this policy.`,
    },
    {
      id: "information-collection",
      title: "Information We Collect",
      content: `We collect several types of information:

**Information You Provide:**
- Account information (email, name, profile photo)
- Messages and content you post
- Files you upload
- Feedback and communications with us

**Automatically Collected Information:**
- Usage data (features used, pages visited)
- Device information (browser type, operating system)
- Log data (IP address, access times)
- Cookies and similar technologies`,
    },
    {
      id: "information-use",
      title: "How We Use Your Information",
      content: `We use collected information to:
- Provide and maintain the Service
- Personalize your experience
- Communicate with you about updates and changes
- Monitor usage and improve the Service
- Detect and prevent fraud and abuse
- Comply with legal obligations`,
    },
    {
      id: "information-sharing",
      title: "Information Sharing",
      content: `We may share your information:
- With your consent
- With service providers who assist our operations
- To comply with legal obligations
- In connection with a merger or acquisition
- To protect our rights and safety

We do not sell your personal information to third parties.`,
    },
    {
      id: "data-retention",
      title: "Data Retention",
      content: `We retain your information for as long as your account is active or as needed to provide services. You can request deletion of your data at any time. Some information may be retained for legal or compliance purposes.`,
    },
    {
      id: "your-rights",
      title: "Your Rights",
      content: `Depending on your location, you may have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your data
- Export your data
- Object to processing
- Withdraw consent

To exercise these rights, contact us at ${contactEmail}.`,
    },
    {
      id: "security",
      title: "Security",
      content: `We implement appropriate security measures to protect your information, including encryption in transit and at rest, access controls, and regular security assessments. However, no method of transmission over the Internet is 100% secure.`,
    },
    {
      id: "cookies",
      title: "Cookies and Tracking",
      content: `We use cookies and similar technologies to:
- Keep you logged in
- Remember your preferences
- Understand how you use the Service
- Improve performance

You can control cookies through your browser settings.`,
    },
    {
      id: "international",
      title: "International Data Transfers",
      content: `Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers, including Standard Contractual Clauses where required.`,
    },
    {
      id: "children",
      title: "Children's Privacy",
      content: `The Service is not intended for users under 13 (or 16 in certain jurisdictions). We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.`,
    },
    {
      id: "changes",
      title: "Changes to This Policy",
      content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy and updating the "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.`,
    },
    {
      id: "contact",
      title: "Contact Us",
      content: `If you have questions about this Privacy Policy or our privacy practices, please contact us at:

Email: ${contactEmail}
Company: ${companyName}`,
    },
  ];

  return sections;
}

// ============================================================================
// PRIVACY SETTINGS VALIDATION
// ============================================================================

/**
 * Validate privacy settings
 */
export function validatePrivacySettings(settings: Partial<PrivacySettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (settings.profileVisibility) {
    const validVisibilities = PROFILE_VISIBILITY_OPTIONS.map((o) => o.value);
    if (!validVisibilities.includes(settings.profileVisibility)) {
      errors.push("Invalid profile visibility option");
    }
  }

  if (settings.allowDirectMessages) {
    const validDMOptions = DIRECT_MESSAGE_OPTIONS.map((o) => o.value);
    if (!validDMOptions.includes(settings.allowDirectMessages)) {
      errors.push("Invalid direct messages option");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// PRIVACY SCORE
// ============================================================================

/**
 * Calculate a privacy score based on settings
 */
export function calculatePrivacyScore(settings: PrivacySettings): {
  score: number;
  level: "low" | "medium" | "high" | "maximum";
  recommendations: string[];
} {
  let score = 0;
  const recommendations: string[] = [];

  // Profile visibility
  if (settings.profileVisibility === "private") score += 20;
  else if (settings.profileVisibility === "contacts") score += 15;
  else if (settings.profileVisibility === "members") score += 10;
  else recommendations.push("Consider restricting your profile visibility");

  // Activity settings
  if (!settings.showOnlineStatus) score += 10;
  else recommendations.push("Hiding online status increases privacy");

  if (!settings.showLastSeen) score += 10;
  else recommendations.push("Hiding last seen increases privacy");

  if (!settings.activityStatusVisible) score += 5;

  // Messaging settings
  if (!settings.showReadReceipts) score += 5;
  if (!settings.showTypingIndicator) score += 5;

  if (settings.allowDirectMessages === "none") score += 10;
  else if (settings.allowDirectMessages === "contacts") score += 5;

  // Data settings
  if (!settings.shareAnalytics) score += 15;
  else recommendations.push("Disabling analytics sharing improves privacy");

  if (!settings.personalizedAds) score += 10;
  else recommendations.push("Disabling personalized ads improves privacy");

  if (!settings.searchable) score += 5;
  if (!settings.marketingEmails) score += 5;

  // Determine level
  let level: "low" | "medium" | "high" | "maximum";
  if (score >= 80) level = "maximum";
  else if (score >= 60) level = "high";
  else if (score >= 40) level = "medium";
  else level = "low";

  return {
    score: Math.min(100, score),
    level,
    recommendations: recommendations.slice(0, 3), // Top 3 recommendations
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const PrivacyPolicyHelpers = {
  createDefaultPrivacySettings,
  PROFILE_VISIBILITY_OPTIONS,
  DIRECT_MESSAGE_OPTIONS,
  PRIVACY_SETTING_CATEGORIES,
  generatePrivacyPolicySections,
  validatePrivacySettings,
  calculatePrivacyScore,
};
