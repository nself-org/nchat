/**
 * Key Compromise Detection and Response System
 *
 * Monitors for potential key compromises and provides automated and
 * manual response capabilities. Implements defense-in-depth with
 * multiple detection vectors and graceful degradation.
 *
 * Features:
 * - Anomaly detection for key usage patterns
 * - Device trust verification
 * - Automated compromise response workflows
 * - Key revocation with propagation
 * - Forensic logging for incident investigation
 * - Rate limiting and lockout mechanisms
 */

import { logger } from "@/lib/logger";
import { KeyManager, KeyMetadata, getKeyFingerprint } from "./key-manager";
import {
  KeyRotationManager,
  getRotationManager,
  RotationTrigger,
} from "./key-rotation";

// ============================================================================
// Types
// ============================================================================

/**
 * Compromise indicator types
 */
export type CompromiseIndicator =
  | "unusual_location" // Access from unexpected geographic location
  | "unusual_device" // Access from unknown/untrusted device
  | "unusual_time" // Access outside normal usage patterns
  | "rapid_key_usage" // Abnormally high key usage rate
  | "failed_verifications" // Multiple failed signature verifications
  | "concurrent_sessions" // Simultaneous access from multiple locations
  | "known_compromised_ip" // Access from known malicious IP
  | "key_export_attempt" // Attempt to export keys unexpectedly
  | "permission_escalation" // Attempt to use key for unauthorized operations
  | "user_report" // User-reported compromise
  | "admin_report"; // Admin-reported compromise

/**
 * Compromise severity levels
 */
export type CompromiseSeverity =
  | "low" // Minor anomaly, monitor
  | "medium" // Suspicious activity, alert user
  | "high" // Likely compromise, require action
  | "critical"; // Confirmed compromise, immediate response

/**
 * Compromise response actions
 */
export type CompromiseAction =
  | "monitor" // Continue monitoring
  | "alert_user" // Notify user
  | "require_verification" // Require additional verification
  | "suspend_key" // Temporarily suspend key usage
  | "revoke_key" // Permanently revoke key
  | "rotate_key" // Force key rotation
  | "terminate_sessions" // End all active sessions
  | "lockout_device" // Lock out the suspect device
  | "notify_admin"; // Alert administrators

/**
 * Compromise detection event
 */
export interface CompromiseEvent {
  /** Unique event identifier */
  id: string;
  /** Timestamp of detection */
  detectedAt: Date;
  /** Key ID involved */
  keyId: string;
  /** Device ID involved (if applicable) */
  deviceId: string | null;
  /** Type of indicator detected */
  indicator: CompromiseIndicator;
  /** Severity assessment */
  severity: CompromiseSeverity;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detailed description */
  description: string;
  /** Source IP address */
  sourceIp: string | null;
  /** User agent string */
  userAgent: string | null;
  /** Geographic location */
  location: string | null;
  /** Additional context */
  context: Record<string, unknown>;
  /** Actions taken */
  actionsTaken: CompromiseAction[];
  /** Whether event is resolved */
  resolved: boolean;
  /** Resolution timestamp */
  resolvedAt: Date | null;
  /** Resolution notes */
  resolutionNotes: string | null;
}

/**
 * Key revocation record
 */
export interface KeyRevocation {
  /** Revocation ID */
  id: string;
  /** Revoked key ID */
  keyId: string;
  /** Key fingerprint */
  fingerprint: string;
  /** Device ID */
  deviceId: string;
  /** Reason for revocation */
  reason: string;
  /** Who initiated revocation */
  initiatedBy: "user" | "system" | "admin";
  /** Revocation timestamp */
  revokedAt: Date;
  /** Compromise event that triggered revocation (if applicable) */
  compromiseEventId: string | null;
  /** Whether revocation is propagated to other devices */
  propagated: boolean;
  /** Devices notified of revocation */
  notifiedDevices: string[];
}

/**
 * Device trust score
 */
export interface DeviceTrust {
  /** Device ID */
  deviceId: string;
  /** Trust score (0-100) */
  score: number;
  /** Factors affecting score */
  factors: TrustFactor[];
  /** Last updated */
  lastUpdated: Date;
  /** Whether device is trusted */
  trusted: boolean;
}

/**
 * Trust factor
 */
export interface TrustFactor {
  /** Factor name */
  name: string;
  /** Factor weight */
  weight: number;
  /** Factor score (0-1) */
  score: number;
  /** Last evaluated */
  evaluatedAt: Date;
}

/**
 * Usage pattern baseline
 */
export interface UsageBaseline {
  /** Key ID */
  keyId: string;
  /** Average daily usage count */
  avgDailyUsage: number;
  /** Standard deviation */
  stdDeviation: number;
  /** Peak usage hours (0-23) */
  peakHours: number[];
  /** Common locations */
  knownLocations: string[];
  /** Known devices */
  knownDevices: string[];
  /** Last updated */
  lastUpdated: Date;
  /** Data points used */
  dataPoints: number;
}

/**
 * Detection rule configuration
 */
export interface DetectionRule {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Whether rule is enabled */
  enabled: boolean;
  /** Indicator type this rule detects */
  indicator: CompromiseIndicator;
  /** Severity if triggered */
  severity: CompromiseSeverity;
  /** Threshold value (rule-specific) */
  threshold: number;
  /** Actions to take when triggered */
  actions: CompromiseAction[];
  /** Cooldown period (ms) */
  cooldownMs: number;
  /** Last triggered */
  lastTriggered: Date | null;
}

/**
 * Compromise monitor configuration
 */
export interface CompromiseMonitorConfig {
  /** Enable real-time monitoring */
  enabled: boolean;
  /** Maximum events to retain */
  maxEventHistory: number;
  /** Alert threshold (number of events) */
  alertThreshold: number;
  /** Auto-response enabled */
  autoResponse: boolean;
  /** Notification email */
  notificationEmail: string | null;
  /** Webhook URL for alerts */
  webhookUrl: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: CompromiseMonitorConfig = {
  enabled: true,
  maxEventHistory: 1000,
  alertThreshold: 5,
  autoResponse: true,
  notificationEmail: null,
  webhookUrl: null,
};

const DEFAULT_RULES: DetectionRule[] = [
  {
    id: "rapid-usage",
    name: "Rapid Key Usage",
    enabled: true,
    indicator: "rapid_key_usage",
    severity: "medium",
    threshold: 100, // Operations per minute
    actions: ["alert_user", "monitor"],
    cooldownMs: 60000,
    lastTriggered: null,
  },
  {
    id: "failed-verifications",
    name: "Failed Signature Verifications",
    enabled: true,
    indicator: "failed_verifications",
    severity: "high",
    threshold: 5, // Failures in 5 minutes
    actions: ["alert_user", "require_verification"],
    cooldownMs: 300000,
    lastTriggered: null,
  },
  {
    id: "unknown-device",
    name: "Unknown Device Access",
    enabled: true,
    indicator: "unusual_device",
    severity: "medium",
    threshold: 1,
    actions: ["alert_user", "require_verification"],
    cooldownMs: 0, // Always trigger
    lastTriggered: null,
  },
  {
    id: "concurrent-sessions",
    name: "Concurrent Session Detection",
    enabled: true,
    indicator: "concurrent_sessions",
    severity: "high",
    threshold: 3, // More than 3 concurrent locations
    actions: ["alert_user", "terminate_sessions"],
    cooldownMs: 300000,
    lastTriggered: null,
  },
  {
    id: "key-export",
    name: "Key Export Attempt",
    enabled: true,
    indicator: "key_export_attempt",
    severity: "critical",
    threshold: 1,
    actions: ["alert_user", "notify_admin", "suspend_key"],
    cooldownMs: 0,
    lastTriggered: null,
  },
  {
    id: "user-reported",
    name: "User Reported Compromise",
    enabled: true,
    indicator: "user_report",
    severity: "critical",
    threshold: 1,
    actions: ["revoke_key", "rotate_key", "terminate_sessions", "notify_admin"],
    cooldownMs: 0,
    lastTriggered: null,
  },
];

const STORAGE_PREFIX = "nchat_compromise_";
const EVENTS_KEY = `${STORAGE_PREFIX}events`;
const REVOCATIONS_KEY = `${STORAGE_PREFIX}revocations`;
const BASELINES_KEY = `${STORAGE_PREFIX}baselines`;
const DEVICE_TRUST_KEY = `${STORAGE_PREFIX}device_trust`;

const TRUST_THRESHOLD = 70; // Score above which device is trusted

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique event ID
 */
function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `cmp_${timestamp}_${random}`;
}

/**
 * Calculates anomaly score based on deviation from baseline
 */
export function calculateAnomalyScore(
  value: number,
  baseline: UsageBaseline,
): number {
  if (baseline.stdDeviation === 0) return 0;
  const zScore =
    Math.abs(value - baseline.avgDailyUsage) / baseline.stdDeviation;
  // Convert z-score to 0-1 confidence (3 sigma = 0.997 confidence)
  return Math.min(1, zScore / 3);
}

/**
 * Calculates device trust score from factors
 */
export function calculateTrustScore(factors: TrustFactor[]): number {
  if (factors.length === 0) return 0;

  let totalWeight = 0;
  let weightedScore = 0;

  for (const factor of factors) {
    totalWeight += factor.weight;
    weightedScore += factor.score * factor.weight;
  }

  return totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
}

/**
 * Determines severity based on confidence and indicator type
 */
export function determineSeverity(
  indicator: CompromiseIndicator,
  confidence: number,
): CompromiseSeverity {
  // Critical indicators
  if (
    ["user_report", "admin_report", "key_export_attempt"].includes(indicator)
  ) {
    return "critical";
  }

  // Confidence-based severity
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
}

// ============================================================================
// Key Compromise Monitor
// ============================================================================

/**
 * Monitors for and responds to key compromise events
 */
export class KeyCompromiseMonitor {
  private static instance: KeyCompromiseMonitor;
  private config: CompromiseMonitorConfig;
  private rules: Map<string, DetectionRule> = new Map();
  private events: CompromiseEvent[] = [];
  private revocations: KeyRevocation[] = [];
  private baselines: Map<string, UsageBaseline> = new Map();
  private deviceTrust: Map<string, DeviceTrust> = new Map();
  private usageCounts: Map<string, { count: number; windowStart: number }> =
    new Map();
  private listeners: Map<string, ((event: CompromiseEvent) => void)[]> =
    new Map();
  private initialized = false;

  private constructor(config: Partial<CompromiseMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Register default rules
    for (const rule of DEFAULT_RULES) {
      this.rules.set(rule.id, rule);
    }
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(
    config?: Partial<CompromiseMonitorConfig>,
  ): KeyCompromiseMonitor {
    if (!KeyCompromiseMonitor.instance) {
      KeyCompromiseMonitor.instance = new KeyCompromiseMonitor(config);
    }
    return KeyCompromiseMonitor.instance;
  }

  /**
   * Resets the singleton (for testing)
   */
  static resetInstance(): void {
    KeyCompromiseMonitor.instance =
      undefined as unknown as KeyCompromiseMonitor;
  }

  /**
   * Initializes the monitor
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadFromStorage();
    this.initialized = true;

    logger.info("Key compromise monitor initialized");
  }

  /**
   * Records a key usage event for analysis
   */
  recordKeyUsage(
    keyId: string,
    deviceId: string,
    context: {
      sourceIp?: string;
      userAgent?: string;
      location?: string;
      operationType?: string;
    } = {},
  ): void {
    if (!this.config.enabled) return;

    const now = Date.now();
    const windowKey = `${keyId}:${deviceId}`;
    const window = this.usageCounts.get(windowKey);

    if (window && now - window.windowStart < 60000) {
      window.count++;

      // Check for rapid usage
      this.checkRapidUsage(keyId, deviceId, window.count, context);
    } else {
      this.usageCounts.set(windowKey, { count: 1, windowStart: now });
    }

    // Update baseline
    this.updateBaseline(keyId, deviceId);

    // Check device trust
    this.checkDeviceTrust(keyId, deviceId, context);
  }

  /**
   * Records a verification failure
   */
  recordVerificationFailure(
    keyId: string,
    deviceId: string,
    context: Record<string, unknown> = {},
  ): void {
    const rule = this.rules.get("failed-verifications");
    if (!rule?.enabled) return;

    const event = this.createEvent(
      keyId,
      deviceId,
      "failed_verifications",
      "medium",
      0.6,
      "Signature verification failed",
      context,
    );

    this.processEvent(event, rule);
  }

  /**
   * Records a key export attempt
   */
  recordKeyExportAttempt(
    keyId: string,
    deviceId: string,
    authorized: boolean,
    context: Record<string, unknown> = {},
  ): void {
    if (authorized) return; // Only track unauthorized attempts

    const rule = this.rules.get("key-export");
    if (!rule?.enabled) return;

    const event = this.createEvent(
      keyId,
      deviceId,
      "key_export_attempt",
      "critical",
      0.95,
      "Unauthorized key export attempt detected",
      context,
    );

    this.processEvent(event, rule);
  }

  /**
   * Reports a suspected compromise (user-initiated)
   */
  async reportCompromise(
    keyId: string,
    deviceId: string,
    description: string,
  ): Promise<CompromiseEvent> {
    const rule = this.rules.get("user-reported")!;

    const event = this.createEvent(
      keyId,
      deviceId,
      "user_report",
      "critical",
      1.0,
      description,
      { reportedBy: "user" },
    );

    await this.processEvent(event, rule);
    return event;
  }

  /**
   * Reports a compromise (admin-initiated)
   */
  async reportCompromiseAdmin(
    keyId: string,
    description: string,
    adminId: string,
  ): Promise<CompromiseEvent> {
    const event = this.createEvent(
      keyId,
      null,
      "admin_report",
      "critical",
      1.0,
      description,
      { reportedBy: "admin", adminId },
    );

    const rule: DetectionRule = {
      id: "admin-report",
      name: "Admin Reported",
      enabled: true,
      indicator: "admin_report",
      severity: "critical",
      threshold: 1,
      actions: ["revoke_key", "rotate_key", "terminate_sessions"],
      cooldownMs: 0,
      lastTriggered: null,
    };

    await this.processEvent(event, rule);
    return event;
  }

  /**
   * Revokes a key
   */
  async revokeKey(
    keyId: string,
    deviceId: string,
    reason: string,
    initiatedBy: "user" | "system" | "admin",
    compromiseEventId?: string,
  ): Promise<KeyRevocation> {
    const keyManager = new KeyManager();
    await keyManager.initialize();

    const fingerprint = (await keyManager.getFingerprint()) || "unknown";

    const revocation: KeyRevocation = {
      id: generateEventId(),
      keyId,
      fingerprint,
      deviceId,
      reason,
      initiatedBy,
      revokedAt: new Date(),
      compromiseEventId: compromiseEventId || null,
      propagated: false,
      notifiedDevices: [],
    };

    this.revocations.push(revocation);
    await this.saveToStorage();

    // Propagate revocation to other devices
    await this.propagateRevocation(revocation);

    logger.warn("Key revoked", {
      keyId,
      deviceId,
      reason,
      initiatedBy,
    });

    return revocation;
  }

  /**
   * Checks if a key is revoked
   */
  isKeyRevoked(keyId: string): boolean {
    return this.revocations.some((r) => r.keyId === keyId);
  }

  /**
   * Gets revocation for a key
   */
  getRevocation(keyId: string): KeyRevocation | undefined {
    return this.revocations.find((r) => r.keyId === keyId);
  }

  /**
   * Gets device trust score
   */
  getDeviceTrust(deviceId: string): DeviceTrust | undefined {
    return this.deviceTrust.get(deviceId);
  }

  /**
   * Updates device trust
   */
  updateDeviceTrust(deviceId: string, factors: TrustFactor[]): void {
    const score = calculateTrustScore(factors);

    this.deviceTrust.set(deviceId, {
      deviceId,
      score,
      factors,
      lastUpdated: new Date(),
      trusted: score >= TRUST_THRESHOLD,
    });

    this.saveToStorage();
  }

  /**
   * Gets all compromise events
   */
  getEvents(options?: {
    keyId?: string;
    severity?: CompromiseSeverity;
    resolved?: boolean;
    limit?: number;
  }): CompromiseEvent[] {
    let filtered = [...this.events];

    if (options?.keyId) {
      filtered = filtered.filter((e) => e.keyId === options.keyId);
    }

    if (options?.severity) {
      filtered = filtered.filter((e) => e.severity === options.severity);
    }

    if (options?.resolved !== undefined) {
      filtered = filtered.filter((e) => e.resolved === options.resolved);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Resolves a compromise event
   */
  async resolveEvent(eventId: string, notes: string): Promise<boolean> {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return false;

    event.resolved = true;
    event.resolvedAt = new Date();
    event.resolutionNotes = notes;

    await this.saveToStorage();

    logger.info("Compromise event resolved", {
      eventId,
      notes,
    });

    return true;
  }

  /**
   * Subscribes to compromise events
   */
  onCompromiseEvent(
    severity: CompromiseSeverity | "all",
    callback: (event: CompromiseEvent) => void,
  ): () => void {
    const key = severity;
    const listeners = this.listeners.get(key) || [];
    listeners.push(callback);
    this.listeners.set(key, listeners);

    return () => {
      const current = this.listeners.get(key) || [];
      this.listeners.set(
        key,
        current.filter((l) => l !== callback),
      );
    };
  }

  /**
   * Adds a custom detection rule
   */
  addRule(rule: DetectionRule): void {
    this.rules.set(rule.id, rule);
    logger.info("Detection rule added", { ruleId: rule.id });
  }

  /**
   * Updates a detection rule
   */
  updateRule(ruleId: string, updates: Partial<DetectionRule>): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    this.rules.set(ruleId, { ...rule, ...updates });
  }

  /**
   * Gets all detection rules
   */
  getRules(): DetectionRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Updates monitor configuration
   */
  updateConfig(updates: Partial<CompromiseMonitorConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveToStorage();
  }

  /**
   * Gets current configuration
   */
  getConfig(): CompromiseMonitorConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createEvent(
    keyId: string,
    deviceId: string | null,
    indicator: CompromiseIndicator,
    severity: CompromiseSeverity,
    confidence: number,
    description: string,
    context: Record<string, unknown>,
  ): CompromiseEvent {
    return {
      id: generateEventId(),
      detectedAt: new Date(),
      keyId,
      deviceId,
      indicator,
      severity,
      confidence,
      description,
      sourceIp: (context.sourceIp as string) || null,
      userAgent: (context.userAgent as string) || null,
      location: (context.location as string) || null,
      context,
      actionsTaken: [],
      resolved: false,
      resolvedAt: null,
      resolutionNotes: null,
    };
  }

  private async processEvent(
    event: CompromiseEvent,
    rule: DetectionRule,
  ): Promise<void> {
    // Check cooldown
    if (rule.lastTriggered && rule.cooldownMs > 0) {
      const timeSinceLast = Date.now() - rule.lastTriggered.getTime();
      if (timeSinceLast < rule.cooldownMs) {
        return;
      }
    }

    // Update rule trigger time
    rule.lastTriggered = new Date();

    // Store event
    this.events.push(event);
    this.trimEvents();

    // Execute actions if auto-response is enabled
    if (this.config.autoResponse) {
      await this.executeActions(event, rule.actions);
    }

    // Emit to listeners
    this.emitEvent(event);

    // Send external notifications
    await this.sendNotifications(event);

    await this.saveToStorage();

    logger.warn("Compromise event detected", {
      eventId: event.id,
      indicator: event.indicator,
      severity: event.severity,
      actions: event.actionsTaken,
    });
  }

  private async executeActions(
    event: CompromiseEvent,
    actions: CompromiseAction[],
  ): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(event, action);
        event.actionsTaken.push(action);
      } catch (error) {
        logger.error("Failed to execute compromise action", {
          action,
          eventId: event.id,
          error: error instanceof Error ? error.message : "Unknown",
        });
      }
    }
  }

  private async executeAction(
    event: CompromiseEvent,
    action: CompromiseAction,
  ): Promise<void> {
    switch (action) {
      case "monitor":
        // No action needed, already monitoring
        break;

      case "alert_user":
        // Would send push notification or in-app alert
        logger.info("User alert sent", { eventId: event.id });
        break;

      case "require_verification":
        // Would trigger verification flow
        logger.info("Verification required", { eventId: event.id });
        break;

      case "suspend_key":
        // Mark key as suspended (implementation-specific)
        logger.info("Key suspended", { keyId: event.keyId });
        break;

      case "revoke_key":
        if (event.deviceId) {
          await this.revokeKey(
            event.keyId,
            event.deviceId,
            `Auto-revoked due to: ${event.indicator}`,
            "system",
            event.id,
          );
        }
        break;

      case "rotate_key":
        // Trigger key rotation
        const rotationManager = getRotationManager();
        const keyManager = new KeyManager();
        await keyManager.initialize();
        await rotationManager.forceRotation(keyManager, event.description);
        break;

      case "terminate_sessions":
        // Would terminate all active sessions
        logger.info("Sessions terminated", { keyId: event.keyId });
        break;

      case "lockout_device":
        if (event.deviceId) {
          // Would lock out the device
          logger.info("Device locked out", { deviceId: event.deviceId });
        }
        break;

      case "notify_admin":
        // Would send admin notification
        logger.info("Admin notified", { eventId: event.id });
        break;
    }
  }

  private checkRapidUsage(
    keyId: string,
    deviceId: string,
    count: number,
    context: Record<string, unknown>,
  ): void {
    const rule = this.rules.get("rapid-usage");
    if (!rule?.enabled) return;

    if (count > rule.threshold) {
      const baseline = this.baselines.get(keyId);
      const confidence = baseline
        ? calculateAnomalyScore(count, baseline)
        : 0.7;

      const event = this.createEvent(
        keyId,
        deviceId,
        "rapid_key_usage",
        determineSeverity("rapid_key_usage", confidence),
        confidence,
        `Unusual key usage rate: ${count} operations/minute`,
        context,
      );

      this.processEvent(event, rule);
    }
  }

  private checkDeviceTrust(
    keyId: string,
    deviceId: string,
    context: Record<string, unknown>,
  ): void {
    const trust = this.deviceTrust.get(deviceId);

    if (!trust) {
      // Unknown device
      const rule = this.rules.get("unknown-device");
      if (rule?.enabled) {
        const event = this.createEvent(
          keyId,
          deviceId,
          "unusual_device",
          "medium",
          0.6,
          "Access from unknown device",
          context,
        );
        this.processEvent(event, rule);
      }
    } else if (!trust.trusted) {
      // Low-trust device
      const rule = this.rules.get("unknown-device");
      if (rule?.enabled) {
        const event = this.createEvent(
          keyId,
          deviceId,
          "unusual_device",
          "low",
          1 - trust.score / 100,
          `Access from low-trust device (score: ${trust.score})`,
          context,
        );
        this.processEvent(event, rule);
      }
    }
  }

  private updateBaseline(keyId: string, deviceId: string): void {
    const baseline = this.baselines.get(keyId);
    const now = new Date();

    if (!baseline) {
      this.baselines.set(keyId, {
        keyId,
        avgDailyUsage: 1,
        stdDeviation: 0,
        peakHours: [now.getHours()],
        knownLocations: [],
        knownDevices: [deviceId],
        lastUpdated: now,
        dataPoints: 1,
      });
      return;
    }

    // Update baseline with exponential moving average
    const alpha = 0.1; // Smoothing factor
    baseline.avgDailyUsage = alpha * 1 + (1 - alpha) * baseline.avgDailyUsage;
    baseline.dataPoints++;
    baseline.lastUpdated = now;

    if (!baseline.knownDevices.includes(deviceId)) {
      baseline.knownDevices.push(deviceId);
    }

    // Update peak hours
    const hour = now.getHours();
    if (!baseline.peakHours.includes(hour) && baseline.peakHours.length < 12) {
      baseline.peakHours.push(hour);
    }
  }

  private async propagateRevocation(revocation: KeyRevocation): Promise<void> {
    // In a real implementation, this would notify other devices
    // about the key revocation
    revocation.propagated = true;
    logger.info("Key revocation propagated", {
      keyId: revocation.keyId,
    });
  }

  private emitEvent(event: CompromiseEvent): void {
    // Emit to severity-specific listeners
    const severityListeners = this.listeners.get(event.severity) || [];
    severityListeners.forEach((l) => l(event));

    // Emit to 'all' listeners
    const allListeners = this.listeners.get("all") || [];
    allListeners.forEach((l) => l(event));
  }

  private async sendNotifications(event: CompromiseEvent): Promise<void> {
    if (event.severity === "low") return;

    // Email notification
    if (this.config.notificationEmail) {
      // Would send email
      logger.info("Email notification sent", {
        email: this.config.notificationEmail,
        eventId: event.id,
      });
    }

    // Webhook notification
    if (this.config.webhookUrl) {
      try {
        await fetch(this.config.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "key_compromise_event",
            event,
          }),
        });
      } catch {
        logger.warn("Failed to send webhook notification");
      }
    }
  }

  private trimEvents(): void {
    while (this.events.length > this.config.maxEventHistory) {
      this.events.shift();
    }
  }

  private async loadFromStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    try {
      const eventsData = localStorage.getItem(EVENTS_KEY);
      if (eventsData) {
        const events = JSON.parse(eventsData);
        this.events = events.map((e: CompromiseEvent) => ({
          ...e,
          detectedAt: new Date(e.detectedAt),
          resolvedAt: e.resolvedAt ? new Date(e.resolvedAt) : null,
        }));
      }

      const revocationsData = localStorage.getItem(REVOCATIONS_KEY);
      if (revocationsData) {
        const revocations = JSON.parse(revocationsData);
        this.revocations = revocations.map((r: KeyRevocation) => ({
          ...r,
          revokedAt: new Date(r.revokedAt),
        }));
      }

      const baselinesData = localStorage.getItem(BASELINES_KEY);
      if (baselinesData) {
        const baselines = JSON.parse(baselinesData);
        for (const b of baselines) {
          b.lastUpdated = new Date(b.lastUpdated);
          this.baselines.set(b.keyId, b);
        }
      }

      const trustData = localStorage.getItem(DEVICE_TRUST_KEY);
      if (trustData) {
        const trusts = JSON.parse(trustData);
        for (const t of trusts) {
          t.lastUpdated = new Date(t.lastUpdated);
          this.deviceTrust.set(t.deviceId, t);
        }
      }
    } catch (error) {
      logger.warn("Failed to load compromise data from storage", {
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }

  private async saveToStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    try {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
      localStorage.setItem(REVOCATIONS_KEY, JSON.stringify(this.revocations));
      localStorage.setItem(
        BASELINES_KEY,
        JSON.stringify(Array.from(this.baselines.values())),
      );
      localStorage.setItem(
        DEVICE_TRUST_KEY,
        JSON.stringify(Array.from(this.deviceTrust.values())),
      );
    } catch (error) {
      logger.warn("Failed to save compromise data to storage", {
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the global compromise monitor instance
 */
export function getCompromiseMonitor(
  config?: Partial<CompromiseMonitorConfig>,
): KeyCompromiseMonitor {
  return KeyCompromiseMonitor.getInstance(config);
}

/**
 * Initializes the compromise monitor
 */
export async function initializeCompromiseMonitor(): Promise<void> {
  const monitor = getCompromiseMonitor();
  await monitor.initialize();
}

/**
 * Records a key usage event
 */
export function recordKeyUsage(
  keyId: string,
  deviceId: string,
  context?: Record<string, unknown>,
): void {
  const monitor = getCompromiseMonitor();
  monitor.recordKeyUsage(keyId, deviceId, context);
}

/**
 * Reports a suspected key compromise
 */
export async function reportKeyCompromise(
  keyId: string,
  deviceId: string,
  description: string,
): Promise<CompromiseEvent> {
  const monitor = getCompromiseMonitor();
  return monitor.reportCompromise(keyId, deviceId, description);
}

/**
 * Checks if a key is revoked
 */
export function isKeyRevoked(keyId: string): boolean {
  const monitor = getCompromiseMonitor();
  return monitor.isKeyRevoked(keyId);
}

/**
 * Gets unresolved compromise events for a key
 */
export function getUnresolvedEvents(keyId: string): CompromiseEvent[] {
  const monitor = getCompromiseMonitor();
  return monitor.getEvents({ keyId, resolved: false });
}
