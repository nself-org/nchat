"use client";

/**
 * AuditLogExport - Export audit logs in various formats
 */

import { useState } from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Calendar,
  Check,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import type {
  AuditLogEntry,
  ExportFormat,
  AuditLogFilters,
} from "@/lib/audit/audit-types";
import {
  exportAndDownloadAuditLogs,
  defaultExportTemplates,
} from "@/lib/audit/audit-export";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface AuditLogExportProps {
  entries: AuditLogEntry[];
  filters?: AuditLogFilters;
  open: boolean;
  onClose: () => void;
  onExportComplete?: (filename: string, recordCount: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AuditLogExport({
  entries,
  filters,
  open,
  onClose,
  onExportComplete,
}: AuditLogExportProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [useFilters, setUseFilters] = useState(true);
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportResult, setExportResult] = useState<{
    filename: string;
    recordCount: number;
  } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);

    try {
      const exportOptions = {
        format,
        includeMetadata,
        filters: useFilters ? filters : undefined,
        dateRange:
          useDateRange && startDate && endDate
            ? {
                start: new Date(startDate),
                end: new Date(endDate),
              }
            : undefined,
      };

      const result = await exportAndDownloadAuditLogs(entries, exportOptions);

      setExportResult({
        filename: result.filename,
        recordCount: result.recordCount,
      });
      setExportComplete(true);

      if (onExportComplete) {
        onExportComplete(result.filename, result.recordCount);
      }
    } catch (error) {
      logger.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setExportComplete(false);
    setExportResult(null);
    onClose();
  };

  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    csv: <FileSpreadsheet className="h-5 w-5" />,
    json: <FileJson className="h-5 w-5" />,
    xlsx: <FileSpreadsheet className="h-5 w-5" />,
  };

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Audit Logs
          </AlertDialogTitle>
          <AlertDialogDescription>
            {exportComplete
              ? "Export completed successfully!"
              : `Export ${entries.length} audit log entries to a file.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {exportComplete && exportResult ? (
          <div className="py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="font-medium">{exportResult.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {exportResult.recordCount} records exported
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["csv", "json"] as ExportFormat[]).map((f) => (
                  <Button
                    key={f}
                    variant={format === f ? "default" : "outline"}
                    className="flex h-auto flex-col gap-1 py-3"
                    onClick={() => setFormat(f)}
                  >
                    {formatIcons[f]}
                    <span className="text-xs uppercase">{f}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="space-y-2">
              <Label>Quick Templates</Label>
              <Select
                onValueChange={(templateId) => {
                  const template = defaultExportTemplates.find(
                    (t) => t.id === templateId,
                  );
                  if (template) {
                    setFormat(template.format);
                    setIncludeMetadata(template.includeMetadata);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {defaultExportTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {template.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-metadata" className="cursor-pointer">
                  Include metadata
                </Label>
                <Switch
                  id="include-metadata"
                  checked={includeMetadata}
                  onCheckedChange={setIncludeMetadata}
                />
              </div>

              {filters && Object.keys(filters).length > 0 && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-filters" className="cursor-pointer">
                    Apply current filters
                  </Label>
                  <Switch
                    id="use-filters"
                    checked={useFilters}
                    onCheckedChange={setUseFilters}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="use-date-range" className="cursor-pointer">
                  Custom date range
                </Label>
                <Switch
                  id="use-date-range"
                  checked={useDateRange}
                  onCheckedChange={setUseDateRange}
                />
              </div>
            </div>

            {/* Date Range */}
            {useDateRange && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="start-date"
                    className="flex items-center gap-1"
                  >
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">
                Export will include{" "}
                <strong>
                  {useFilters && filters ? "filtered" : "all"} {entries.length}
                </strong>{" "}
                records as <strong className="uppercase">{format}</strong>
                {includeMetadata ? " with full metadata" : ""}.
              </p>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>
            {exportComplete ? "Done" : "Cancel"}
          </AlertDialogCancel>
          {!exportComplete && (
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
