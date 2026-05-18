/**
 * HIPAA Compliance Helpers
 *
 * Utilities for Health Insurance Portability and Accountability Act compliance.
 * Note: This is for informational purposes. Consult legal counsel for HIPAA compliance.
 */

// ============================================================================
// HIPAA RULES
// ============================================================================

export const HIPAA_RULES = {
  PRIVACY: {
    name: "Privacy Rule",
    description:
      "Establishes standards for protecting individuals' medical records and PHI.",
    requirements: [
      "Limit use and disclosure of PHI",
      "Provide individuals with rights over their PHI",
      "Implement administrative safeguards",
      "Train workforce members",
      "Designate a Privacy Officer",
    ],
  },
  SECURITY: {
    name: "Security Rule",
    description: "Establishes standards for protecting electronic PHI (ePHI).",
    requirements: [
      "Administrative safeguards",
      "Physical safeguards",
      "Technical safeguards",
      "Risk analysis and management",
      "Workforce training",
    ],
  },
  BREACH_NOTIFICATION: {
    name: "Breach Notification Rule",
    description: "Requires notification following a breach of unsecured PHI.",
    requirements: [
      "Notify affected individuals within 60 days",
      "Notify HHS for breaches",
      "Notify media for large breaches (500+)",
      "Document all breach investigations",
    ],
  },
  ENFORCEMENT: {
    name: "Enforcement Rule",
    description: "Establishes procedures for investigations and penalties.",
    requirements: [
      "Respond to HHS investigations",
      "Maintain compliance documentation",
      "Implement corrective actions",
    ],
  },
} as const;

export type HIPAARule = keyof typeof HIPAA_RULES;

// ============================================================================
// PROTECTED HEALTH INFORMATION (PHI)
// ============================================================================

export const PHI_IDENTIFIERS = [
  "Names",
  "Geographic data smaller than state",
  "All elements of dates (except year) related to an individual",
  "Phone numbers",
  "Fax numbers",
  "Email addresses",
  "Social Security numbers",
  "Medical record numbers",
  "Health plan beneficiary numbers",
  "Account numbers",
  "Certificate/license numbers",
  "Vehicle identifiers and serial numbers",
  "Device identifiers and serial numbers",
  "Web URLs",
  "IP addresses",
  "Biometric identifiers",
  "Full-face photographs",
  "Any other unique identifying number or code",
] as const;

// ============================================================================
// SAFEGUARDS
// ============================================================================

export const ADMINISTRATIVE_SAFEGUARDS = {
  SECURITY_MANAGEMENT: {
    name: "Security Management Process",
    standard: "164.308(a)(1)",
    specifications: [
      "Risk analysis (Required)",
      "Risk management (Required)",
      "Sanction policy (Required)",
      "Information system activity review (Required)",
    ],
  },
  WORKFORCE_SECURITY: {
    name: "Workforce Security",
    standard: "164.308(a)(3)",
    specifications: [
      "Authorization/supervision (Addressable)",
      "Workforce clearance procedure (Addressable)",
      "Termination procedures (Addressable)",
    ],
  },
  SECURITY_AWARENESS: {
    name: "Security Awareness and Training",
    standard: "164.308(a)(5)",
    specifications: [
      "Security reminders (Addressable)",
      "Protection from malicious software (Addressable)",
      "Log-in monitoring (Addressable)",
      "Password management (Addressable)",
    ],
  },
  SECURITY_INCIDENT: {
    name: "Security Incident Procedures",
    standard: "164.308(a)(6)",
    specifications: ["Response and reporting (Required)"],
  },
  CONTINGENCY_PLAN: {
    name: "Contingency Plan",
    standard: "164.308(a)(7)",
    specifications: [
      "Data backup plan (Required)",
      "Disaster recovery plan (Required)",
      "Emergency mode operation plan (Required)",
      "Testing and revision procedures (Addressable)",
      "Applications and data criticality analysis (Addressable)",
    ],
  },
} as const;

export const PHYSICAL_SAFEGUARDS = {
  FACILITY_ACCESS: {
    name: "Facility Access Controls",
    standard: "164.310(a)",
    specifications: [
      "Contingency operations (Addressable)",
      "Facility security plan (Addressable)",
      "Access control and validation (Addressable)",
      "Maintenance records (Addressable)",
    ],
  },
  WORKSTATION_USE: {
    name: "Workstation Use",
    standard: "164.310(b)",
    specifications: ["Workstation use policies (Required)"],
  },
  WORKSTATION_SECURITY: {
    name: "Workstation Security",
    standard: "164.310(c)",
    specifications: ["Physical safeguards for workstations (Required)"],
  },
  DEVICE_MEDIA: {
    name: "Device and Media Controls",
    standard: "164.310(d)",
    specifications: [
      "Disposal (Required)",
      "Media re-use (Required)",
      "Accountability (Addressable)",
      "Data backup and storage (Addressable)",
    ],
  },
} as const;

export const TECHNICAL_SAFEGUARDS = {
  ACCESS_CONTROL: {
    name: "Access Control",
    standard: "164.312(a)",
    specifications: [
      "Unique user identification (Required)",
      "Emergency access procedure (Required)",
      "Automatic logoff (Addressable)",
      "Encryption and decryption (Addressable)",
    ],
  },
  AUDIT_CONTROLS: {
    name: "Audit Controls",
    standard: "164.312(b)",
    specifications: [
      "Hardware, software, and procedural mechanisms (Required)",
    ],
  },
  INTEGRITY: {
    name: "Integrity",
    standard: "164.312(c)",
    specifications: ["Mechanism to authenticate ePHI (Addressable)"],
  },
  AUTHENTICATION: {
    name: "Person or Entity Authentication",
    standard: "164.312(d)",
    specifications: [
      "Verify identity of accessing persons/entities (Required)",
    ],
  },
  TRANSMISSION_SECURITY: {
    name: "Transmission Security",
    standard: "164.312(e)",
    specifications: [
      "Integrity controls (Addressable)",
      "Encryption (Addressable)",
    ],
  },
} as const;

// ============================================================================
// HIPAA COMPLIANCE CHECKS
// ============================================================================

export interface HIPAAComplianceCheck {
  id: string;
  name: string;
  safeguard: "administrative" | "physical" | "technical" | "organizational";
  requirement: "required" | "addressable";
  description: string;
}

export interface HIPAAComplianceData {
  isHealthcareEntity: boolean;
  handlesPHI: boolean;
  hasBAA: boolean; // Business Associate Agreement
  hasPrivacyOfficer: boolean;
  hasSecurityOfficer: boolean;
  hasRiskAnalysis: boolean;
  hasTrainingProgram: boolean;
  hasIncidentPlan: boolean;
  hasContingencyPlan: boolean;
  hasAccessControls: boolean;
  hasAuditControls: boolean;
  hasEncryption: boolean;
  hasPhysicalSafeguards: boolean;
  documentationComplete: boolean;
}

export interface HIPAACheckResult {
  passed: boolean;
  status: "compliant" | "non_compliant" | "partial" | "not_applicable";
  message: string;
  recommendations?: string[];
}

export const HIPAA_COMPLIANCE_CHECKS: HIPAAComplianceCheck[] = [
  {
    id: "privacy_officer",
    name: "Privacy Officer Designation",
    safeguard: "administrative",
    requirement: "required",
    description:
      "Designate a Privacy Officer responsible for policy development",
  },
  {
    id: "security_officer",
    name: "Security Officer Designation",
    safeguard: "administrative",
    requirement: "required",
    description:
      "Designate a Security Officer responsible for security measures",
  },
  {
    id: "risk_analysis",
    name: "Risk Analysis",
    safeguard: "administrative",
    requirement: "required",
    description: "Conduct thorough risk analysis of ePHI handling",
  },
  {
    id: "training_program",
    name: "Workforce Training",
    safeguard: "administrative",
    requirement: "required",
    description:
      "Implement security awareness training for all workforce members",
  },
  {
    id: "incident_procedures",
    name: "Incident Response Procedures",
    safeguard: "administrative",
    requirement: "required",
    description: "Establish security incident procedures",
  },
  {
    id: "contingency_plan",
    name: "Contingency Plan",
    safeguard: "administrative",
    requirement: "required",
    description: "Develop data backup and disaster recovery plans",
  },
  {
    id: "access_controls",
    name: "Access Controls",
    safeguard: "technical",
    requirement: "required",
    description: "Implement technical policies for electronic access",
  },
  {
    id: "audit_controls",
    name: "Audit Controls",
    safeguard: "technical",
    requirement: "required",
    description: "Implement mechanisms to record and examine ePHI access",
  },
  {
    id: "encryption",
    name: "Encryption",
    safeguard: "technical",
    requirement: "addressable",
    description: "Implement encryption for ePHI at rest and in transit",
  },
  {
    id: "physical_safeguards",
    name: "Physical Safeguards",
    safeguard: "physical",
    requirement: "required",
    description: "Implement physical measures to protect systems",
  },
  {
    id: "baa",
    name: "Business Associate Agreements",
    safeguard: "organizational",
    requirement: "required",
    description: "Execute BAAs with all business associates",
  },
  {
    id: "documentation",
    name: "Documentation",
    safeguard: "administrative",
    requirement: "required",
    description: "Maintain required policies, procedures, and documentation",
  },
];

// ============================================================================
// HIPAA ASSESSMENT
// ============================================================================

export interface HIPAAAssessment {
  overallScore: number;
  applies: boolean;
  status: "compliant" | "at_risk" | "non_compliant";
  checkResults: Array<{
    check: HIPAAComplianceCheck;
    passed: boolean;
    notes?: string;
  }>;
  summary: {
    compliant: number;
    nonCompliant: number;
    partial: number;
    notApplicable: number;
  };
  criticalGaps: string[];
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Run HIPAA compliance assessment
 */
export function runHIPAAAssessment(data: HIPAAComplianceData): HIPAAAssessment {
  // Check if HIPAA applies
  const applies = data.isHealthcareEntity || data.handlesPHI;

  if (!applies) {
    return {
      overallScore: 100,
      applies: false,
      status: "compliant",
      checkResults: [],
      summary: {
        compliant: 0,
        nonCompliant: 0,
        partial: 0,
        notApplicable: HIPAA_COMPLIANCE_CHECKS.length,
      },
      criticalGaps: [],
      recommendations: [],
      generatedAt: new Date(),
    };
  }

  const checkResults: HIPAAAssessment["checkResults"] = [];

  // Evaluate each check
  const evaluations: Record<string, boolean> = {
    privacy_officer: data.hasPrivacyOfficer,
    security_officer: data.hasSecurityOfficer,
    risk_analysis: data.hasRiskAnalysis,
    training_program: data.hasTrainingProgram,
    incident_procedures: data.hasIncidentPlan,
    contingency_plan: data.hasContingencyPlan,
    access_controls: data.hasAccessControls,
    audit_controls: data.hasAuditControls,
    encryption: data.hasEncryption,
    physical_safeguards: data.hasPhysicalSafeguards,
    baa: data.hasBAA,
    documentation: data.documentationComplete,
  };

  for (const check of HIPAA_COMPLIANCE_CHECKS) {
    checkResults.push({
      check,
      passed: evaluations[check.id] || false,
    });
  }

  const summary = {
    compliant: checkResults.filter((r) => r.passed).length,
    nonCompliant: checkResults.filter((r) => !r.passed).length,
    partial: 0,
    notApplicable: 0,
  };

  const overallScore = Math.round(
    (summary.compliant / checkResults.length) * 100,
  );

  const criticalGaps = checkResults
    .filter((r) => !r.passed && r.check.requirement === "required")
    .map((r) => r.check.name);

  const recommendations = checkResults
    .filter((r) => !r.passed)
    .map((r) => `Implement ${r.check.name}: ${r.check.description}`);

  let status: HIPAAAssessment["status"];
  if (summary.nonCompliant === 0) {
    status = "compliant";
  } else if (criticalGaps.length <= 2) {
    status = "at_risk";
  } else {
    status = "non_compliant";
  }

  return {
    overallScore,
    applies,
    status,
    checkResults,
    summary,
    criticalGaps,
    recommendations,
    generatedAt: new Date(),
  };
}

// ============================================================================
// BREACH ASSESSMENT
// ============================================================================

export interface BreachAssessment {
  isBreach: boolean;
  requiresNotification: boolean;
  notificationDeadline?: Date;
  affectedIndividuals: number;
  requiresMediaNotification: boolean;
  factors: string[];
}

/**
 * Assess if an incident constitutes a HIPAA breach
 */
export function assessBreach(incident: {
  involvesPHI: boolean;
  isUnsecured: boolean;
  affectedCount: number;
  discoveryDate: Date;
  accessType: "acquisition" | "access" | "use" | "disclosure";
  probability: "low" | "moderate" | "high";
}): BreachAssessment {
  const factors: string[] = [];

  // Not a breach if PHI was secured (encrypted)
  if (incident.involvesPHI && incident.isUnsecured) {
    factors.push("Unsecured PHI was involved");
  }

  const isBreach = incident.involvesPHI && incident.isUnsecured;

  // Low probability exception
  if (incident.probability === "low") {
    factors.push("Low probability of compromise based on risk assessment");
  }

  const requiresNotification = isBreach && incident.probability !== "low";

  // Calculate deadline (60 days from discovery)
  let notificationDeadline: Date | undefined;
  if (requiresNotification) {
    notificationDeadline = new Date(incident.discoveryDate);
    notificationDeadline.setDate(notificationDeadline.getDate() + 60);
    factors.push(
      `Notification deadline: ${notificationDeadline.toLocaleDateString()}`,
    );
  }

  // Media notification required for 500+ individuals
  const requiresMediaNotification =
    requiresNotification && incident.affectedCount >= 500;
  if (requiresMediaNotification) {
    factors.push("Media notification required (500+ individuals affected)");
  }

  return {
    isBreach,
    requiresNotification,
    notificationDeadline,
    affectedIndividuals: incident.affectedCount,
    requiresMediaNotification,
    factors,
  };
}

// ============================================================================
// BUSINESS ASSOCIATE AGREEMENT
// ============================================================================

export interface BAARequirements {
  purpose: string;
  permittedUses: string[];
  safeguardRequirements: string[];
  reportingRequirements: string[];
  terminationConditions: string[];
}

/**
 * Get BAA requirements template
 */
export function getBAARequirements(): BAARequirements {
  return {
    purpose:
      "Establish the responsibilities of the Business Associate in protecting PHI",
    permittedUses: [
      "Use PHI only as permitted by agreement",
      "Use PHI only for purposes stated in agreement",
      "Not use or disclose PHI in violation of HIPAA",
    ],
    safeguardRequirements: [
      "Implement appropriate safeguards",
      "Report security incidents",
      "Ensure subcontractors agree to same restrictions",
      "Make PHI available to satisfy individual access rights",
      "Make PHI available for amendment",
      "Document disclosures",
    ],
    reportingRequirements: [
      "Report unauthorized uses or disclosures",
      "Report security incidents",
      "Report breaches of unsecured PHI",
    ],
    terminationConditions: [
      "Material breach of agreement",
      "Violation of HIPAA requirements",
      "Return or destroy PHI upon termination",
    ],
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const HIPAAHelpers = {
  HIPAA_RULES,
  PHI_IDENTIFIERS,
  ADMINISTRATIVE_SAFEGUARDS,
  PHYSICAL_SAFEGUARDS,
  TECHNICAL_SAFEGUARDS,
  HIPAA_COMPLIANCE_CHECKS,
  runHIPAAAssessment,
  assessBreach,
  getBAARequirements,
};
