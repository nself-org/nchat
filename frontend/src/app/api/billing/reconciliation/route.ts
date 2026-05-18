/**
 * POST /api/billing/reconciliation
 *
 * Generate payment reconciliation report with security checks.
 * Integrates with PaymentSecurityService for ledger consistency,
 * orphan detection, and refund consistency validation.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripePaymentService } from "@/services/billing/stripe-payment.service";
import { getPaymentSecurityService } from "@/services/billing/payment-security.service";
import { logger } from "@/lib/logger";

const reconciliationSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeRefunds: z.boolean().optional(),
  includeDisputes: z.boolean().optional(),
  workspaceId: z.string().optional(),
  includeSecurityChecks: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = reconciliationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const {
      startDate,
      endDate,
      includeRefunds,
      includeDisputes,
      workspaceId,
      includeSecurityChecks,
    } = validation.data;

    const paymentService = getStripePaymentService();
    const report = await paymentService.generateReconciliationReport({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      includeRefunds,
      includeDisputes,
      workspaceId,
    });

    // Run security checks if requested
    let securityReport = null;
    if (includeSecurityChecks) {
      const securityService = getPaymentSecurityService();

      // Convert reconciliation entries to ledger entries for security analysis
      const internalEntries = report.entries
        .filter((e) => e.status === "matched" || e.status === "partial")
        .map((e) => ({
          id: e.id,
          paymentIntentId: e.stripePaymentIntentId,
          chargeId: e.stripeChargeId || undefined,
          subscriptionId: e.subscriptionId || undefined,
          workspaceId: e.workspaceId || "",
          amount: e.amount,
          currency: e.currency,
          type: "charge" as const,
          status: "settled" as const,
          externalAmount: e.amount + (e.discrepancy || 0),
          createdAt: e.stripeCreatedAt,
          settledAt: e.reconciledAt || undefined,
        }));

      const externalEntries = report.entries.map((e) => ({
        id: `ext_${e.id}`,
        paymentIntentId: e.stripePaymentIntentId,
        chargeId: e.stripeChargeId || undefined,
        subscriptionId: e.subscriptionId || undefined,
        workspaceId: e.workspaceId || "",
        amount: e.amount + (e.discrepancy || 0),
        currency: e.currency,
        type: "charge" as const,
        status: "settled" as const,
        createdAt: e.stripeCreatedAt,
      }));

      const reconciliationResult = securityService.reconcilePayments(
        internalEntries,
        externalEntries,
      );

      // Detect orphan payments
      const orphans = securityService.detectOrphanPayments(internalEntries);

      securityReport = {
        isConsistent: reconciliationResult.isConsistent,
        totalInternalAmount: reconciliationResult.totalInternalAmount,
        totalExternalAmount: reconciliationResult.totalExternalAmount,
        discrepancy: reconciliationResult.discrepancy,
        orphanPaymentCount: orphans.length,
        duplicateChargeCount: reconciliationResult.duplicateCharges.length,
        refundInconsistencyCount:
          reconciliationResult.refundInconsistencies.length,
        issueCount: reconciliationResult.issues.length,
        issues: reconciliationResult.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          severity: issue.severity,
        })),
      };
    }

    return NextResponse.json({
      success: true,
      report: {
        periodStart: report.periodStart.toISOString(),
        periodEnd: report.periodEnd.toISOString(),
        totalTransactions: report.totalTransactions,
        matchedCount: report.matchedCount,
        unmatchedCount: report.unmatchedCount,
        partialCount: report.partialCount,
        totalStripeAmount: report.totalStripeAmount,
        totalRecordedAmount: report.totalRecordedAmount,
        netDiscrepancy: report.netDiscrepancy,
        generatedAt: report.generatedAt.toISOString(),
        entries: report.entries.map((entry) => ({
          id: entry.id,
          stripePaymentIntentId: entry.stripePaymentIntentId,
          stripeChargeId: entry.stripeChargeId,
          workspaceId: entry.workspaceId,
          amount: entry.amount,
          currency: entry.currency,
          status: entry.status,
          stripeCreatedAt: entry.stripeCreatedAt.toISOString(),
          reconciledAt: entry.reconciledAt?.toISOString(),
          discrepancy: entry.discrepancy,
          discrepancyReason: entry.discrepancyReason,
        })),
      },
      ...(securityReport && { securityReport }),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    logger.error("Error generating reconciliation report:", error);
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 },
    );
  }
}
