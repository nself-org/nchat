/**
 * SOC 2 Compliance Helpers
 *
 * Utilities for Service Organization Control 2 (SOC 2) compliance.
 * Focuses on Trust Services Criteria: Security, Availability, Processing Integrity,
 * Confidentiality, and Privacy.
 */

// ============================================================================
// TRUST SERVICES CRITERIA
// ============================================================================

export const TRUST_SERVICES_CRITERIA = {
  SECURITY: {
    name: "Security",
    code: "CC",
    description: "Protection against unauthorized access to system resources.",
    categories: {
      CONTROL_ENVIRONMENT: "Control Environment (CC1)",
      COMMUNICATION: "Communication and Information (CC2)",
      RISK_ASSESSMENT: "Risk Assessment Process (CC3)",
      MONITORING: "Monitoring Activities (CC4)",
      CONTROL_ACTIVITIES: "Control Activities (CC5)",
      LOGICAL_ACCESS: "Logical and Physical Access Controls (CC6)",
      SYSTEM_OPERATIONS: "System Operations (CC7)",
      CHANGE_MANAGEMENT: "Change Management (CC8)",
      RISK_MITIGATION: "Risk Mitigation (CC9)",
    },
  },
  AVAILABILITY: {
    name: "Availability",
    code: "A",
    description: "System is available for operation and use as committed.",
    categories: {
      AVAILABILITY_COMMITMENT: "Availability Commitments (A1)",
    },
  },
  PROCESSING_INTEGRITY: {
    name: "Processing Integrity",
    code: "PI",
    description:
      "System processing is complete, valid, accurate, timely, and authorized.",
    categories: {
      PROCESSING_INTEGRITY: "Processing Integrity Commitments (PI1)",
    },
  },
  CONFIDENTIALITY: {
    name: "Confidentiality",
    code: "C",
    description: "Information designated as confidential is protected.",
    categories: {
      CONFIDENTIALITY_COMMITMENT: "Confidentiality Commitments (C1)",
    },
  },
  PRIVACY: {
    name: "Privacy",
    code: "P",
    description:
      "Personal information is collected, used, retained, disclosed, and disposed properly.",
    categories: {
      NOTICE: "Notice (P1)",
      CHOICE_CONSENT: "Choice and Consent (P2)",
      COLLECTION: "Collection (P3)",
      USE_RETENTION: "Use, Retention, and Disposal (P4)",
      ACCESS: "Access (P5)",
      DISCLOSURE: "Disclosure to Third Parties (P6)",
      QUALITY: "Quality (P7)",
      MONITORING: "Monitoring and Enforcement (P8)",
    },
  },
} as const;

export type TrustServicesCriterion = keyof typeof TRUST_SERVICES_CRITERIA;

// ============================================================================
// SOC 2 CONTROL OBJECTIVES
// ============================================================================

export interface SOC2ControlObjective {
  id: string;
  criterion: TrustServicesCriterion;
  category: string;
  name: string;
  description: string;
  type: "preventive" | "detective" | "corrective";
  frequency:
    | "continuous"
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "annually"
    | "ad_hoc";
  evidence: string[];
}

export const SOC2_CONTROL_OBJECTIVES: SOC2ControlObjective[] = [
  // Security - Control Environment
  {
    id: "CC1.1",
    criterion: "SECURITY",
    category: "Control Environment",
    name: "Integrity and Ethical Values",
    description:
      "The entity demonstrates commitment to integrity and ethical values",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Code of conduct", "Ethics policy", "Training records"],
  },
  {
    id: "CC1.2",
    criterion: "SECURITY",
    category: "Control Environment",
    name: "Board Independence and Oversight",
    description: "The board demonstrates independence and exercises oversight",
    type: "preventive",
    frequency: "quarterly",
    evidence: ["Board meeting minutes", "Oversight documentation"],
  },
  {
    id: "CC1.3",
    criterion: "SECURITY",
    category: "Control Environment",
    name: "Organizational Structure",
    description:
      "Management establishes structures, reporting lines, and authorities",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Org chart", "Role definitions", "Responsibility matrix"],
  },
  {
    id: "CC1.4",
    criterion: "SECURITY",
    category: "Control Environment",
    name: "Competence",
    description: "The entity demonstrates commitment to competence",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Job descriptions", "Training programs", "Performance reviews"],
  },
  {
    id: "CC1.5",
    criterion: "SECURITY",
    category: "Control Environment",
    name: "Accountability",
    description:
      "The entity holds individuals accountable for internal control responsibilities",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Performance metrics", "Accountability framework"],
  },

  // Security - Risk Assessment
  {
    id: "CC3.1",
    criterion: "SECURITY",
    category: "Risk Assessment",
    name: "Specify Objectives",
    description: "The entity specifies objectives with sufficient clarity",
    type: "preventive",
    frequency: "annually",
    evidence: ["Business objectives", "Control objectives"],
  },
  {
    id: "CC3.2",
    criterion: "SECURITY",
    category: "Risk Assessment",
    name: "Identify and Analyze Risk",
    description: "The entity identifies and analyzes risks",
    type: "detective",
    frequency: "quarterly",
    evidence: ["Risk assessments", "Risk register", "Threat analysis"],
  },
  {
    id: "CC3.3",
    criterion: "SECURITY",
    category: "Risk Assessment",
    name: "Assess Fraud Risk",
    description: "The entity considers potential for fraud",
    type: "detective",
    frequency: "annually",
    evidence: ["Fraud risk assessment", "Anti-fraud controls"],
  },
  {
    id: "CC3.4",
    criterion: "SECURITY",
    category: "Risk Assessment",
    name: "Identify and Analyze Changes",
    description:
      "The entity identifies and assesses changes that could impact controls",
    type: "detective",
    frequency: "quarterly",
    evidence: ["Change logs", "Impact assessments"],
  },

  // Security - Monitoring
  {
    id: "CC4.1",
    criterion: "SECURITY",
    category: "Monitoring",
    name: "Ongoing and Separate Evaluations",
    description:
      "The entity evaluates and communicates internal control deficiencies",
    type: "detective",
    frequency: "continuous",
    evidence: ["Internal audits", "Control testing", "Monitoring reports"],
  },
  {
    id: "CC4.2",
    criterion: "SECURITY",
    category: "Monitoring",
    name: "Evaluate and Communicate Deficiencies",
    description:
      "Internal control deficiencies are identified and communicated timely",
    type: "corrective",
    frequency: "continuous",
    evidence: ["Deficiency reports", "Remediation plans", "Communication logs"],
  },

  // Security - Logical Access
  {
    id: "CC6.1",
    criterion: "SECURITY",
    category: "Logical Access",
    name: "Access Controls",
    description:
      "Logical and physical access controls restrict access to authorized users",
    type: "preventive",
    frequency: "continuous",
    evidence: [
      "Access control policies",
      "User provisioning",
      "Authentication logs",
    ],
  },
  {
    id: "CC6.2",
    criterion: "SECURITY",
    category: "Logical Access",
    name: "User Authentication",
    description: "Users are authenticated prior to access",
    type: "preventive",
    frequency: "continuous",
    evidence: ["MFA implementation", "Password policies", "Auth logs"],
  },
  {
    id: "CC6.3",
    criterion: "SECURITY",
    category: "Logical Access",
    name: "Access Removal",
    description: "Access is removed when no longer authorized",
    type: "preventive",
    frequency: "continuous",
    evidence: [
      "Termination procedures",
      "Access reviews",
      "Deprovisioning logs",
    ],
  },

  // Security - System Operations
  {
    id: "CC7.1",
    criterion: "SECURITY",
    category: "System Operations",
    name: "System Capacity",
    description: "The entity monitors system capacity and performance",
    type: "detective",
    frequency: "continuous",
    evidence: ["Capacity monitoring", "Performance metrics", "Scaling plans"],
  },
  {
    id: "CC7.2",
    criterion: "SECURITY",
    category: "System Operations",
    name: "Malicious Software",
    description: "The entity implements controls to prevent malicious software",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Antivirus/antimalware", "Security scans", "Patch management"],
  },
  {
    id: "CC7.3",
    criterion: "SECURITY",
    category: "System Operations",
    name: "Backup and Recovery",
    description:
      "The entity maintains data backups and tests recovery procedures",
    type: "corrective",
    frequency: "daily",
    evidence: ["Backup procedures", "Recovery tests", "Backup logs"],
  },

  // Security - Change Management
  {
    id: "CC8.1",
    criterion: "SECURITY",
    category: "Change Management",
    name: "Change Authorization",
    description:
      "The entity authorizes, designs, develops, and tests system changes",
    type: "preventive",
    frequency: "continuous",
    evidence: [
      "Change requests",
      "Approvals",
      "Test results",
      "Deployment logs",
    ],
  },

  // Availability
  {
    id: "A1.1",
    criterion: "AVAILABILITY",
    category: "Availability",
    name: "Availability Commitments",
    description: "The entity maintains and monitors commitments and SLAs",
    type: "detective",
    frequency: "continuous",
    evidence: ["SLAs", "Uptime reports", "Incident logs"],
  },
  {
    id: "A1.2",
    criterion: "AVAILABILITY",
    category: "Availability",
    name: "Environmental Protections",
    description: "The entity protects systems from environmental factors",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Environmental controls", "Power backups", "Climate control"],
  },

  // Processing Integrity
  {
    id: "PI1.1",
    criterion: "PROCESSING_INTEGRITY",
    category: "Processing Integrity",
    name: "Processing Completeness",
    description:
      "Processing is complete, valid, accurate, timely, and authorized",
    type: "detective",
    frequency: "continuous",
    evidence: ["Data validation", "Error handling", "Transaction logs"],
  },
  {
    id: "PI1.2",
    criterion: "PROCESSING_INTEGRITY",
    category: "Processing Integrity",
    name: "Data Quality",
    description: "The entity maintains data quality throughout processing",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Data quality checks", "Reconciliations", "Audit trails"],
  },

  // Confidentiality
  {
    id: "C1.1",
    criterion: "CONFIDENTIALITY",
    category: "Confidentiality",
    name: "Confidential Information Protection",
    description: "Information designated as confidential is protected",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Data classification", "Encryption", "Access controls"],
  },
  {
    id: "C1.2",
    criterion: "CONFIDENTIALITY",
    category: "Confidentiality",
    name: "Confidential Data Disposal",
    description: "Confidential information is disposed of properly",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Disposal procedures", "Destruction logs", "Media sanitization"],
  },

  // Privacy
  {
    id: "P1.1",
    criterion: "PRIVACY",
    category: "Notice",
    name: "Privacy Notice",
    description: "The entity provides notice of privacy practices",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Privacy policy", "Notice delivery", "User acknowledgments"],
  },
  {
    id: "P2.1",
    criterion: "PRIVACY",
    category: "Choice and Consent",
    name: "User Choice and Consent",
    description: "The entity obtains informed consent for collection and use",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Consent forms", "Opt-in/out mechanisms", "Consent logs"],
  },
  {
    id: "P4.1",
    criterion: "PRIVACY",
    category: "Use, Retention, and Disposal",
    name: "Data Retention",
    description:
      "Personal information is retained and disposed per commitments",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Retention policies", "Deletion procedures", "Disposal logs"],
  },
  {
    id: "P5.1",
    criterion: "PRIVACY",
    category: "Access",
    name: "Data Subject Access",
    description: "Individuals can access and update their personal information",
    type: "preventive",
    frequency: "continuous",
    evidence: ["Access procedures", "Request logs", "Update mechanisms"],
  },
  {
    id: "P6.1",
    criterion: "PRIVACY",
    category: "Disclosure",
    name: "Third Party Disclosure",
    description:
      "Personal information is disclosed to third parties per commitments",
    type: "preventive",
    frequency: "continuous",
    evidence: [
      "Disclosure policies",
      "Third party agreements",
      "Disclosure logs",
    ],
  },
];

// ============================================================================
// SOC 2 COMPLIANCE DATA
// ============================================================================

export interface SOC2ComplianceData {
  // Organizational
  hasControlEnvironment: boolean;
  hasRiskAssessment: boolean;
  hasMonitoringProgram: boolean;

  // Security
  hasAccessControls: boolean;
  hasAuthenticationMFA: boolean;
  hasEncryption: boolean;
  hasChangeManagement: boolean;
  hasIncidentResponse: boolean;
  hasVulnerabilityManagement: boolean;

  // Availability
  hasBackupProcedures: boolean;
  hasDisasterRecovery: boolean;
  hasCapacityMonitoring: boolean;
  hasSLAMonitoring: boolean;

  // Processing Integrity
  hasDataValidation: boolean;
  hasErrorHandling: boolean;
  hasTransactionLogging: boolean;

  // Confidentiality
  hasDataClassification: boolean;
  hasConfidentialityControls: boolean;
  hasSecureDisposal: boolean;

  // Privacy
  hasPrivacyNotice: boolean;
  hasConsentManagement: boolean;
  hasDataRetentionPolicy: boolean;
  hasDataSubjectRights: boolean;
  hasThirdPartyManagement: boolean;

  // Documentation
  hasPolicies: boolean;
  hasProcedures: boolean;
  hasAuditTrails: boolean;
  hasVendorManagement: boolean;
}

export interface SOC2CheckResult {
  control: SOC2ControlObjective;
  implemented: boolean;
  evidence: string[];
  notes?: string;
}

export interface SOC2Assessment {
  overallScore: number;
  status: "compliant" | "at_risk" | "non_compliant";
  criteria: {
    security: number;
    availability?: number;
    processingIntegrity?: number;
    confidentiality?: number;
    privacy?: number;
  };
  checkResults: SOC2CheckResult[];
  summary: {
    implemented: number;
    notImplemented: number;
    total: number;
  };
  criticalGaps: string[];
  recommendations: string[];
  generatedAt: Date;
}

// ============================================================================
// SOC 2 ASSESSMENT
// ============================================================================

/**
 * Run SOC 2 compliance assessment
 */
export function runSOC2Assessment(data: SOC2ComplianceData): SOC2Assessment {
  const checkResults: SOC2CheckResult[] = [];

  // Map control objectives to data fields
  const controlImplementation: Record<string, boolean> = {
    // Security - Control Environment
    "CC1.1": data.hasControlEnvironment,
    "CC1.2": data.hasControlEnvironment,
    "CC1.3": data.hasControlEnvironment,
    "CC1.4": data.hasControlEnvironment,
    "CC1.5": data.hasControlEnvironment,
    // Security - Risk Assessment
    "CC3.1": data.hasRiskAssessment,
    "CC3.2": data.hasRiskAssessment,
    "CC3.3": data.hasRiskAssessment,
    "CC3.4": data.hasRiskAssessment,
    // Security - Monitoring
    "CC4.1": data.hasMonitoringProgram,
    "CC4.2": data.hasMonitoringProgram,
    // Security - Access Controls
    "CC6.1": data.hasAccessControls,
    "CC6.2": data.hasAuthenticationMFA,
    "CC6.3": data.hasAccessControls,
    // Security - System Operations
    "CC7.1": data.hasCapacityMonitoring,
    "CC7.2": data.hasVulnerabilityManagement,
    "CC7.3": data.hasBackupProcedures,
    // Security - Change Management
    "CC8.1": data.hasChangeManagement,
    // Availability
    "A1.1": data.hasSLAMonitoring,
    "A1.2": data.hasDisasterRecovery,
    // Processing Integrity
    "PI1.1": data.hasDataValidation && data.hasErrorHandling,
    "PI1.2": data.hasTransactionLogging,
    // Confidentiality
    "C1.1": data.hasDataClassification && data.hasEncryption,
    "C1.2": data.hasSecureDisposal,
    // Privacy
    "P1.1": data.hasPrivacyNotice,
    "P2.1": data.hasConsentManagement,
    "P4.1": data.hasDataRetentionPolicy,
    "P5.1": data.hasDataSubjectRights,
    "P6.1": data.hasThirdPartyManagement,
  };

  // Evaluate each control
  for (const control of SOC2_CONTROL_OBJECTIVES) {
    const implemented = controlImplementation[control.id] || false;
    checkResults.push({
      control,
      implemented,
      evidence: implemented ? control.evidence : [],
    });
  }

  // Calculate summary
  const summary = {
    implemented: checkResults.filter((r) => r.implemented).length,
    notImplemented: checkResults.filter((r) => !r.implemented).length,
    total: checkResults.length,
  };

  const overallScore = Math.round((summary.implemented / summary.total) * 100);

  // Calculate criterion-specific scores
  const criteriaScores = {
    security: calculateCriterionScore(checkResults, "SECURITY"),
    availability: calculateCriterionScore(checkResults, "AVAILABILITY"),
    processingIntegrity: calculateCriterionScore(
      checkResults,
      "PROCESSING_INTEGRITY",
    ),
    confidentiality: calculateCriterionScore(checkResults, "CONFIDENTIALITY"),
    privacy: calculateCriterionScore(checkResults, "PRIVACY"),
  };

  // Identify critical gaps
  const criticalGaps = checkResults
    .filter((r) => !r.implemented && r.control.type === "preventive")
    .map((r) => `${r.control.id}: ${r.control.name}`);

  // Generate recommendations
  const recommendations = checkResults
    .filter((r) => !r.implemented)
    .map(
      (r) =>
        `Implement ${r.control.name} (${r.control.id}): ${r.control.description}`,
    );

  // Determine status
  let status: SOC2Assessment["status"];
  if (overallScore >= 90) {
    status = "compliant";
  } else if (overallScore >= 70) {
    status = "at_risk";
  } else {
    status = "non_compliant";
  }

  return {
    overallScore,
    status,
    criteria: criteriaScores,
    checkResults,
    summary,
    criticalGaps,
    recommendations,
    generatedAt: new Date(),
  };
}

/**
 * Calculate score for specific criterion
 */
function calculateCriterionScore(
  results: SOC2CheckResult[],
  criterion: TrustServicesCriterion,
): number {
  const criterionResults = results.filter(
    (r) => r.control.criterion === criterion,
  );
  if (criterionResults.length === 0) return 0;

  const implemented = criterionResults.filter((r) => r.implemented).length;
  return Math.round((implemented / criterionResults.length) * 100);
}

// ============================================================================
// EVIDENCE COLLECTION
// ============================================================================

export interface EvidenceItem {
  controlId: string;
  evidenceType: string;
  description: string;
  collectedAt: Date;
  reviewer?: string;
  status: "collected" | "pending" | "insufficient";
  fileUrl?: string;
  notes?: string;
}

/**
 * Create evidence collection checklist
 */
export function createEvidenceChecklist(): Array<{
  controlId: string;
  evidenceRequired: string[];
}> {
  return SOC2_CONTROL_OBJECTIVES.map((control) => ({
    controlId: control.id,
    evidenceRequired: control.evidence,
  }));
}

// ============================================================================
// VENDOR MANAGEMENT
// ============================================================================

export interface VendorAssessment {
  vendorName: string;
  vendorType: string;
  dataShared: string[];
  hasSOC2Report: boolean;
  soc2ReportDate?: Date;
  soc2Type: "Type I" | "Type II" | "None";
  riskLevel: "low" | "medium" | "high" | "critical";
  reviewDate: Date;
  nextReviewDate: Date;
  notes?: string;
}

/**
 * Calculate vendor risk level
 */
export function calculateVendorRisk(vendor: {
  hasSOC2Report: boolean;
  dataShared: string[];
  soc2ReportDate?: Date;
}): VendorAssessment["riskLevel"] {
  if (!vendor.hasSOC2Report) {
    return vendor.dataShared.length > 0 ? "critical" : "high";
  }

  if (vendor.soc2ReportDate) {
    const monthsSinceReport =
      (Date.now() - vendor.soc2ReportDate.getTime()) /
      (1000 * 60 * 60 * 24 * 30);
    if (monthsSinceReport > 18) {
      return "high";
    }
  }

  if (vendor.dataShared.length > 3) {
    return "medium";
  }

  return "low";
}

// ============================================================================
// INCIDENT RESPONSE
// ============================================================================

export interface SecurityIncident {
  id: string;
  type:
    | "unauthorized_access"
    | "data_breach"
    | "system_outage"
    | "malware"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: Date;
  reportedBy: string;
  description: string;
  affectedSystems: string[];
  affectedData?: string[];
  containedAt?: Date;
  resolvedAt?: Date;
  rootCause?: string;
  remediationSteps: string[];
  status: "detected" | "contained" | "resolved" | "closed";
}

/**
 * Determine if incident requires SOC 2 reporting
 */
export function requiresSOC2Reporting(incident: SecurityIncident): boolean {
  // Critical incidents always require reporting
  if (incident.severity === "critical") {
    return true;
  }

  // Data breaches require reporting
  if (incident.type === "data_breach") {
    return true;
  }

  // System outages require reporting
  if (incident.type === "system_outage" && incident.severity === "high") {
    return true;
  }

  return false;
}

// ============================================================================
// READINESS ASSESSMENT
// ============================================================================

export interface SOC2ReadinessScore {
  readinessPercentage: number;
  estimatedTimeToCompliance: string;
  topPriorities: string[];
  quickWins: string[];
}

/**
 * Assess SOC 2 readiness
 */
export function assessSOC2Readiness(
  data: SOC2ComplianceData,
): SOC2ReadinessScore {
  const assessment = runSOC2Assessment(data);

  const quickWins = assessment.checkResults
    .filter((r) => !r.implemented && r.control.frequency === "continuous")
    .slice(0, 5)
    .map((r) => r.control.name);

  const topPriorities = assessment.criticalGaps.slice(0, 5);

  let estimatedTime: string;
  if (assessment.overallScore >= 80) {
    estimatedTime = "1-3 months";
  } else if (assessment.overallScore >= 60) {
    estimatedTime = "3-6 months";
  } else if (assessment.overallScore >= 40) {
    estimatedTime = "6-12 months";
  } else {
    estimatedTime = "12+ months";
  }

  return {
    readinessPercentage: assessment.overallScore,
    estimatedTimeToCompliance: estimatedTime,
    topPriorities,
    quickWins,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const SOC2Helpers = {
  TRUST_SERVICES_CRITERIA,
  SOC2_CONTROL_OBJECTIVES,
  runSOC2Assessment,
  createEvidenceChecklist,
  calculateVendorRisk,
  requiresSOC2Reporting,
  assessSOC2Readiness,
};
