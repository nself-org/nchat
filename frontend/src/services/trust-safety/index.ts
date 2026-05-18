/**
 * Trust & Safety Services
 *
 * Exports all trust and safety related services for evidence management,
 * legal holds, and evidence export.
 */

// Evidence Collector
export {
  EvidenceCollectorService,
  getEvidenceCollector,
  createEvidenceCollector,
  type EvidenceCollectorConfig,
  DEFAULT_COLLECTOR_CONFIG,
} from "./evidence-collector.service";

// Legal Hold
export {
  LegalHoldService,
  getLegalHoldService,
  createLegalHoldService,
  type LegalHoldConfig,
  DEFAULT_LEGAL_HOLD_CONFIG,
} from "./legal-hold.service";

// Evidence Export
export {
  EvidenceExportService,
  getEvidenceExportService,
  createEvidenceExportService,
  type EvidenceExportConfig,
  DEFAULT_EXPORT_CONFIG,
} from "./evidence-export.service";
