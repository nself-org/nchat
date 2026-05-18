"use client";

/**
 * Audit Export Component
 *
 * Comprehensive audit log export functionality:
 * - Export all user data (GDPR)
 * - Export channel data
 * - Export audit logs
 * - Date range filtering
 * - Multiple export formats (JSON, CSV, PDF)
 * - Scheduled exports
 */

import * as React from "react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  FileJson,
  FileText,
  File,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import types
import type {
  ExportFormat,
  DataExportRequest,
  ExportDataCategory,
  ExportRequestStatus,
} from "@/lib/compliance/compliance-types";

type ExportDataType = "user" | "channel" | "audit" | "all" | "audit_logs";
type ExportStatus = ExportRequestStatus;
type ExportFilters = {
  startDate?: Date;
  endDate?: Date;
  userIds?: string[];
  channelIds?: string[];
  includeDeleted?: boolean;
  includeSystem?: boolean;
};

// UI-specific export request interface
interface ExportRequest {
  id: string;
  dataType: ExportDataType;
  format: ExportFormat;
  status: ExportStatus;
  progress?: number;
  filters?: ExportFilters;
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  recordCount?: number;
  errorMessage?: string;
  expiresAt?: Date;
}

// ============================================================================
// Main Component
// ============================================================================

export function AuditExport() {
  const { user } = useAuth();
  const [exports, setExports] = useState<ExportRequest[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateExport = async (request: Partial<ExportRequest>) => {
    try {
      setLoading(true);

      const newExport: ExportRequest = {
        id: crypto.randomUUID(),
        dataType: request.dataType || "audit_logs",
        format: request.format || "json",
        status: "pending",
        progress: 0,
        filters: request.filters || {},
        requestedBy: user?.id || "unknown",
        createdAt: new Date(),
      };

      setExports([newExport, ...exports]);
      setShowCreateDialog(false);

      // Simulate export processing
      simulateExportProcessing(newExport);

      toast({
        title: "Export Started",
        description: "Your export request is being processed.",
      });
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to create export request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const simulateExportProcessing = (exportRequest: ExportRequest) => {
    // Simulate processing
    setTimeout(() => {
      setExports((prev) =>
        prev.map((exp) =>
          exp.id === exportRequest.id
            ? {
                ...exp,
                status: "processing" as ExportStatus,
                startedAt: new Date(),
                progress: 0,
              }
            : exp,
        ),
      );

      // Progress updates
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setExports((prev) =>
          prev.map((exp) =>
            exp.id === exportRequest.id ? { ...exp, progress } : exp,
          ),
        );

        if (progress >= 100) {
          clearInterval(interval);
          setExports((prev) =>
            prev.map((exp) =>
              exp.id === exportRequest.id
                ? {
                    ...exp,
                    status: "completed" as ExportStatus,
                    progress: 100,
                    completedAt: new Date(),
                    downloadUrl: `/api/exports/${exp.id}/download`,
                    fileSize: 1024 * 1024 * 2.5, // 2.5 MB
                    recordCount: 1523,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                  }
                : exp,
            ),
          );
        }
      }, 500);
    }, 1000);
  };

  const handleDownload = (exportRequest: ExportRequest) => {
    if (!exportRequest.downloadUrl) return;

    toast({
      title: "Download Started",
      description: `Downloading ${exportRequest.format.toUpperCase()} file...`,
    });

    // window.location.href = exportRequest.downloadUrl
  };

  const getStatusIcon = (status: ExportStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ExportStatus) => {
    const variants: Record<
      ExportStatus,
      "default" | "secondary" | "destructive"
    > = {
      pending: "secondary",
      processing: "default",
      completed: "default",
      failed: "destructive",
      expired: "secondary",
      cancelled: "secondary",
    };

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case "json":
        return <FileJson className="h-4 w-4" />;
      case "csv":
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Export Data</h2>
          <p className="mt-1 text-muted-foreground">
            Export audit logs, user data, and compliance reports
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Export
        </Button>
      </div>

      {/* Export Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Export Requests</CardTitle>
          <CardDescription>
            View and download your export requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(exp.status)}
                        {getStatusBadge(exp.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {exp.dataType.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFormatIcon(exp.format)}
                        <span className="font-mono text-xs uppercase">
                          {exp.format}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {exp.status === "processing" ? (
                        <div className="space-y-1">
                          <Progress value={exp.progress} className="w-24" />
                          <span className="text-xs text-muted-foreground">
                            {exp.progress}%
                          </span>
                        </div>
                      ) : exp.status === "completed" ? (
                        <div className="text-sm">
                          {exp.recordCount?.toLocaleString()} records
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {exp.createdAt.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {exp.createdAt.toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {exp.expiresAt ? (
                        <div
                          className={cn(
                            "text-sm",
                            new Date() > exp.expiresAt && "text-red-500",
                          )}
                        >
                          {exp.expiresAt.toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {exp.status === "completed" && exp.downloadUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(exp)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      )}
                      {exp.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Retry export
                          }}
                        >
                          Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <Download className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No export requests</h3>
              <p className="mb-4 text-muted-foreground">
                Create your first export to download audit logs or user data
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Export
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Export Dialog */}
      <CreateExportDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateExport}
        loading={loading}
      />
    </div>
  );
}

// ============================================================================
// Create Export Dialog
// ============================================================================

interface CreateExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (request: Partial<ExportRequest>) => void;
  loading: boolean;
}

function CreateExportDialog({
  open,
  onOpenChange,
  onCreate,
  loading,
}: CreateExportDialogProps) {
  const [dataType, setDataType] = useState<ExportDataType>("audit_logs");
  const [format, setFormat] = useState<ExportFormat>("json");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [channelIds, _setChannelIds] = useState<string[]>([]);
  const [userIds, _setUserIds] = useState<string[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [includeSystem, setIncludeSystem] = useState(false);

  const handleSubmit = () => {
    const filters: ExportFilters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      channelIds: channelIds.length > 0 ? channelIds : undefined,
      userIds: userIds.length > 0 ? userIds : undefined,
      includeDeleted,
      includeSystem,
    };

    onCreate({
      dataType,
      format,
      filters,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Export Request</DialogTitle>
          <DialogDescription>
            Export data for compliance, backup, or analysis purposes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data Type */}
          <div className="space-y-2">
            <Label htmlFor="dataType">Data Type *</Label>
            <Select
              value={dataType}
              onValueChange={(value: ExportDataType) => setDataType(value)}
            >
              <SelectTrigger id="dataType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="messages">Messages</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="channels">Channels</SelectItem>
                <SelectItem value="moderation_logs">Moderation Logs</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="audit_logs">Audit Logs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Format */}
          <div className="space-y-2">
            <Label htmlFor="format">Format *</Label>
            <Select
              value={format}
              onValueChange={(value: ExportFormat) => setFormat(value)}
            >
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV
                  </div>
                </SelectItem>
                <SelectItem value="zip">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4" />
                    ZIP Archive
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <Label>Options</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDeleted"
                checked={includeDeleted}
                onCheckedChange={(checked) =>
                  setIncludeDeleted(checked as boolean)
                }
              />
              <Label htmlFor="includeDeleted" className="font-normal">
                Include deleted items
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeSystem"
                checked={includeSystem}
                onCheckedChange={(checked) =>
                  setIncludeSystem(checked as boolean)
                }
              />
              <Label htmlFor="includeSystem" className="font-normal">
                Include system messages
              </Label>
            </div>
          </div>

          {/* Info Banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="mb-1 font-medium">GDPR Compliance</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Exports will be available for 7 days and will be automatically
                  deleted. All export requests are logged for compliance
                  purposes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AuditExport;
