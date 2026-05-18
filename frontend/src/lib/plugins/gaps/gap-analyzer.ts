/**
 * Plugin Gap Analyzer
 *
 * Automated analyzer that checks services against available plugins
 * to identify backend capability gaps. Scans service descriptors,
 * compares against plugin registry, and produces a gap analysis report.
 */

import type {
  PluginGap,
  GapAnalysisResult,
  GapRecommendation,
  GapSeverity,
  GapStatus,
  ServiceDescriptor,
  PluginDescriptor,
  PluginDomain,
  PluginCapability,
} from "./types";
import { GAP_SEVERITY_WEIGHTS, compareGapsBySeverity } from "./types";

// ============================================================================
// KNOWN SERVICE DESCRIPTORS
// ============================================================================

/**
 * Registry of all known service descriptors in the application.
 * Each entry describes a service and its backend requirements.
 */
export const KNOWN_SERVICE_DESCRIPTORS: ServiceDescriptor[] = [
  // Storage services
  {
    path: "services/files/upload.service.ts",
    name: "FileUploadService",
    domain: "storage",
    requiredCapabilities: [
      "storage:upload",
      "storage:presigned-url",
      "storage:multipart",
    ],
    directBackendAccess: true,
    description: "Handles file uploads to S3/MinIO storage",
  },
  {
    path: "services/files/download.service.ts",
    name: "FileDownloadService",
    domain: "storage",
    requiredCapabilities: [
      "storage:download",
      "storage:presigned-url",
      "storage:streaming",
    ],
    directBackendAccess: true,
    description: "Handles file downloads from S3/MinIO storage",
  },
  {
    path: "services/files/access.service.ts",
    name: "FileAccessService",
    domain: "storage",
    requiredCapabilities: ["storage:access-control", "storage:metadata"],
    directBackendAccess: true,
    description: "Manages file access control and permissions",
  },
  {
    path: "services/files/processing.service.ts",
    name: "FileProcessingService",
    domain: "media",
    requiredCapabilities: [
      "media:image-processing",
      "media:thumbnail",
      "media:format-conversion",
    ],
    directBackendAccess: true,
    description: "Image processing, thumbnailing, and format conversion",
  },
  {
    path: "services/webrtc/recording-storage.service.ts",
    name: "RecordingStorageService",
    domain: "storage",
    requiredCapabilities: [
      "storage:upload",
      "storage:streaming",
      "storage:large-file",
    ],
    directBackendAccess: true,
    description: "Stores call and meeting recordings in object storage",
  },

  // Search services
  {
    path: "services/search/search.service.ts",
    name: "SearchService",
    domain: "search",
    requiredCapabilities: [
      "search:full-text",
      "search:faceted",
      "search:filters",
    ],
    directBackendAccess: true,
    description: "Full-text search via MeiliSearch",
  },
  {
    path: "services/search/index.service.ts",
    name: "SearchIndexService",
    domain: "search",
    requiredCapabilities: [
      "search:indexing",
      "search:bulk-index",
      "search:schema-management",
    ],
    directBackendAccess: true,
    description: "Manages search indices and document indexing",
  },
  {
    path: "services/search/sync.service.ts",
    name: "SearchSyncService",
    domain: "search",
    requiredCapabilities: ["search:sync", "search:real-time-index"],
    directBackendAccess: true,
    description: "Syncs database changes to search index in real-time",
  },
  {
    path: "services/messages/extended-search.service.ts",
    name: "ExtendedSearchService",
    domain: "search",
    requiredCapabilities: ["search:semantic", "search:natural-language"],
    directBackendAccess: true,
    description: "Semantic and natural language message search",
  },

  // Notification services
  {
    path: "services/notifications/notification.service.ts",
    name: "NotificationService",
    domain: "notification",
    requiredCapabilities: [
      "notification:push",
      "notification:email",
      "notification:in-app",
    ],
    directBackendAccess: true,
    description: "Delivers push, email, and in-app notifications",
  },
  {
    path: "services/notifications/template.service.ts",
    name: "NotificationTemplateService",
    domain: "notification",
    requiredCapabilities: [
      "notification:templates",
      "notification:localization",
    ],
    directBackendAccess: false,
    description: "Manages notification templates and localization",
  },
  {
    path: "services/notifications/preference.service.ts",
    name: "NotificationPreferenceService",
    domain: "notification",
    requiredCapabilities: [
      "notification:preferences",
      "notification:scheduling",
    ],
    directBackendAccess: false,
    description: "User notification preferences and digest scheduling",
  },

  // Auth services
  {
    path: "services/auth/sso.service.ts",
    name: "SSOService",
    domain: "auth",
    requiredCapabilities: ["auth:saml", "auth:oidc", "auth:sso-session"],
    directBackendAccess: true,
    description: "SSO/SAML authentication for enterprise users",
  },
  {
    path: "services/auth/registration-lock.service.ts",
    name: "RegistrationLockService",
    domain: "auth",
    requiredCapabilities: ["auth:registration-lock", "auth:pin-verification"],
    directBackendAccess: true,
    description: "Registration lock and PIN-based account recovery",
  },
  {
    path: "services/idme/idme-verification.service.ts",
    name: "IDmeVerificationService",
    domain: "auth",
    requiredCapabilities: [
      "auth:identity-verification",
      "auth:idme-integration",
    ],
    directBackendAccess: true,
    description: "ID.me identity verification integration",
  },

  // Billing services
  {
    path: "lib/billing/stripe-service.ts",
    name: "StripeService",
    domain: "billing",
    requiredCapabilities: [
      "billing:stripe",
      "billing:subscriptions",
      "billing:webhooks",
    ],
    directBackendAccess: true,
    description: "Stripe payment processing and subscription management",
  },
  {
    path: "lib/billing/crypto-payment.service.ts",
    name: "CryptoPaymentService",
    domain: "billing",
    requiredCapabilities: ["billing:crypto", "billing:wallet-verification"],
    directBackendAccess: true,
    description: "Cryptocurrency payment processing",
  },
  {
    path: "lib/billing/token-gate.service.ts",
    name: "TokenGateService",
    domain: "billing",
    requiredCapabilities: ["billing:token-gate", "billing:nft-verification"],
    directBackendAccess: true,
    description: "NFT/token-gated access control",
  },

  // Moderation services
  {
    path: "services/moderation/moderation-engine.service.ts",
    name: "ModerationEngineService",
    domain: "moderation",
    requiredCapabilities: [
      "moderation:content-scan",
      "moderation:auto-action",
      "moderation:queue",
    ],
    directBackendAccess: true,
    description: "Content moderation engine with auto-moderation rules",
  },
  {
    path: "services/moderation/ai-moderation.service.ts",
    name: "AIModerationService",
    domain: "moderation",
    requiredCapabilities: [
      "moderation:ai-scan",
      "moderation:toxicity-detection",
    ],
    directBackendAccess: true,
    description: "AI-powered toxicity and content moderation",
  },
  {
    path: "services/files/virus-scanner.service.ts",
    name: "VirusScannerService",
    domain: "moderation",
    requiredCapabilities: [
      "moderation:virus-scan",
      "moderation:malware-detection",
    ],
    directBackendAccess: true,
    description: "File virus scanning and malware detection",
  },

  // Analytics services
  {
    path: "services/analytics/aggregator.ts",
    name: "AnalyticsAggregator",
    domain: "analytics",
    requiredCapabilities: [
      "analytics:aggregation",
      "analytics:time-series",
      "analytics:rollup",
    ],
    directBackendAccess: true,
    description: "Aggregates analytics events into time-series data",
  },
  {
    path: "services/plugins/analytics.service.ts",
    name: "AnalyticsPluginService",
    domain: "analytics",
    requiredCapabilities: [
      "analytics:tracking",
      "analytics:reporting",
      "analytics:export",
    ],
    directBackendAccess: false,
    description: "Client-side analytics plugin service",
  },

  // Realtime services
  {
    path: "services/realtime/event-dispatcher.service.ts",
    name: "EventDispatcherService",
    domain: "realtime",
    requiredCapabilities: [
      "realtime:publish",
      "realtime:subscribe",
      "realtime:channels",
    ],
    directBackendAccess: true,
    description: "Real-time event publishing and subscription management",
  },
  {
    path: "services/realtime/presence.service.ts",
    name: "PresenceService",
    domain: "realtime",
    requiredCapabilities: ["realtime:presence", "realtime:heartbeat"],
    directBackendAccess: true,
    description: "User presence tracking and heartbeat management",
  },
  {
    path: "services/realtime/typing.service.ts",
    name: "TypingService",
    domain: "realtime",
    requiredCapabilities: ["realtime:typing-indicators"],
    directBackendAccess: true,
    description: "Typing indicator broadcasting",
  },
  {
    path: "services/realtime/sync.service.ts",
    name: "SyncService",
    domain: "realtime",
    requiredCapabilities: ["realtime:sync", "realtime:conflict-resolution"],
    directBackendAccess: true,
    description: "Real-time data synchronization and conflict resolution",
  },

  // E2EE services
  {
    path: "services/e2ee/key-management.service.ts",
    name: "E2EEKeyManagementService",
    domain: "e2ee",
    requiredCapabilities: [
      "e2ee:key-storage",
      "e2ee:key-distribution",
      "e2ee:prekey-bundles",
    ],
    directBackendAccess: true,
    description: "End-to-end encryption key management",
  },

  // Calls services
  {
    path: "services/calls/group-call.service.ts",
    name: "GroupCallService",
    domain: "calls",
    requiredCapabilities: [
      "calls:signaling",
      "calls:sfu-management",
      "calls:recording",
    ],
    directBackendAccess: true,
    description: "Group call signaling and SFU management",
  },
  {
    path: "services/webrtc/livekit.service.ts",
    name: "LiveKitService",
    domain: "calls",
    requiredCapabilities: [
      "calls:livekit-integration",
      "calls:room-management",
    ],
    directBackendAccess: true,
    description: "LiveKit WebRTC service integration",
  },

  // Compliance services
  {
    path: "services/compliance/dsar.service.ts",
    name: "DSARService",
    domain: "compliance",
    requiredCapabilities: [
      "compliance:dsar",
      "compliance:data-export",
      "compliance:data-deletion",
    ],
    directBackendAccess: true,
    description: "Data Subject Access Request handling",
  },
  {
    path: "services/audit/audit-logger.service.ts",
    name: "AuditLoggerService",
    domain: "compliance",
    requiredCapabilities: [
      "compliance:audit-logging",
      "compliance:tamper-proof",
    ],
    directBackendAccess: true,
    description: "Tamper-proof audit logging for compliance",
  },
  {
    path: "services/retention/retention-policy.service.ts",
    name: "RetentionPolicyService",
    domain: "compliance",
    requiredCapabilities: [
      "compliance:retention-policies",
      "compliance:auto-purge",
    ],
    directBackendAccess: true,
    description: "Data retention policy enforcement",
  },
];

// ============================================================================
// KNOWN CAPABILITIES
// ============================================================================

/**
 * Registry of all known plugin capabilities across all domains.
 */
export const KNOWN_CAPABILITIES: PluginCapability[] = [
  // Storage capabilities
  {
    id: "storage:upload",
    name: "File Upload",
    description: "Upload files to object storage",
    domain: "storage",
    requiredBackendService: "minio",
    optional: false,
  },
  {
    id: "storage:download",
    name: "File Download",
    description: "Download files from object storage",
    domain: "storage",
    requiredBackendService: "minio",
    optional: false,
  },
  {
    id: "storage:presigned-url",
    name: "Presigned URLs",
    description: "Generate presigned URLs for direct access",
    domain: "storage",
    requiredBackendService: "minio",
    optional: false,
  },
  {
    id: "storage:multipart",
    name: "Multipart Upload",
    description: "Upload large files in parts",
    domain: "storage",
    requiredBackendService: "minio",
    optional: true,
  },
  {
    id: "storage:streaming",
    name: "Streaming Transfer",
    description: "Stream files during upload/download",
    domain: "storage",
    requiredBackendService: "minio",
    optional: true,
  },
  {
    id: "storage:access-control",
    name: "Access Control",
    description: "Manage per-file access permissions",
    domain: "storage",
    optional: false,
  },
  {
    id: "storage:metadata",
    name: "File Metadata",
    description: "Read/write file metadata",
    domain: "storage",
    optional: false,
  },
  {
    id: "storage:large-file",
    name: "Large File Support",
    description: "Support for files >100MB",
    domain: "storage",
    requiredBackendService: "minio",
    optional: true,
  },

  // Media capabilities
  {
    id: "media:image-processing",
    name: "Image Processing",
    description: "Process and transform images",
    domain: "media",
    optional: false,
  },
  {
    id: "media:thumbnail",
    name: "Thumbnail Generation",
    description: "Generate image thumbnails",
    domain: "media",
    optional: false,
  },
  {
    id: "media:format-conversion",
    name: "Format Conversion",
    description: "Convert between image/media formats",
    domain: "media",
    optional: true,
  },

  // Search capabilities
  {
    id: "search:full-text",
    name: "Full-Text Search",
    description: "Full-text search across content",
    domain: "search",
    requiredBackendService: "meilisearch",
    optional: false,
  },
  {
    id: "search:faceted",
    name: "Faceted Search",
    description: "Search with faceted filters",
    domain: "search",
    requiredBackendService: "meilisearch",
    optional: true,
  },
  {
    id: "search:filters",
    name: "Advanced Filters",
    description: "Complex filter expressions",
    domain: "search",
    requiredBackendService: "meilisearch",
    optional: false,
  },
  {
    id: "search:indexing",
    name: "Document Indexing",
    description: "Index documents for search",
    domain: "search",
    requiredBackendService: "meilisearch",
    optional: false,
  },
  {
    id: "search:bulk-index",
    name: "Bulk Indexing",
    description: "Index many documents at once",
    domain: "search",
    requiredBackendService: "meilisearch",
    optional: true,
  },
  {
    id: "search:schema-management",
    name: "Schema Management",
    description: "Manage search index schemas",
    domain: "search",
    requiredBackendService: "meilisearch",
    optional: false,
  },
  {
    id: "search:sync",
    name: "Index Sync",
    description: "Sync database changes to search index",
    domain: "search",
    optional: false,
  },
  {
    id: "search:real-time-index",
    name: "Real-time Indexing",
    description: "Index documents in real-time",
    domain: "search",
    optional: true,
  },
  {
    id: "search:semantic",
    name: "Semantic Search",
    description: "AI-powered semantic search",
    domain: "search",
    optional: true,
  },
  {
    id: "search:natural-language",
    name: "Natural Language Queries",
    description: "Support natural language search queries",
    domain: "search",
    optional: true,
  },

  // Notification capabilities
  {
    id: "notification:push",
    name: "Push Notifications",
    description: "Send push notifications to devices",
    domain: "notification",
    optional: false,
  },
  {
    id: "notification:email",
    name: "Email Notifications",
    description: "Send email notifications",
    domain: "notification",
    optional: false,
  },
  {
    id: "notification:in-app",
    name: "In-App Notifications",
    description: "Deliver in-app notifications",
    domain: "notification",
    optional: false,
  },
  {
    id: "notification:templates",
    name: "Notification Templates",
    description: "Template-based notification rendering",
    domain: "notification",
    optional: true,
  },
  {
    id: "notification:localization",
    name: "Localized Notifications",
    description: "Multi-language notification support",
    domain: "notification",
    optional: true,
  },
  {
    id: "notification:preferences",
    name: "Notification Preferences",
    description: "User notification preference management",
    domain: "notification",
    optional: true,
  },
  {
    id: "notification:scheduling",
    name: "Notification Scheduling",
    description: "Schedule notifications and digests",
    domain: "notification",
    optional: true,
  },

  // Auth capabilities
  {
    id: "auth:saml",
    name: "SAML SSO",
    description: "SAML-based single sign-on",
    domain: "auth",
    optional: true,
  },
  {
    id: "auth:oidc",
    name: "OIDC SSO",
    description: "OpenID Connect single sign-on",
    domain: "auth",
    optional: true,
  },
  {
    id: "auth:sso-session",
    name: "SSO Session Management",
    description: "Manage SSO sessions",
    domain: "auth",
    optional: true,
  },
  {
    id: "auth:registration-lock",
    name: "Registration Lock",
    description: "PIN-based registration lock",
    domain: "auth",
    optional: true,
  },
  {
    id: "auth:pin-verification",
    name: "PIN Verification",
    description: "Verify user PINs",
    domain: "auth",
    optional: true,
  },
  {
    id: "auth:identity-verification",
    name: "Identity Verification",
    description: "Verify user identity via third-party",
    domain: "auth",
    optional: true,
  },
  {
    id: "auth:idme-integration",
    name: "ID.me Integration",
    description: "ID.me identity verification",
    domain: "auth",
    optional: true,
  },

  // Billing capabilities
  {
    id: "billing:stripe",
    name: "Stripe Integration",
    description: "Stripe payment processing",
    domain: "billing",
    optional: true,
  },
  {
    id: "billing:subscriptions",
    name: "Subscription Management",
    description: "Manage recurring subscriptions",
    domain: "billing",
    optional: true,
  },
  {
    id: "billing:webhooks",
    name: "Payment Webhooks",
    description: "Handle payment webhook events",
    domain: "billing",
    optional: true,
  },
  {
    id: "billing:crypto",
    name: "Crypto Payments",
    description: "Cryptocurrency payment processing",
    domain: "billing",
    optional: true,
  },
  {
    id: "billing:wallet-verification",
    name: "Wallet Verification",
    description: "Verify crypto wallet ownership",
    domain: "billing",
    optional: true,
  },
  {
    id: "billing:token-gate",
    name: "Token Gating",
    description: "NFT/token-based access control",
    domain: "billing",
    optional: true,
  },
  {
    id: "billing:nft-verification",
    name: "NFT Verification",
    description: "Verify NFT ownership",
    domain: "billing",
    optional: true,
  },

  // Moderation capabilities
  {
    id: "moderation:content-scan",
    name: "Content Scanning",
    description: "Scan content for policy violations",
    domain: "moderation",
    optional: false,
  },
  {
    id: "moderation:auto-action",
    name: "Auto-Moderation Actions",
    description: "Automatically apply moderation actions",
    domain: "moderation",
    optional: false,
  },
  {
    id: "moderation:queue",
    name: "Moderation Queue",
    description: "Queue content for manual review",
    domain: "moderation",
    optional: false,
  },
  {
    id: "moderation:ai-scan",
    name: "AI Content Scanning",
    description: "AI-powered content analysis",
    domain: "moderation",
    optional: true,
  },
  {
    id: "moderation:toxicity-detection",
    name: "Toxicity Detection",
    description: "Detect toxic content using AI",
    domain: "moderation",
    optional: true,
  },
  {
    id: "moderation:virus-scan",
    name: "Virus Scanning",
    description: "Scan uploaded files for viruses",
    domain: "moderation",
    optional: true,
  },
  {
    id: "moderation:malware-detection",
    name: "Malware Detection",
    description: "Detect malware in uploads",
    domain: "moderation",
    optional: true,
  },

  // Analytics capabilities
  {
    id: "analytics:aggregation",
    name: "Data Aggregation",
    description: "Aggregate analytics events",
    domain: "analytics",
    optional: false,
  },
  {
    id: "analytics:time-series",
    name: "Time-Series Data",
    description: "Store time-series analytics data",
    domain: "analytics",
    optional: false,
  },
  {
    id: "analytics:rollup",
    name: "Data Rollup",
    description: "Roll up data into summary periods",
    domain: "analytics",
    optional: true,
  },
  {
    id: "analytics:tracking",
    name: "Event Tracking",
    description: "Track analytics events",
    domain: "analytics",
    optional: false,
  },
  {
    id: "analytics:reporting",
    name: "Analytics Reporting",
    description: "Generate analytics reports",
    domain: "analytics",
    optional: true,
  },
  {
    id: "analytics:export",
    name: "Data Export",
    description: "Export analytics data",
    domain: "analytics",
    optional: true,
  },

  // Realtime capabilities
  {
    id: "realtime:publish",
    name: "Event Publishing",
    description: "Publish events to channels",
    domain: "realtime",
    requiredBackendService: "redis",
    optional: false,
  },
  {
    id: "realtime:subscribe",
    name: "Event Subscription",
    description: "Subscribe to event channels",
    domain: "realtime",
    requiredBackendService: "redis",
    optional: false,
  },
  {
    id: "realtime:channels",
    name: "Channel Management",
    description: "Manage real-time channels",
    domain: "realtime",
    optional: false,
  },
  {
    id: "realtime:presence",
    name: "Presence Tracking",
    description: "Track user presence",
    domain: "realtime",
    requiredBackendService: "redis",
    optional: false,
  },
  {
    id: "realtime:heartbeat",
    name: "Heartbeat Management",
    description: "Manage connection heartbeats",
    domain: "realtime",
    optional: false,
  },
  {
    id: "realtime:typing-indicators",
    name: "Typing Indicators",
    description: "Broadcast typing indicators",
    domain: "realtime",
    optional: true,
  },
  {
    id: "realtime:sync",
    name: "Data Sync",
    description: "Real-time data synchronization",
    domain: "realtime",
    optional: false,
  },
  {
    id: "realtime:conflict-resolution",
    name: "Conflict Resolution",
    description: "Resolve data conflicts during sync",
    domain: "realtime",
    optional: true,
  },

  // E2EE capabilities
  {
    id: "e2ee:key-storage",
    name: "Key Storage",
    description: "Secure key storage",
    domain: "e2ee",
    optional: false,
  },
  {
    id: "e2ee:key-distribution",
    name: "Key Distribution",
    description: "Distribute encryption keys",
    domain: "e2ee",
    optional: false,
  },
  {
    id: "e2ee:prekey-bundles",
    name: "PreKey Bundles",
    description: "Manage prekey bundles for X3DH",
    domain: "e2ee",
    optional: false,
  },

  // Calls capabilities
  {
    id: "calls:signaling",
    name: "Call Signaling",
    description: "WebRTC signaling for calls",
    domain: "calls",
    optional: false,
  },
  {
    id: "calls:sfu-management",
    name: "SFU Management",
    description: "Manage SFU servers for group calls",
    domain: "calls",
    optional: true,
  },
  {
    id: "calls:recording",
    name: "Call Recording",
    description: "Record calls and meetings",
    domain: "calls",
    optional: true,
  },
  {
    id: "calls:livekit-integration",
    name: "LiveKit Integration",
    description: "Integrate with LiveKit SFU",
    domain: "calls",
    optional: true,
  },
  {
    id: "calls:room-management",
    name: "Room Management",
    description: "Manage call rooms",
    domain: "calls",
    optional: false,
  },

  // Compliance capabilities
  {
    id: "compliance:dsar",
    name: "DSAR Handling",
    description: "Handle Data Subject Access Requests",
    domain: "compliance",
    optional: true,
  },
  {
    id: "compliance:data-export",
    name: "Data Export",
    description: "Export user data for compliance",
    domain: "compliance",
    optional: true,
  },
  {
    id: "compliance:data-deletion",
    name: "Data Deletion",
    description: "Delete user data for compliance",
    domain: "compliance",
    optional: true,
  },
  {
    id: "compliance:audit-logging",
    name: "Audit Logging",
    description: "Log all actions for audit trail",
    domain: "compliance",
    optional: false,
  },
  {
    id: "compliance:tamper-proof",
    name: "Tamper-Proof Logs",
    description: "Tamper-proof audit log storage",
    domain: "compliance",
    optional: true,
  },
  {
    id: "compliance:retention-policies",
    name: "Retention Policies",
    description: "Enforce data retention policies",
    domain: "compliance",
    optional: true,
  },
  {
    id: "compliance:auto-purge",
    name: "Auto-Purge",
    description: "Automatically purge expired data",
    domain: "compliance",
    optional: true,
  },
];

// ============================================================================
// GAP ANALYZER
// ============================================================================

let gapIdCounter = 0;

function generateGapId(): string {
  gapIdCounter++;
  return `gap_${Date.now().toString(36)}_${gapIdCounter.toString(36)}`;
}

/**
 * Reset the gap ID counter (for testing).
 */
export function resetGapIdCounter(): void {
  gapIdCounter = 0;
}

/**
 * Plugin Gap Analyzer
 *
 * Scans service descriptors, compares against available plugin descriptors,
 * and identifies gaps in plugin coverage.
 */
export class PluginGapAnalyzer {
  private serviceDescriptors: ServiceDescriptor[];
  private pluginDescriptors: PluginDescriptor[];
  private capabilities: PluginCapability[];

  constructor(
    serviceDescriptors?: ServiceDescriptor[],
    pluginDescriptors?: PluginDescriptor[],
    capabilities?: PluginCapability[],
  ) {
    this.serviceDescriptors = serviceDescriptors ?? KNOWN_SERVICE_DESCRIPTORS;
    this.pluginDescriptors = pluginDescriptors ?? [];
    this.capabilities = capabilities ?? KNOWN_CAPABILITIES;
  }

  // ==========================================================================
  // ANALYSIS
  // ==========================================================================

  /**
   * Run a full gap analysis.
   */
  analyze(): GapAnalysisResult {
    const gaps = this.identifyGaps();
    const recommendations = this.generateRecommendations(gaps);
    const now = new Date().toISOString();

    const byStatus = this.countByStatus(gaps);
    const bySeverity = this.countBySeverity(gaps);
    const byDomain = this.countByDomain(gaps);

    const coveredCount = gaps.filter((g) => g.status === "covered").length;
    const coveragePercent =
      gaps.length > 0 ? Math.round((coveredCount / gaps.length) * 100) : 100;

    return {
      analyzedAt: now,
      totalGaps: gaps.length,
      byStatus,
      bySeverity,
      byDomain,
      coveragePercent,
      gaps: gaps.sort(compareGapsBySeverity),
      recommendations: recommendations.sort((a, b) => b.priority - a.priority),
    };
  }

  /**
   * Identify all gaps by comparing services against plugins.
   */
  identifyGaps(): PluginGap[] {
    const gaps: PluginGap[] = [];
    const coveredCapabilities = this.getCoveredCapabilities();
    const now = new Date().toISOString();

    // Group services by domain
    const servicesByDomain = this.groupServicesByDomain();

    for (const [domain, services] of servicesByDomain) {
      // Collect all required capabilities for this domain
      const domainCapabilities = new Set<string>();
      const affectedServicePaths: string[] = [];

      for (const service of services) {
        for (const cap of service.requiredCapabilities) {
          domainCapabilities.add(cap);
        }
        if (service.directBackendAccess) {
          affectedServicePaths.push(service.path);
        }
      }

      // Check which capabilities are covered
      const uncoveredCaps = Array.from(domainCapabilities).filter(
        (cap) => !coveredCapabilities.has(cap),
      );
      const coveredCaps = Array.from(domainCapabilities).filter((cap) =>
        coveredCapabilities.has(cap),
      );

      if (uncoveredCaps.length > 0) {
        const severity = this.determineSeverity(
          domain,
          uncoveredCaps,
          services,
        );
        const status = this.determineStatus(
          coveredCaps.length,
          domainCapabilities.size,
        );

        gaps.push({
          id: generateGapId(),
          title: `${this.domainDisplayName(domain)} Plugin Gap`,
          description: `${uncoveredCaps.length} uncovered capabilities in ${domain} domain: ${uncoveredCaps.join(", ")}`,
          severity,
          status,
          domain: domain as PluginDomain,
          affectedServices: affectedServicePaths,
          requiredCapabilities: uncoveredCaps,
          identifiedAt: now,
          updatedAt: now,
          tags: [domain, "auto-detected"],
        });
      }
    }

    return gaps;
  }

  /**
   * Analyze a specific domain for gaps.
   */
  analyzeDomain(domain: PluginDomain): PluginGap[] {
    const services = this.serviceDescriptors.filter((s) => s.domain === domain);
    const coveredCapabilities = this.getCoveredCapabilities();
    const now = new Date().toISOString();
    const gaps: PluginGap[] = [];

    for (const service of services) {
      const uncoveredCaps = service.requiredCapabilities.filter(
        (cap) => !coveredCapabilities.has(cap),
      );

      if (uncoveredCaps.length > 0) {
        gaps.push({
          id: generateGapId(),
          title: `${service.name} Backend Access Gap`,
          description: `${service.name} directly accesses backend without plugin for: ${uncoveredCaps.join(", ")}`,
          severity: service.directBackendAccess ? "high" : "medium",
          status: "uncovered",
          domain,
          affectedServices: [service.path],
          requiredCapabilities: uncoveredCaps,
          identifiedAt: now,
          updatedAt: now,
          tags: [domain, service.name, "service-level"],
        });
      }
    }

    return gaps;
  }

  /**
   * Get all capabilities that are covered by registered plugins.
   */
  getCoveredCapabilities(): Set<string> {
    const covered = new Set<string>();
    for (const plugin of this.pluginDescriptors) {
      if (plugin.enabled && plugin.healthy) {
        for (const cap of plugin.capabilities) {
          covered.add(cap);
        }
      }
    }
    return covered;
  }

  /**
   * Get all capabilities required by services.
   */
  getRequiredCapabilities(): Set<string> {
    const required = new Set<string>();
    for (const service of this.serviceDescriptors) {
      for (const cap of service.requiredCapabilities) {
        required.add(cap);
      }
    }
    return required;
  }

  /**
   * Get all uncovered capabilities.
   */
  getUncoveredCapabilities(): string[] {
    const required = this.getRequiredCapabilities();
    const covered = this.getCoveredCapabilities();
    return Array.from(required).filter((cap) => !covered.has(cap));
  }

  /**
   * Get coverage statistics.
   */
  getCoverageStats(): {
    total: number;
    covered: number;
    uncovered: number;
    percent: number;
  } {
    const required = this.getRequiredCapabilities();
    const covered = this.getCoveredCapabilities();
    const coveredCount = Array.from(required).filter((cap) =>
      covered.has(cap),
    ).length;
    return {
      total: required.size,
      covered: coveredCount,
      uncovered: required.size - coveredCount,
      percent:
        required.size > 0
          ? Math.round((coveredCount / required.size) * 100)
          : 100,
    };
  }

  // ==========================================================================
  // PLUGIN MANAGEMENT
  // ==========================================================================

  /**
   * Register a plugin descriptor.
   */
  registerPlugin(plugin: PluginDescriptor): void {
    const existing = this.pluginDescriptors.findIndex(
      (p) => p.id === plugin.id,
    );
    if (existing >= 0) {
      this.pluginDescriptors[existing] = plugin;
    } else {
      this.pluginDescriptors.push(plugin);
    }
  }

  /**
   * Unregister a plugin descriptor.
   */
  unregisterPlugin(pluginId: string): boolean {
    const index = this.pluginDescriptors.findIndex((p) => p.id === pluginId);
    if (index >= 0) {
      this.pluginDescriptors.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all registered plugins.
   */
  getPlugins(): PluginDescriptor[] {
    return [...this.pluginDescriptors];
  }

  /**
   * Get plugin by ID.
   */
  getPlugin(pluginId: string): PluginDescriptor | undefined {
    return this.pluginDescriptors.find((p) => p.id === pluginId);
  }

  // ==========================================================================
  // SERVICE MANAGEMENT
  // ==========================================================================

  /**
   * Register a service descriptor.
   */
  registerService(service: ServiceDescriptor): void {
    const existing = this.serviceDescriptors.findIndex(
      (s) => s.path === service.path,
    );
    if (existing >= 0) {
      this.serviceDescriptors[existing] = service;
    } else {
      this.serviceDescriptors.push(service);
    }
  }

  /**
   * Get all service descriptors.
   */
  getServices(): ServiceDescriptor[] {
    return [...this.serviceDescriptors];
  }

  /**
   * Get services that directly access the backend.
   */
  getDirectAccessServices(): ServiceDescriptor[] {
    return this.serviceDescriptors.filter((s) => s.directBackendAccess);
  }

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================

  /**
   * Generate recommendations for closing gaps.
   */
  generateRecommendations(gaps: PluginGap[]): GapRecommendation[] {
    const recommendations: GapRecommendation[] = [];

    for (const gap of gaps) {
      if (gap.status === "covered" || gap.status === "deprecated") {
        continue;
      }

      const priority =
        GAP_SEVERITY_WEIGHTS[gap.severity] * (gap.affectedServices.length + 1);
      const estimatedHours = this.estimateEffort(gap);
      const dependencies = this.identifyDependencies(gap);

      recommendations.push({
        gapId: gap.id,
        priority,
        action: this.generateAction(gap),
        estimatedHours,
        dependencies,
      });
    }

    return recommendations;
  }

  // ==========================================================================
  // COUNTING HELPERS
  // ==========================================================================

  private countByStatus(gaps: PluginGap[]): Record<GapStatus, number> {
    const counts: Record<GapStatus, number> = {
      uncovered: 0,
      partial: 0,
      workaround: 0,
      covered: 0,
      deprecated: 0,
    };
    for (const gap of gaps) {
      counts[gap.status]++;
    }
    return counts;
  }

  private countBySeverity(gaps: PluginGap[]): Record<GapSeverity, number> {
    const counts: Record<GapSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const gap of gaps) {
      counts[gap.severity]++;
    }
    return counts;
  }

  private countByDomain(gaps: PluginGap[]): Record<PluginDomain, number> {
    const counts = {} as Record<PluginDomain, number>;
    for (const gap of gaps) {
      counts[gap.domain] = (counts[gap.domain] || 0) + 1;
    }
    return counts;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private groupServicesByDomain(): Map<string, ServiceDescriptor[]> {
    const grouped = new Map<string, ServiceDescriptor[]>();
    for (const service of this.serviceDescriptors) {
      const list = grouped.get(service.domain) || [];
      list.push(service);
      grouped.set(service.domain, list);
    }
    return grouped;
  }

  private determineSeverity(
    domain: string,
    uncoveredCaps: string[],
    services: ServiceDescriptor[],
  ): GapSeverity {
    const hasDirectAccess = services.some((s) => s.directBackendAccess);
    const hasRequiredCap = uncoveredCaps.some((cap) => {
      const capDef = this.capabilities.find((c) => c.id === cap);
      return capDef && !capDef.optional;
    });

    if (hasDirectAccess && hasRequiredCap) {
      if (domain === "auth" || domain === "e2ee" || domain === "billing") {
        return "critical";
      }
      return "high";
    }

    if (hasDirectAccess) {
      return "medium";
    }

    return "low";
  }

  private determineStatus(coveredCount: number, totalCount: number): GapStatus {
    if (coveredCount === 0) {
      return "uncovered";
    }
    if (coveredCount < totalCount) {
      return "partial";
    }
    return "covered";
  }

  private domainDisplayName(domain: string): string {
    const names: Record<string, string> = {
      storage: "Storage",
      search: "Search",
      notification: "Notification",
      auth: "Authentication",
      billing: "Billing",
      moderation: "Moderation",
      analytics: "Analytics",
      realtime: "Real-time",
      media: "Media",
      e2ee: "End-to-End Encryption",
      calls: "Voice/Video Calls",
      compliance: "Compliance",
    };
    return names[domain] || domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  private estimateEffort(gap: PluginGap): number {
    const baseHours: Record<string, number> = {
      storage: 12,
      search: 16,
      notification: 10,
      auth: 20,
      billing: 24,
      moderation: 16,
      analytics: 12,
      realtime: 20,
      media: 12,
      e2ee: 32,
      calls: 24,
      compliance: 16,
    };

    const base = baseHours[gap.domain] || 16;
    const capMultiplier = gap.requiredCapabilities.length * 2;
    return base + capMultiplier;
  }

  private identifyDependencies(gap: PluginGap): string[] {
    const deps: string[] = [];

    // Check if capabilities reference backend services
    for (const capId of gap.requiredCapabilities) {
      const capDef = this.capabilities.find((c) => c.id === capId);
      if (capDef?.requiredBackendService) {
        deps.push(`backend:${capDef.requiredBackendService}`);
      }
    }

    // Cross-domain dependencies
    if (gap.domain === "search") {
      deps.push("domain:storage"); // Search needs indexed content
    }
    if (gap.domain === "moderation") {
      deps.push("domain:storage"); // Virus scan needs file access
    }
    if (gap.domain === "compliance") {
      deps.push("domain:storage"); // Data export needs storage
      deps.push("domain:search"); // Finding data needs search
    }

    return [...new Set(deps)];
  }

  private generateAction(gap: PluginGap): string {
    switch (gap.status) {
      case "uncovered":
        return `Create ${this.domainDisplayName(gap.domain)} plugin to provide: ${gap.requiredCapabilities.join(", ")}`;
      case "partial":
        return `Extend existing ${this.domainDisplayName(gap.domain)} plugin to cover: ${gap.requiredCapabilities.join(", ")}`;
      case "workaround":
        return `Replace ad-hoc workaround with proper ${this.domainDisplayName(gap.domain)} plugin for: ${gap.requiredCapabilities.join(", ")}`;
      default:
        return `Review ${this.domainDisplayName(gap.domain)} gap: ${gap.title}`;
    }
  }
}
