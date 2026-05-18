/**
 * Finance Reconciliation
 *
 * Matches external payment records (Stripe, crypto) against internal ledger entries.
 * Detects discrepancies, timing differences, and missing entries.
 *
 * @module @/lib/billing/finance-reconciliation
 * @version 1.0.0
 */

import type { Currency } from "@/types/subscription.types";
import type {
  AnalyticsDateRange,
  LedgerEntry,
  LedgerSource,
  ReconciliationMatch,
  ReconciliationMatchStatus,
  ReconciliationSummary,
} from "./analytics-types";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default reconciliation tolerance in cents.
 * Small rounding differences (e.g., from currency conversion) are tolerated.
 */
export const DEFAULT_TOLERANCE_CENTS = 50; // $0.50

/**
 * Maximum timing difference in milliseconds for matching entries.
 * Entries within this window are considered potential matches.
 */
export const MAX_TIMING_DIFFERENCE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Entry Matching
// ============================================================================

/**
 * Match external and internal entries by external ID.
 */
export function matchByExternalId(
  externalEntries: LedgerEntry[],
  internalEntries: LedgerEntry[],
): ReconciliationMatch[] {
  const matches: ReconciliationMatch[] = [];
  const matchedInternalIds = new Set<string>();
  const matchedExternalIds = new Set<string>();
  let matchCounter = 0;

  // Build internal lookup by external ID
  const internalByExternalId = new Map<string, LedgerEntry[]>();
  for (const entry of internalEntries) {
    const existing = internalByExternalId.get(entry.externalId) || [];
    existing.push(entry);
    internalByExternalId.set(entry.externalId, existing);
  }

  // Match external entries to internal
  for (const external of externalEntries) {
    const internalMatches = internalByExternalId.get(external.externalId) || [];

    if (internalMatches.length === 0) {
      // Missing from internal
      matches.push({
        id: `match-${++matchCounter}`,
        externalEntry: external,
        internalEntry: null,
        status: "missing_internal",
        discrepancyAmount: external.amount,
        discrepancyReason: "No matching internal record found",
        withinTolerance: false,
        resolved: false,
        resolutionNotes: null,
      });
      matchedExternalIds.add(external.id);
    } else if (internalMatches.length === 1) {
      const internal = internalMatches[0];
      matchedInternalIds.add(internal.id);
      matchedExternalIds.add(external.id);

      const discrepancy = Math.abs(external.amount - internal.amount);
      const isAmountMatch = discrepancy === 0;
      const withinTolerance = discrepancy <= DEFAULT_TOLERANCE_CENTS;

      let status: ReconciliationMatchStatus;
      if (isAmountMatch) {
        status = "matched";
      } else if (withinTolerance) {
        status = "matched"; // Within tolerance counts as matched
      } else {
        status = "amount_mismatch";
      }

      // Check for timing difference
      const timeDiff = Math.abs(
        external.timestamp.getTime() - internal.timestamp.getTime(),
      );
      if (timeDiff > MAX_TIMING_DIFFERENCE_MS && status === "matched") {
        status = "timing_difference";
      }

      matches.push({
        id: `match-${++matchCounter}`,
        externalEntry: external,
        internalEntry: internal,
        status,
        discrepancyAmount: external.amount - internal.amount,
        discrepancyReason: !isAmountMatch
          ? `Amount difference: external=${external.amount}, internal=${internal.amount}`
          : null,
        withinTolerance,
        resolved: isAmountMatch,
        resolutionNotes: null,
      });
    } else {
      // Potential duplicate in internal records
      const internal = internalMatches[0];
      matchedInternalIds.add(internal.id);
      matchedExternalIds.add(external.id);

      matches.push({
        id: `match-${++matchCounter}`,
        externalEntry: external,
        internalEntry: internal,
        status: "duplicate",
        discrepancyAmount: 0,
        discrepancyReason: `Multiple internal records (${internalMatches.length}) found for external ID ${external.externalId}`,
        withinTolerance: true,
        resolved: false,
        resolutionNotes: null,
      });

      // Mark extra internal entries as duplicates
      for (let i = 1; i < internalMatches.length; i++) {
        matchedInternalIds.add(internalMatches[i].id);
        matches.push({
          id: `match-${++matchCounter}`,
          externalEntry: null,
          internalEntry: internalMatches[i],
          status: "duplicate",
          discrepancyAmount: internalMatches[i].amount,
          discrepancyReason: `Duplicate internal record for external ID ${external.externalId}`,
          withinTolerance: false,
          resolved: false,
          resolutionNotes: null,
        });
      }
    }
  }

  // Find internal entries with no external match
  for (const internal of internalEntries) {
    if (!matchedInternalIds.has(internal.id)) {
      matches.push({
        id: `match-${++matchCounter}`,
        externalEntry: null,
        internalEntry: internal,
        status: "missing_external",
        discrepancyAmount: -internal.amount,
        discrepancyReason: "No matching external record found",
        withinTolerance: false,
        resolved: false,
        resolutionNotes: null,
      });
    }
  }

  return matches;
}

/**
 * Match entries by amount and approximate timestamp when external IDs don't match.
 * This is a fuzzy matching algorithm for entries without clear external ID links.
 */
export function matchByAmountAndTime(
  unmatchedExternal: LedgerEntry[],
  unmatchedInternal: LedgerEntry[],
  toleranceCents: number = DEFAULT_TOLERANCE_CENTS,
  maxTimeDiffMs: number = MAX_TIMING_DIFFERENCE_MS,
): ReconciliationMatch[] {
  const matches: ReconciliationMatch[] = [];
  const matchedInternalIds = new Set<string>();
  let matchCounter = 0;

  for (const external of unmatchedExternal) {
    let bestMatch: LedgerEntry | null = null;
    let bestDiff = Infinity;

    for (const internal of unmatchedInternal) {
      if (matchedInternalIds.has(internal.id)) continue;

      const amountDiff = Math.abs(external.amount - internal.amount);
      const timeDiff = Math.abs(
        external.timestamp.getTime() - internal.timestamp.getTime(),
      );

      if (amountDiff <= toleranceCents && timeDiff <= maxTimeDiffMs) {
        const score = amountDiff + timeDiff / 1000; // Combined score
        if (score < bestDiff) {
          bestDiff = score;
          bestMatch = internal;
        }
      }
    }

    if (bestMatch) {
      matchedInternalIds.add(bestMatch.id);
      const discrepancy = external.amount - bestMatch.amount;

      matches.push({
        id: `fuzzy-match-${++matchCounter}`,
        externalEntry: external,
        internalEntry: bestMatch,
        status: discrepancy === 0 ? "matched" : "amount_mismatch",
        discrepancyAmount: discrepancy,
        discrepancyReason:
          discrepancy !== 0
            ? `Fuzzy match: amount difference of ${discrepancy} cents`
            : null,
        withinTolerance: Math.abs(discrepancy) <= toleranceCents,
        resolved: discrepancy === 0,
        resolutionNotes: null,
      });
    }
  }

  return matches;
}

// ============================================================================
// Reconciliation Summary
// ============================================================================

/**
 * Calculate reconciliation summary from matches.
 */
export function calculateReconciliationSummary(
  matches: ReconciliationMatch[],
  externalEntries: LedgerEntry[],
  internalEntries: LedgerEntry[],
  dateRange: AnalyticsDateRange,
  source: LedgerSource,
  toleranceCents: number = DEFAULT_TOLERANCE_CENTS,
): ReconciliationSummary {
  let matchedCount = 0;
  let mismatchedCount = 0;
  let missingInternalCount = 0;
  let missingExternalCount = 0;

  for (const match of matches) {
    switch (match.status) {
      case "matched":
      case "timing_difference":
        matchedCount++;
        break;
      case "amount_mismatch":
        mismatchedCount++;
        break;
      case "missing_internal":
        missingInternalCount++;
        break;
      case "missing_external":
        missingExternalCount++;
        break;
      case "duplicate":
        mismatchedCount++;
        break;
    }
  }

  const totalExternalAmount = externalEntries.reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const totalInternalAmount = internalEntries.reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const netDiscrepancy = totalExternalAmount - totalInternalAmount;
  const absoluteDiscrepancy = Math.abs(netDiscrepancy);

  const totalEntries = Math.max(externalEntries.length, internalEntries.length);
  const reconciliationRate =
    totalEntries > 0
      ? Math.round((matchedCount / totalEntries) * 10000) / 100
      : 100;

  const withinTolerance = absoluteDiscrepancy <= toleranceCents;

  return {
    dateRange,
    totalExternalEntries: externalEntries.length,
    totalInternalEntries: internalEntries.length,
    matchedCount,
    mismatchedCount,
    missingInternalCount,
    missingExternalCount,
    totalExternalAmount,
    totalInternalAmount,
    netDiscrepancy,
    absoluteDiscrepancy,
    reconciliationRate,
    withinTolerance,
    toleranceAmount: toleranceCents,
    matches,
    source,
    generatedAt: new Date(),
  };
}

// ============================================================================
// Complete Reconciliation
// ============================================================================

/**
 * Perform full reconciliation between external and internal ledgers.
 */
export function reconcile(
  externalEntries: LedgerEntry[],
  internalEntries: LedgerEntry[],
  dateRange: AnalyticsDateRange,
  source: LedgerSource,
  options: {
    toleranceCents?: number;
    useFuzzyMatching?: boolean;
    maxTimeDiffMs?: number;
  } = {},
): ReconciliationSummary {
  const {
    toleranceCents = DEFAULT_TOLERANCE_CENTS,
    useFuzzyMatching = true,
    maxTimeDiffMs = MAX_TIMING_DIFFERENCE_MS,
  } = options;

  // Filter entries to date range
  const filteredExternal = externalEntries.filter(
    (e) =>
      e.timestamp >= dateRange.startDate && e.timestamp <= dateRange.endDate,
  );
  const filteredInternal = internalEntries.filter(
    (e) =>
      e.timestamp >= dateRange.startDate && e.timestamp <= dateRange.endDate,
  );

  // Phase 1: Match by external ID
  let matches = matchByExternalId(filteredExternal, filteredInternal);

  // Phase 2: Fuzzy match remaining unmatched entries
  if (useFuzzyMatching) {
    const unmatchedExternal = filteredExternal.filter(
      (e) =>
        !matches.some(
          (m) =>
            m.externalEntry?.id === e.id && m.status !== "missing_internal",
        ),
    );
    const unmatchedInternal = filteredInternal.filter(
      (i) =>
        !matches.some(
          (m) =>
            m.internalEntry?.id === i.id && m.status !== "missing_external",
        ),
    );

    if (unmatchedExternal.length > 0 && unmatchedInternal.length > 0) {
      const fuzzyMatches = matchByAmountAndTime(
        unmatchedExternal,
        unmatchedInternal,
        toleranceCents,
        maxTimeDiffMs,
      );

      // Replace missing_internal/missing_external with fuzzy matches
      const fuzzyMatchedExternalIds = new Set(
        fuzzyMatches.map((m) => m.externalEntry?.id).filter(Boolean),
      );
      const fuzzyMatchedInternalIds = new Set(
        fuzzyMatches.map((m) => m.internalEntry?.id).filter(Boolean),
      );

      matches = matches.filter((m) => {
        if (
          m.status === "missing_internal" &&
          m.externalEntry &&
          fuzzyMatchedExternalIds.has(m.externalEntry.id)
        ) {
          return false;
        }
        if (
          m.status === "missing_external" &&
          m.internalEntry &&
          fuzzyMatchedInternalIds.has(m.internalEntry.id)
        ) {
          return false;
        }
        return true;
      });

      matches.push(...fuzzyMatches);
    }
  }

  return calculateReconciliationSummary(
    matches,
    filteredExternal,
    filteredInternal,
    dateRange,
    source,
    toleranceCents,
  );
}
