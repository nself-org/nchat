"use client";

/**
 * Data Export & Backup Component
 *
 * GDPR-compliant data export interface with background processing.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  Calendar,
  Folder,
  MessageSquare,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ExportOptions,
  ExportRequest,
  ExportFormat,
  ExportScope,
} from "@/lib/export/types";

import { logger } from "@/lib/logger";

interface ExportHistoryItem {
  id: string;
  status: ExportRequest["status"];
  format: ExportFormat;
  scope: ExportScope;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  progress?: number;
  itemsProcessed?: number;
  itemsTotal?: number;
  errorMessage?: string;
}

export function DataExport() {
  const { user } = useAuth();

  // Export options state
  const [scope, setScope] = useState<ExportScope>("all_messages");
  const [format, setFormat] = useState<ExportFormat>("json");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [includeFiles, setIncludeFiles] = useState(true);
  const [includeReactions, setIncludeReactions] = useState(true);
  const [includeThreads, setIncludeThreads] = useState(true);
  const [includeEdits, setIncludeEdits] = useState(false);
  const [anonymize, setAnonymize] = useState(false);

  // UI state
  const [isCreatingExport, setIsCreatingExport] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [activeExports, setActiveExports] = useState<Set<string>>(new Set());

  // Load export history on mount
  useEffect(() => {
    loadExportHistory();
  }, []);

  // Poll active exports for status updates
  useEffect(() => {
    if (activeExports.size === 0) return;

    const interval = setInterval(() => {
      activeExports.forEach((exportId) => {
        checkExportStatus(exportId);
      });
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [activeExports]);

  const loadExportHistory = useCallback(() => {
    // Load from localStorage (in production, fetch from API)
    const saved = localStorage.getItem("export-history");
    if (saved) {
      const history = JSON.parse(saved) as ExportHistoryItem[];
      setExportHistory(
        history.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          completedAt: item.completedAt
            ? new Date(item.completedAt)
            : undefined,
          expiresAt: new Date(item.expiresAt),
        })),
      );

      // Mark processing exports as active
      const active = new Set(
        history
          .filter(
            (item) => item.status === "pending" || item.status === "processing",
          )
          .map((item) => item.id),
      );
      setActiveExports(active);
    }
  }, []);

  const saveExportHistory = useCallback((history: ExportHistoryItem[]) => {
    localStorage.setItem("export-history", JSON.stringify(history));
    setExportHistory(history);
  }, []);

  const checkExportStatus = async (exportId: string) => {
    try {
      const response = await fetch(`/api/export?id=${exportId}&action=status`);
      const data = await response.json();

      if (data.success) {
        const updatedExport = data.export as ExportRequest;

        // Update history
        setExportHistory((prev) => {
          const updated = prev.map((item) =>
            item.id === exportId
              ? {
                  ...item,
                  status: updatedExport.status,
                  progress: updatedExport.progress,
                  itemsProcessed: updatedExport.itemsProcessed,
                  itemsTotal: updatedExport.itemsTotal,
                  completedAt: updatedExport.completedAt
                    ? new Date(updatedExport.completedAt)
                    : undefined,
                  downloadUrl: updatedExport.downloadUrl,
                  fileName: updatedExport.fileName,
                  fileSize: updatedExport.fileSize,
                  errorMessage: updatedExport.errorMessage,
                }
              : item,
          );

          // Save to localStorage
          localStorage.setItem("export-history", JSON.stringify(updated));

          return updated;
        });

        // Remove from active if completed/failed/cancelled
        if (
          updatedExport.status === "completed" ||
          updatedExport.status === "failed" ||
          updatedExport.status === "cancelled"
        ) {
          setActiveExports((prev) => {
            const next = new Set(prev);
            next.delete(exportId);
            return next;
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to check export status:`, error);
    }
  };

  const handleCreateExport = async () => {
    if (!user) return;

    setIsCreatingExport(true);

    try {
      const options: ExportOptions = {
        scope,
        format,
        fromDate: fromDate ? new Date(fromDate) : null,
        toDate: toDate ? new Date(toDate) : null,
        includeFiles,
        includeReactions,
        includeThreads,
        includeEdits,
        anonymize,
        includeUserData: true,
        includeChannelData: true,
        includeMetadata: true,
      };

      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options, userId: user.id }),
      });

      const data = await response.json();

      if (data.success) {
        const newExport: ExportHistoryItem = {
          id: data.exportId,
          status: "pending",
          format,
          scope,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          progress: 0,
        };

        const updated = [newExport, ...exportHistory];
        saveExportHistory(updated);

        // Mark as active for polling
        setActiveExports((prev) => new Set(prev).add(data.exportId));

        setShowSuccessDialog(true);
      } else {
        alert(`Export creation failed: ${data.error}`);
      }
    } catch (error) {
      logger.error("Export creation error:", error);
      alert("Failed to create export. Please try again.");
    } finally {
      setIsCreatingExport(false);
    }
  };

  const handleDownload = (exportId: string) => {
    window.location.href = `/api/export?id=${exportId}&action=download`;
  };

  const handleCancelExport = async (exportId: string) => {
    try {
      const response = await fetch(`/api/export?id=${exportId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setExportHistory((prev) => {
          const updated = prev.map((item) =>
            item.id === exportId
              ? { ...item, status: "cancelled" as const }
              : item,
          );
          localStorage.setItem("export-history", JSON.stringify(updated));
          return updated;
        });

        setActiveExports((prev) => {
          const next = new Set(prev);
          next.delete(exportId);
          return next;
        });
      }
    } catch (error) {
      logger.error("Failed to cancel export:", error);
    }
  };

  const getFormatIcon = (fmt: ExportFormat) => {
    switch (fmt) {
      case "json":
        return FileJson;
      case "csv":
        return FileSpreadsheet;
      case "html":
        return FileText;
      case "pdf":
        return FileType;
    }
  };

  const getStatusColor = (status: ExportRequest["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "failed":
      case "expired":
        return "text-red-600";
      case "cancelled":
        return "text-gray-500";
      case "processing":
        return "text-blue-600";
      default:
        return "text-yellow-600";
    }
  };

  const getStatusIcon = (status: ExportRequest["status"]) => {
    switch (status) {
      case "completed":
        return CheckCircle2;
      case "failed":
      case "expired":
        return XCircle;
      case "cancelled":
        return Trash2;
      case "processing":
        return Loader2;
      default:
        return Clock;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">Data Export & Backup</h2>
        <p className="mt-1 text-muted-foreground">
          Export your data in various formats for backup or GDPR compliance.
        </p>
      </div>

      {/* Export Options */}
      <div className="space-y-6 rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold">Create New Export</h3>

        {/* Scope Selection */}
        <div className="space-y-2">
          <label htmlFor="export-scope" className="text-sm font-medium">
            Export Scope
          </label>
          <Select
            value={scope}
            onValueChange={(v) => setScope(v as ExportScope)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_messages">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>All Messages</span>
                </div>
              </SelectItem>
              <SelectItem value="direct_messages">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Direct Messages Only</span>
                </div>
              </SelectItem>
              <SelectItem value="specific_channels">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  <span>Specific Channels</span>
                </div>
              </SelectItem>
              <SelectItem value="user_data">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>User Data Only</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Export Format</span>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(["json", "csv", "html", "pdf"] as ExportFormat[]).map((fmt) => {
              const Icon = getFormatIcon(fmt);
              return (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                    format === fmt
                      ? "bg-primary/5 border-primary"
                      : "hover:border-primary/50 border-border",
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium uppercase">{fmt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="from-date" className="text-sm font-medium">
              From Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl border bg-background py-2 pl-10 pr-3"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="to-date" className="text-sm font-medium">
              To Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl border bg-background py-2 pl-10 pr-3"
              />
            </div>
          </div>
        </div>

        {/* Include Options */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Include in Export</span>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={includeFiles}
                onChange={(e) => setIncludeFiles(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">File Attachments</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={includeReactions}
                onChange={(e) => setIncludeReactions(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Reactions</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={includeThreads}
                onChange={(e) => setIncludeThreads(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Thread Replies</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={includeEdits}
                onChange={(e) => setIncludeEdits(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Edit History</span>
            </label>
          </div>
        </div>

        {/* GDPR Compliance */}
        <div className="bg-muted/50 space-y-2 rounded-lg p-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={anonymize}
              onChange={(e) => setAnonymize(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">
              Anonymize Data (GDPR Compliance)
            </span>
          </label>
          <p className="ml-6 text-xs text-muted-foreground">
            Remove personally identifiable information from the export. User
            names will be replaced with anonymous identifiers.
          </p>
        </div>

        {/* Create Button */}
        <Button
          onClick={handleCreateExport}
          disabled={isCreatingExport}
          className="w-full"
          size="lg"
        >
          {isCreatingExport ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating Export...
            </>
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" />
              Create Export
            </>
          )}
        </Button>
      </div>

      {/* Export History */}
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold">Export History</h3>

        {exportHistory.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Download className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p>No exports yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exportHistory.map((item) => {
              const StatusIcon = getStatusIcon(item.status);
              const FormatIcon = getFormatIcon(item.format);

              return (
                <div
                  key={item.id}
                  className="space-y-3 rounded-lg border bg-background p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FormatIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {item.fileName ||
                              `Export - ${item.format.toUpperCase()}`}
                          </span>
                          <StatusIcon
                            className={cn(
                              "h-4 w-4",
                              getStatusColor(item.status),
                              item.status === "processing" && "animate-spin",
                            )}
                          />
                          <span
                            className={cn(
                              "text-sm capitalize",
                              getStatusColor(item.status),
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created {item.createdAt.toLocaleString()}
                          {item.fileSize &&
                            ` • ${formatFileSize(item.fileSize)}`}
                        </div>
                        {item.errorMessage && (
                          <div className="flex items-center gap-1 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>{item.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === "completed" && (
                        <Button
                          onClick={() => handleDownload(item.id)}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </Button>
                      )}
                      {(item.status === "pending" ||
                        item.status === "processing") && (
                        <Button
                          onClick={() => handleCancelExport(item.id)}
                          size="sm"
                          variant="outline"
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(item.status === "pending" ||
                    item.status === "processing") && (
                    <div className="space-y-1">
                      <Progress value={item.progress || 0} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {item.itemsProcessed || 0} / {item.itemsTotal || 0}{" "}
                          items
                        </span>
                        <span>{item.progress || 0}%</span>
                      </div>
                    </div>
                  )}

                  {/* Expiry Info */}
                  {item.status === "completed" && (
                    <div className="text-xs text-muted-foreground">
                      Expires {item.expiresAt.toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Created Successfully</DialogTitle>
            <DialogDescription>
              Your export has been queued for processing. You'll receive an
              email notification when it's ready to download. You can also check
              the progress in the Export History below.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
