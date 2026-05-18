"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  Package,
  HelpCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComplianceStore } from "@/stores/compliance-store";
import type {
  DataExportRequest as ExportRequest,
  ExportDataCategory,
  ExportFormat,
} from "@/lib/compliance/compliance-types";

import { logger } from "@/lib/logger";
import {
  EXPORT_CATEGORIES,
  EXPORT_FORMATS,
  EXPORT_PROCESSING_TIME_ESTIMATE,
  createExportRequest,
  getExportStatusInfo,
  isExportDownloadable,
  formatFileSize,
  canRequestExport,
} from "@/lib/compliance/data-export";

interface ExportRequestCardProps {
  request: ExportRequest;
  onDownload: (request: ExportRequest) => void;
}

function ExportRequestCard({ request, onDownload }: ExportRequestCardProps) {
  const statusInfo = getExportStatusInfo(request.status);
  const downloadable = isExportDownloadable(request);

  const StatusIcon = {
    pending: Clock,
    processing: Loader2,
    completed: CheckCircle,
    failed: AlertCircle,
    expired: Clock,
    cancelled: AlertCircle,
  }[request.status];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`rounded-lg p-2 ${
                request.status === "completed"
                  ? "bg-green-100 text-green-600"
                  : request.status === "failed"
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              <StatusIcon
                className={`h-5 w-5 ${request.status === "processing" ? "animate-spin" : ""}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">Export Request</p>
                <Badge
                  variant={
                    request.status === "completed" ? "default" : "secondary"
                  }
                >
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Requested: {new Date(request.requestedAt).toLocaleString()}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {request.categories.map((cat) => (
                  <Badge key={cat} variant="outline" className="text-xs">
                    {EXPORT_CATEGORIES.find((c) => c.category === cat)?.label ||
                      cat}
                  </Badge>
                ))}
              </div>
              {request.status === "completed" && request.fileSize && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Size: {formatFileSize(request.fileSize)} | Downloads:{" "}
                  {request.downloadCount}/{request.maxDownloads}
                </p>
              )}
              {request.expiresAt && request.status === "completed" && (
                <p className="text-sm text-muted-foreground">
                  Expires: {new Date(request.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div>
            {downloadable.downloadable ? (
              <Button onClick={() => onDownload(request)}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            ) : request.status === "processing" ? (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing
              </Button>
            ) : null}
          </div>
        </div>
        {!downloadable.downloadable &&
          downloadable.reason &&
          request.status === "completed" && (
            <p className="mt-3 text-sm text-red-600">{downloadable.reason}</p>
          )}
      </CardContent>
    </Card>
  );
}

export function DataExportRequest() {
  const [selectedCategories, setSelectedCategories] = useState<
    ExportDataCategory[]
  >([]);
  const [format, setFormat] = useState<ExportFormat>("zip");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>({ start: "", end: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { exportRequests, addExportRequest } = useComplianceStore();

  // Mock user data - would come from auth context in real app
  const currentUser = {
    id: "user-123",
    email: "user@example.com",
  };

  const { allowed, reason } = canRequestExport(exportRequests, currentUser.id);

  const handleCategoryToggle = (category: ExportDataCategory) => {
    if (category === "all") {
      setSelectedCategories(selectedCategories.includes("all") ? [] : ["all"]);
      return;
    }

    setSelectedCategories((prev) => {
      // Remove 'all' if selecting specific categories
      const withoutAll = prev.filter((c) => c !== "all");
      if (withoutAll.includes(category)) {
        return withoutAll.filter((c) => c !== category);
      }
      return [...withoutAll, category];
    });
  };

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      alert("Please select at least one data category to export");
      return;
    }

    setIsSubmitting(true);

    try {
      const request = createExportRequest(currentUser.id, currentUser.email, {
        categories: selectedCategories,
        format,
        includeMetadata,
        dateRangeStart: dateRange.start ? new Date(dateRange.start) : undefined,
        dateRangeEnd: dateRange.end ? new Date(dateRange.end) : undefined,
      });

      addExportRequest(request);

      // Reset form
      setSelectedCategories([]);
      setDateRange({ start: "", end: "" });

      alert(
        "Your data export request has been submitted. You will be notified when it is ready for download.",
      );
    } catch (error) {
      logger.error("Failed to submit export request:", error);
      alert("Failed to submit export request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = (request: ExportRequest) => {
    if (request.downloadUrl) {
      window.open(request.downloadUrl, "_blank");
    }
  };

  const userRequests = exportRequests.filter(
    (r) => r.userId === currentUser.id,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Download className="h-6 w-6" />
          Export Your Data
        </h2>
        <p className="text-muted-foreground">
          Download a copy of your personal data (GDPR Article 20)
        </p>
      </div>

      {/* New Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Request Data Export
          </CardTitle>
          <CardDescription>
            Select the data categories you want to export. Processing typically
            takes {EXPORT_PROCESSING_TIME_ESTIMATE}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!allowed && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">{reason}</span>
              </div>
            </div>
          )}

          {/* Data Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Data Categories</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select the types of data you want to export</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXPORT_CATEGORIES.map((cat) => (
                <label
                  key={cat.category}
                  htmlFor={`export-cat-${cat.category}`}
                  className={`flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors ${
                    selectedCategories.includes(cat.category)
                      ? "bg-primary/5 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    id={`export-cat-${cat.category}`}
                    checked={selectedCategories.includes(cat.category)}
                    onCheckedChange={() => handleCategoryToggle(cat.category)}
                  />
                  <div className="flex-1">
                    <span className="cursor-pointer font-medium">
                      {cat.label}
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select
              value={format}
              onValueChange={(v: ExportFormat) => setFormat(v)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map((f) => (
                  <SelectItem key={f.format} value={f.format}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {EXPORT_FORMATS.find((f) => f.format === format)?.description}
            </p>
          </div>

          {/* Date Range (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label>Date Range (Optional)</Label>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label
                  htmlFor="start-date"
                  className="text-xs text-muted-foreground"
                >
                  From
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                />
              </div>
              <div className="flex-1">
                <Label
                  htmlFor="end-date"
                  className="text-xs text-muted-foreground"
                >
                  To
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to export all available data
            </p>
          </div>

          {/* Include Metadata */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="metadata"
              checked={includeMetadata}
              onCheckedChange={(checked) =>
                setIncludeMetadata(checked as boolean)
              }
            />
            <Label htmlFor="metadata" className="text-sm">
              Include export metadata (timestamps, export ID, etc.)
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={
              !allowed || selectedCategories.length === 0 || isSubmitting
            }
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Request Export
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Previous Requests */}
      {userRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Your Export Requests</h3>
          <div className="space-y-4">
            {userRequests
              .sort(
                (a, b) =>
                  new Date(b.requestedAt).getTime() -
                  new Date(a.requestedAt).getTime(),
              )
              .map((request) => (
                <ExportRequestCard
                  key={request.id}
                  request={request}
                  onDownload={handleDownload}
                />
              ))}
          </div>
        </div>
      )}

      {/* Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4" />
            About Data Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Under GDPR Article 20, you have the right to receive your personal
            data in a structured, commonly used, and machine-readable format.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Exports are available for download for 7 days</li>
            <li>Maximum 5 downloads per export</li>
            <li>You can request one export per day</li>
            <li>
              Processing typically takes {EXPORT_PROCESSING_TIME_ESTIMATE}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
