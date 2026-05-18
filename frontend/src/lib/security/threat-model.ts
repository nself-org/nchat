/**
 * Threat Model Types and Constants
 *
 * This module provides TypeScript types and constants for security threat modeling,
 * implementing the STRIDE methodology and supporting security assessments.
 *
 * @module lib/security/threat-model
 * @see docs/security/THREAT-MODEL.md
 */

// ============================================================================
// STRIDE Categories
// ============================================================================

/**
 * STRIDE threat categories
 */
export type StrideCategory =
  | "spoofing"
  | "tampering"
  | "repudiation"
  | "information_disclosure"
  | "denial_of_service"
  | "elevation_of_privilege";

/**
 * STRIDE category descriptions
 */
export const STRIDE_CATEGORIES: Record<
  StrideCategory,
  {
    name: string;
    description: string;
    examples: string[];
  }
> = {
  spoofing: {
    name: "Spoofing",
    description: "Pretending to be something or someone else",
    examples: [
      "User impersonation",
      "Session hijacking",
      "OAuth token forgery",
      "Device impersonation",
    ],
  },
  tampering: {
    name: "Tampering",
    description: "Modifying data or code without authorization",
    examples: [
      "Message modification",
      "Request parameter manipulation",
      "Database record modification",
      "Configuration tampering",
    ],
  },
  repudiation: {
    name: "Repudiation",
    description: "Denying having performed an action",
    examples: [
      "Deny sending message",
      "Deny administrative action",
      "Deny payment transaction",
      "Deny access attempt",
    ],
  },
  information_disclosure: {
    name: "Information Disclosure",
    description: "Exposing information to unauthorized parties",
    examples: [
      "E2EE key extraction",
      "User PII exposure",
      "Credential exposure in logs",
      "Metadata analysis",
    ],
  },
  denial_of_service: {
    name: "Denial of Service",
    description: "Denying or degrading service to users",
    examples: [
      "API rate limit exhaustion",
      "WebSocket connection flood",
      "GraphQL complexity attack",
      "Message queue flooding",
    ],
  },
  elevation_of_privilege: {
    name: "Elevation of Privilege",
    description: "Gaining capabilities without authorization",
    examples: [
      "Role escalation",
      "Channel permission bypass",
      "Admin panel unauthorized access",
      "Cross-tenant data access",
    ],
  },
} as const;

// ============================================================================
// Threat Actors
// ============================================================================

/**
 * Threat actor types
 */
export type ThreatActorType =
  | "script_kiddie"
  | "cybercriminal"
  | "insider_malicious"
  | "insider_negligent"
  | "competitor"
  | "nation_state"
  | "hacktivist";

/**
 * Threat actor capability levels
 */
export type CapabilityLevel = "low" | "medium" | "high" | "very_high";

/**
 * Threat actor persistence levels
 */
export type PersistenceLevel =
  | "low"
  | "medium"
  | "high"
  | "very_high"
  | "event_driven"
  | "na";

/**
 * Threat actor definition
 */
export interface ThreatActor {
  id: ThreatActorType;
  name: string;
  motivation: string;
  capability: CapabilityLevel;
  resources: string;
  persistence: PersistenceLevel;
  attackMethods: string[];
}

/**
 * Predefined threat actors
 */
export const THREAT_ACTORS: Record<ThreatActorType, ThreatActor> = {
  script_kiddie: {
    id: "script_kiddie",
    name: "Script Kiddie",
    motivation: "Curiosity, vandalism, reputation",
    capability: "low",
    resources: "Limited",
    persistence: "low",
    attackMethods: [
      "Automated vulnerability scanners",
      "Known exploit kits",
      "Credential stuffing",
      "Public exploit code",
    ],
  },
  cybercriminal: {
    id: "cybercriminal",
    name: "Cybercriminal",
    motivation: "Financial gain",
    capability: "medium",
    resources: "Moderate",
    persistence: "medium",
    attackMethods: [
      "Phishing campaigns",
      "Ransomware deployment",
      "Data exfiltration for sale",
      "Payment fraud",
    ],
  },
  insider_malicious: {
    id: "insider_malicious",
    name: "Malicious Insider",
    motivation: "Financial gain, revenge, ideology",
    capability: "high",
    resources: "Internal access",
    persistence: "high",
    attackMethods: [
      "Direct database access",
      "Log tampering",
      "Backdoor installation",
      "Privilege abuse",
    ],
  },
  insider_negligent: {
    id: "insider_negligent",
    name: "Negligent Insider",
    motivation: "None (accidental)",
    capability: "medium",
    resources: "Internal access",
    persistence: "na",
    attackMethods: [
      "Misconfiguration",
      "Credential exposure",
      "Social engineering victim",
    ],
  },
  competitor: {
    id: "competitor",
    name: "Competitor",
    motivation: "Business intelligence, disruption",
    capability: "medium",
    resources: "Moderate to High",
    persistence: "medium",
    attackMethods: [
      "Corporate espionage",
      "Feature intelligence gathering",
      "Customer data theft",
      "DDoS disruption",
    ],
  },
  nation_state: {
    id: "nation_state",
    name: "Nation-State Actor",
    motivation: "Intelligence, surveillance, disruption",
    capability: "very_high",
    resources: "Unlimited",
    persistence: "very_high",
    attackMethods: [
      "Zero-day exploits",
      "Advanced persistent threats",
      "Supply chain compromise",
      "Compelled disclosure",
    ],
  },
  hacktivist: {
    id: "hacktivist",
    name: "Hacktivist",
    motivation: "Ideology, publicity",
    capability: "medium",
    resources: "Moderate (collective)",
    persistence: "event_driven",
    attackMethods: [
      "DDoS attacks",
      "Defacement",
      "Data leaks",
      "Public shaming",
    ],
  },
} as const;

// ============================================================================
// Risk Assessment
// ============================================================================

/**
 * Likelihood levels
 */
export type LikelihoodLevel =
  | "very_low"
  | "low"
  | "medium"
  | "high"
  | "very_high";

/**
 * Impact levels
 */
export type ImpactLevel = "low" | "medium" | "high" | "critical";

/**
 * Risk levels (computed from likelihood and impact)
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Mitigation status
 */
export type MitigationStatus =
  | "implemented"
  | "partial"
  | "planned"
  | "not_addressed";

/**
 * Risk matrix for computing risk level
 */
export const RISK_MATRIX: Record<
  LikelihoodLevel,
  Record<ImpactLevel, RiskLevel>
> = {
  very_low: {
    low: "low",
    medium: "low",
    high: "medium",
    critical: "medium",
  },
  low: {
    low: "low",
    medium: "low",
    high: "medium",
    critical: "high",
  },
  medium: {
    low: "low",
    medium: "medium",
    high: "high",
    critical: "high",
  },
  high: {
    low: "medium",
    medium: "high",
    high: "high",
    critical: "critical",
  },
  very_high: {
    low: "medium",
    medium: "high",
    high: "critical",
    critical: "critical",
  },
} as const;

/**
 * Calculate risk level from likelihood and impact
 */
export function calculateRiskLevel(
  likelihood: LikelihoodLevel,
  impact: ImpactLevel,
): RiskLevel {
  return RISK_MATRIX[likelihood][impact];
}

// ============================================================================
// Asset Classification
// ============================================================================

/**
 * Asset classification tiers
 */
export type AssetTier = "critical" | "high" | "medium" | "low";

/**
 * Asset category
 */
export type AssetCategory =
  | "credentials"
  | "encryption_keys"
  | "user_data"
  | "messages"
  | "files"
  | "configuration"
  | "audit_logs"
  | "metadata";

/**
 * Asset definition
 */
export interface Asset {
  id: string;
  name: string;
  description: string;
  tier: AssetTier;
  category: AssetCategory;
  storageLocation: string;
  protectionLevel: string;
  encryptionType?: string;
}

/**
 * Critical assets requiring protection
 */
export const CRITICAL_ASSETS: Asset[] = [
  {
    id: "user_credentials",
    name: "User Credentials",
    description: "Passwords, OAuth tokens",
    tier: "critical",
    category: "credentials",
    storageLocation: "PostgreSQL (hashed)",
    protectionLevel: "Critical",
    encryptionType: "bcrypt",
  },
  {
    id: "session_tokens",
    name: "Session Tokens",
    description: "JWT access/refresh tokens",
    tier: "critical",
    category: "credentials",
    storageLocation: "Memory + Cookies",
    protectionLevel: "Critical",
  },
  {
    id: "e2ee_private_keys",
    name: "E2EE Private Keys",
    description: "Signal Protocol identity keys",
    tier: "critical",
    category: "encryption_keys",
    storageLocation: "Encrypted IndexedDB",
    protectionLevel: "Critical",
    encryptionType: "AES-256-GCM",
  },
  {
    id: "master_keys",
    name: "Master Keys",
    description: "Password-derived encryption keys",
    tier: "critical",
    category: "encryption_keys",
    storageLocation: "Memory only",
    protectionLevel: "Critical",
  },
  {
    id: "message_plaintext",
    name: "Message Content",
    description: "Plaintext messages",
    tier: "critical",
    category: "messages",
    storageLocation: "Memory (client-side)",
    protectionLevel: "Critical",
  },
] as const;

// ============================================================================
// Attack Vectors
// ============================================================================

/**
 * Attack vector categories
 */
export type AttackVectorCategory =
  | "client_side"
  | "server_side"
  | "network"
  | "insider"
  | "state_legal";

/**
 * Attack vector definition
 */
export interface AttackVector {
  id: string;
  name: string;
  category: AttackVectorCategory;
  description: string;
  attackPath: string[];
  mitigations: string[];
  residualRisk: RiskLevel;
}

/**
 * Common attack vectors
 */
export const ATTACK_VECTORS: Record<string, AttackVector> = {
  xss: {
    id: "xss",
    name: "Cross-Site Scripting (XSS)",
    category: "client_side",
    description: "Injection of malicious scripts into web pages",
    attackPath: [
      "Attacker crafts malicious payload",
      "Payload renders in victim browser",
      "Script executes, stealing data",
    ],
    mitigations: [
      "React automatic escaping",
      "DOMPurify sanitization",
      "Content Security Policy",
      "HTTP-only cookies",
    ],
    residualRisk: "low",
  },
  csrf: {
    id: "csrf",
    name: "Cross-Site Request Forgery (CSRF)",
    category: "client_side",
    description: "Forged requests from authenticated sessions",
    attackPath: [
      "Attacker hosts malicious page",
      "Victim visits while authenticated",
      "Forged request executes",
    ],
    mitigations: [
      "CSRF token validation",
      "SameSite cookie attribute",
      "Origin header validation",
    ],
    residualRisk: "low",
  },
  sql_injection: {
    id: "sql_injection",
    name: "SQL Injection",
    category: "server_side",
    description: "Injection of SQL commands via user input",
    attackPath: [
      "Attacker injects SQL in input",
      "Database executes malicious query",
      "Data exfiltration or modification",
    ],
    mitigations: [
      "Hasura parameterized queries",
      "Input validation with Zod",
      "Prepared statements",
    ],
    residualRisk: "low",
  },
  ssrf: {
    id: "ssrf",
    name: "Server-Side Request Forgery (SSRF)",
    category: "server_side",
    description: "Server makes requests to unintended destinations",
    attackPath: [
      "Attacker provides malicious URL",
      "Server fetches internal resource",
      "Internal services exposed",
    ],
    mitigations: [
      "URL validation",
      "Private IP blocking",
      "DNS rebinding protection",
      "Cloud metadata IP blocking",
    ],
    residualRisk: "low",
  },
  mitm: {
    id: "mitm",
    name: "Man-in-the-Middle (MITM)",
    category: "network",
    description: "Interception of network traffic",
    attackPath: [
      "Attacker intercepts traffic",
      "Decrypts or modifies in transit",
      "Steals credentials/tokens",
    ],
    mitigations: [
      "TLS 1.3 enforcement",
      "HSTS with preload",
      "E2EE for message content",
    ],
    residualRisk: "low",
  },
  rogue_admin: {
    id: "rogue_admin",
    name: "Rogue Administrator",
    category: "insider",
    description: "Malicious actions by privileged insiders",
    attackPath: [
      "Admin abuses privileged access",
      "Exports user data",
      "Modifies logs",
    ],
    mitigations: [
      "Comprehensive audit logging",
      "Separation of duties",
      "Log tamper detection",
    ],
    residualRisk: "medium",
  },
  compelled_disclosure: {
    id: "compelled_disclosure",
    name: "Compelled Disclosure",
    category: "state_legal",
    description: "Legal orders demanding user data",
    attackPath: [
      "Legal order demands data",
      "Operators must comply",
      "Encrypted data provided",
    ],
    mitigations: [
      "E2EE prevents plaintext disclosure",
      "Metadata minimization",
    ],
    residualRisk: "medium",
  },
} as const;

// ============================================================================
// Threat Definition
// ============================================================================

/**
 * Threat definition
 */
export interface Threat {
  id: string;
  name: string;
  strideCategory: StrideCategory;
  description: string;
  component: string;
  likelihood: LikelihoodLevel;
  impact: ImpactLevel;
  risk: RiskLevel;
  mitigations: string[];
  status: MitigationStatus;
  attackVectors?: string[];
  threatActors?: ThreatActorType[];
}

// ============================================================================
// Security Control
// ============================================================================

/**
 * Security control categories
 */
export type ControlCategory =
  | "authentication"
  | "authorization"
  | "encryption"
  | "input_validation"
  | "network_security"
  | "monitoring_audit"
  | "session_management"
  | "file_security"
  | "api_security"
  | "infrastructure"
  | "compliance";

/**
 * Security control definition
 */
export interface SecurityControl {
  id: string;
  name: string;
  category: ControlCategory;
  description: string;
  implementation: string;
  location: string;
  nistControl?: string;
  threatsMitigated: string[];
  status: MitigationStatus;
}

// ============================================================================
// Trust Boundaries
// ============================================================================

/**
 * Trust boundary definition
 */
export interface TrustBoundary {
  id: string;
  name: string;
  description: string;
  components: string[];
  securityControls: string[];
}

/**
 * Predefined trust boundaries
 */
export const TRUST_BOUNDARIES: TrustBoundary[] = [
  {
    id: "tb1_public_internet",
    name: "Public Internet Boundary",
    description: "Boundary between public internet and edge services",
    components: ["Load Balancer", "WAF", "CDN"],
    securityControls: ["TLS termination", "Rate limiting", "DDoS protection"],
  },
  {
    id: "tb2_application",
    name: "Application Boundary",
    description: "Boundary between edge and application layer",
    components: ["Next.js", "API Routes", "Middleware"],
    securityControls: ["Authentication", "CSRF validation", "Input validation"],
  },
  {
    id: "tb3_data",
    name: "Data Layer Boundary",
    description: "Boundary between application and data stores",
    components: ["Hasura", "PostgreSQL", "Redis", "MinIO"],
    securityControls: [
      "Hasura permissions",
      "Row-level security",
      "Parameterized queries",
    ],
  },
  {
    id: "tb4_client",
    name: "Client Device Boundary",
    description: "Boundary protecting sensitive client-side data",
    components: ["IndexedDB", "Memory", "LocalStorage"],
    securityControls: ["Device lock", "Encrypted storage", "Memory-only keys"],
  },
] as const;

// ============================================================================
// Remediation Priority
// ============================================================================

/**
 * Remediation priority levels
 */
export type RemediationPriority = "P1" | "P2" | "P3" | "P4";

/**
 * Remediation item
 */
export interface RemediationItem {
  id: string;
  gapId?: string;
  description: string;
  priority: RemediationPriority;
  effort: string;
  owner: string;
  timeline: string;
  status: "todo" | "in_progress" | "completed" | "blocked";
}

/**
 * Priority descriptions
 */
export const PRIORITY_DESCRIPTIONS: Record<
  RemediationPriority,
  {
    name: string;
    timeline: string;
    description: string;
  }
> = {
  P1: {
    name: "Critical",
    timeline: "0-30 days",
    description: "Must be addressed immediately",
  },
  P2: {
    name: "High",
    timeline: "30-90 days",
    description: "Should be addressed soon",
  },
  P3: {
    name: "Medium",
    timeline: "90-180 days",
    description: "Address when resources available",
  },
  P4: {
    name: "Low",
    timeline: "180+ days",
    description: "Nice to have, low priority",
  },
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all threats in a STRIDE category
 */
export function getThreatsByCategory(
  threats: Threat[],
  category: StrideCategory,
): Threat[] {
  return threats.filter((t) => t.strideCategory === category);
}

/**
 * Get threats by risk level
 */
export function getThreatsByRisk(threats: Threat[], risk: RiskLevel): Threat[] {
  return threats.filter((t) => t.risk === risk);
}

/**
 * Get unmitigated threats
 */
export function getUnmitigatedThreats(threats: Threat[]): Threat[] {
  return threats.filter(
    (t) => t.status === "not_addressed" || t.status === "partial",
  );
}

/**
 * Calculate threat statistics
 */
export function calculateThreatStats(threats: Threat[]): {
  total: number;
  byRisk: Record<RiskLevel, number>;
  byStatus: Record<MitigationStatus, number>;
  byCategory: Record<StrideCategory, number>;
} {
  const stats = {
    total: threats.length,
    byRisk: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    byStatus: {
      implemented: 0,
      partial: 0,
      planned: 0,
      not_addressed: 0,
    },
    byCategory: {
      spoofing: 0,
      tampering: 0,
      repudiation: 0,
      information_disclosure: 0,
      denial_of_service: 0,
      elevation_of_privilege: 0,
    },
  };

  for (const threat of threats) {
    stats.byRisk[threat.risk]++;
    stats.byStatus[threat.status]++;
    stats.byCategory[threat.strideCategory]++;
  }

  return stats;
}

/**
 * Generate threat ID
 */
export function generateThreatId(
  category: StrideCategory,
  index: number,
): string {
  const prefix = category.charAt(0).toUpperCase();
  return `${prefix}${index.toString().padStart(2, "0")}`;
}

/**
 * Get risk color for UI display
 */
export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case "critical":
      return "#dc2626"; // red-600
    case "high":
      return "#ea580c"; // orange-600
    case "medium":
      return "#ca8a04"; // yellow-600
    case "low":
      return "#16a34a"; // green-600
  }
}

/**
 * Get status color for UI display
 */
export function getStatusColor(status: MitigationStatus): string {
  switch (status) {
    case "implemented":
      return "#16a34a"; // green-600
    case "partial":
      return "#ca8a04"; // yellow-600
    case "planned":
      return "#2563eb"; // blue-600
    case "not_addressed":
      return "#dc2626"; // red-600
  }
}

// ============================================================================
// Re-exports for convenience
// All types are already exported at their definition points above
// ============================================================================
