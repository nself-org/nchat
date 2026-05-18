/**
 * Compliance Reports API
 *
 * Generate compliance reports for GDPR, HIPAA, SOC 2, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { GDPRHelpers } from "@/lib/compliance/gdpr-helpers";
import { HIPAAHelpers } from "@/lib/compliance/hipaa-helpers";
import { SOC2Helpers } from "@/lib/compliance/soc2-helpers";
import type {
  GDPRComplianceData,
  GDPRAssessment,
} from "@/lib/compliance/gdpr-helpers";
import type {
  HIPAAComplianceData,
  HIPAAAssessment,
} from "@/lib/compliance/hipaa-helpers";
import type {
  SOC2ComplianceData,
  SOC2Assessment,
} from "@/lib/compliance/soc2-helpers";

import { logger } from "@/lib/logger";

/**
 * GET /api/compliance/reports?type=<reportType>
 * Generate compliance assessment report
 */
export async function GET(request: NextRequest) {
  try {
    const reportType = request.nextUrl.searchParams.get("type");

    if (!reportType) {
      return NextResponse.json(
        { success: false, error: "Report type is required" },
        { status: 400 },
      );
    }

    // This is mock data for demonstration
    switch (reportType) {
      case "gdpr":
        return await generateGDPRReport();

      case "hipaa":
        return await generateHIPAAReport();

      case "soc2":
        return await generateSOC2Report();

      case "overview":
        return await generateOverviewReport();

      default:
        return NextResponse.json(
          { success: false, error: "Invalid report type" },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Error generating report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate report",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Generate GDPR compliance report
 */
async function generateGDPRReport() {
  const complianceData: GDPRComplianceData = {
    consents: [],
    exportRequests: [],
    deletionRequests: [],
    privacySettings: null,
    auditLogs: [],
    hasPrivacyPolicy: true,
    hasDPO: false,
    hasBreachProcedure: true,
    hasDataProcessingRecords: true,
  };

  const assessment: GDPRAssessment =
    GDPRHelpers.runGDPRAssessment(complianceData);
  const report = GDPRHelpers.generateGDPRReport(assessment);

  return NextResponse.json({
    success: true,
    reportType: "gdpr",
    assessment,
    report,
    generatedAt: new Date().toISOString(),
  });
}

/**
 * Generate HIPAA compliance report
 */
async function generateHIPAAReport() {
  const complianceData: HIPAAComplianceData = {
    isHealthcareEntity: false,
    handlesPHI: false,
    hasBAA: false,
    hasPrivacyOfficer: false,
    hasSecurityOfficer: false,
    hasRiskAnalysis: false,
    hasTrainingProgram: false,
    hasIncidentPlan: true,
    hasContingencyPlan: false,
    hasAccessControls: true,
    hasAuditControls: true,
    hasEncryption: true,
    hasPhysicalSafeguards: false,
    documentationComplete: false,
  };

  const assessment: HIPAAAssessment =
    HIPAAHelpers.runHIPAAAssessment(complianceData);

  return NextResponse.json({
    success: true,
    reportType: "hipaa",
    assessment,
    applies: assessment.applies,
    generatedAt: new Date().toISOString(),
    message: assessment.applies
      ? undefined
      : "HIPAA does not apply to this organization",
  });
}

/**
 * Generate SOC 2 compliance report
 */
async function generateSOC2Report() {
  const complianceData: SOC2ComplianceData = {
    // Organizational
    hasControlEnvironment: true,
    hasRiskAssessment: true,
    hasMonitoringProgram: true,
    // Security
    hasAccessControls: true,
    hasAuthenticationMFA: true,
    hasEncryption: true,
    hasChangeManagement: true,
    hasIncidentResponse: true,
    hasVulnerabilityManagement: true,
    // Availability
    hasBackupProcedures: true,
    hasDisasterRecovery: false,
    hasCapacityMonitoring: true,
    hasSLAMonitoring: false,
    // Processing Integrity
    hasDataValidation: true,
    hasErrorHandling: true,
    hasTransactionLogging: true,
    // Confidentiality
    hasDataClassification: false,
    hasConfidentialityControls: true,
    hasSecureDisposal: false,
    // Privacy
    hasPrivacyNotice: true,
    hasConsentManagement: true,
    hasDataRetentionPolicy: false,
    hasDataSubjectRights: true,
    hasThirdPartyManagement: false,
    // Documentation
    hasPolicies: true,
    hasProcedures: true,
    hasAuditTrails: true,
    hasVendorManagement: false,
  };

  const assessment: SOC2Assessment =
    SOC2Helpers.runSOC2Assessment(complianceData);
  const readiness = SOC2Helpers.assessSOC2Readiness(complianceData);

  return NextResponse.json({
    success: true,
    reportType: "soc2",
    assessment,
    readiness,
    generatedAt: new Date().toISOString(),
  });
}

/**
 * Generate compliance overview report
 */
async function generateOverviewReport() {
  // Generate all reports
  const gdprData: GDPRComplianceData = {
    consents: [],
    exportRequests: [],
    deletionRequests: [],
    privacySettings: null,
    auditLogs: [],
    hasPrivacyPolicy: true,
    hasDPO: false,
    hasBreachProcedure: true,
    hasDataProcessingRecords: true,
  };

  const hipaaData: HIPAAComplianceData = {
    isHealthcareEntity: false,
    handlesPHI: false,
    hasBAA: false,
    hasPrivacyOfficer: false,
    hasSecurityOfficer: false,
    hasRiskAnalysis: false,
    hasTrainingProgram: false,
    hasIncidentPlan: true,
    hasContingencyPlan: false,
    hasAccessControls: true,
    hasAuditControls: true,
    hasEncryption: true,
    hasPhysicalSafeguards: false,
    documentationComplete: false,
  };

  const soc2Data: SOC2ComplianceData = {
    hasControlEnvironment: true,
    hasRiskAssessment: true,
    hasMonitoringProgram: true,
    hasAccessControls: true,
    hasAuthenticationMFA: true,
    hasEncryption: true,
    hasChangeManagement: true,
    hasIncidentResponse: true,
    hasVulnerabilityManagement: true,
    hasBackupProcedures: true,
    hasDisasterRecovery: false,
    hasCapacityMonitoring: true,
    hasSLAMonitoring: false,
    hasDataValidation: true,
    hasErrorHandling: true,
    hasTransactionLogging: true,
    hasDataClassification: false,
    hasConfidentialityControls: true,
    hasSecureDisposal: false,
    hasPrivacyNotice: true,
    hasConsentManagement: true,
    hasDataRetentionPolicy: false,
    hasDataSubjectRights: true,
    hasThirdPartyManagement: false,
    hasPolicies: true,
    hasProcedures: true,
    hasAuditTrails: true,
    hasVendorManagement: false,
  };

  const gdprAssessment = GDPRHelpers.runGDPRAssessment(gdprData);
  const hipaaAssessment = HIPAAHelpers.runHIPAAAssessment(hipaaData);
  const soc2Assessment = SOC2Helpers.runSOC2Assessment(soc2Data);

  return NextResponse.json({
    success: true,
    reportType: "overview",
    assessments: {
      gdpr: {
        score: gdprAssessment.overallScore,
        status: gdprAssessment.status,
        criticalIssues: gdprAssessment.criticalIssues.length,
      },
      hipaa: {
        score: hipaaAssessment.overallScore,
        status: hipaaAssessment.status,
        applies: hipaaAssessment.applies,
        criticalGaps: hipaaAssessment.criticalGaps.length,
      },
      soc2: {
        score: soc2Assessment.overallScore,
        status: soc2Assessment.status,
        criticalGaps: soc2Assessment.criticalGaps.length,
      },
    },
    summary: {
      overallCompliance: Math.round(
        (gdprAssessment.overallScore +
          (hipaaAssessment.applies ? hipaaAssessment.overallScore : 100) +
          soc2Assessment.overallScore) /
          3,
      ),
      standardsTracked: 3,
      standardsCompliant: [
        gdprAssessment.status === "compliant" ? 1 : 0,
        hipaaAssessment.status === "compliant" || !hipaaAssessment.applies
          ? 1
          : 0,
        soc2Assessment.status === "compliant" ? 1 : 0,
      ].reduce((a, b) => a + b, 0),
    },
    generatedAt: new Date().toISOString(),
  });
}
