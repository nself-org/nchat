"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  BarChart3,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useComplianceStore } from "@/stores/compliance-store";
import type {
  ComplianceReport,
  ComplianceReportType,
} from "@/lib/compliance/compliance-types";
import { logger } from "@/lib/logger";
import {
  REPORT_TYPE_CONFIGS,
  createReport,
  formatReportStatus,
} from "@/lib/compliance/compliance-report";

interface ReportCardProps {
  report: ComplianceReport;
  onDownload: (report: ComplianceReport) => void;
}

function ReportCard({ report, onDownload }: ReportCardProps) {
  const statusInfo = formatReportStatus(report.status);
  const config = REPORT_TYPE_CONFIGS.find((c) => c.type === report.type);

  const StatusIcon = {
    pending: Clock,
    generating: Loader2,
    completed: CheckCircle,
    failed: AlertCircle,
  }[report.status];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`rounded-lg p-2 ${
                report.status === "completed"
                  ? "bg-green-100 text-green-600"
                  : report.status === "failed"
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              <StatusIcon
                className={`h-5 w-5 ${report.status === "generating" ? "animate-spin" : ""}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{report.name}</p>
                <Badge
                  variant={
                    report.status === "completed" ? "default" : "secondary"
                  }
                >
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {config?.description}
              </p>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(report.generatedAt).toLocaleDateString()}
                </span>
                <span className="uppercase">{report.format}</span>
                {report.fileSize && (
                  <span>{(report.fileSize / 1024).toFixed(1)} KB</span>
                )}
              </div>
            </div>
          </div>
          {report.status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(report)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ComplianceReports() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ComplianceReportType>(
    "compliance_overview",
  );
  const [format, setFormat] = useState<"pdf" | "csv" | "json">("pdf");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("recent");

  const { reports, addReport } = useComplianceStore();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const report = createReport(selectedType, "admin-user", {
        format,
        dateRangeStart: dateRange.start ? new Date(dateRange.start) : undefined,
        dateRangeEnd: dateRange.end ? new Date(dateRange.end) : undefined,
      });

      addReport(report);

      // Simulate report generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIsDialogOpen(false);
    } catch (error) {
      logger.error("Failed to generate report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (report: ComplianceReport) => {
    if (report.fileUrl) {
      window.open(report.fileUrl, "_blank");
    } else {
      alert("Report file is not yet available");
    }
  };

  const recentReports = reports
    .slice()
    .sort(
      (a, b) =>
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    );

  const reportsByCategory = REPORT_TYPE_CONFIGS.reduce(
    (acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = [];
      }
      acc[config.category].push(config);
      return acc;
    },
    {} as Record<string, typeof REPORT_TYPE_CONFIGS>,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="h-6 w-6" />
            Compliance Reports
          </h2>
          <p className="text-muted-foreground">
            Generate and download compliance documentation
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Quick Report Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => {
            setSelectedType("compliance_overview");
            setIsDialogOpen(true);
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">Compliance Overview</p>
                <p className="text-sm text-muted-foreground">
                  High-level compliance status
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => {
            setSelectedType("gdpr_compliance");
            setIsDialogOpen(true);
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">GDPR Compliance</p>
                <p className="text-sm text-muted-foreground">
                  GDPR assessment report
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => {
            setSelectedType("retention_summary");
            setIsDialogOpen(true);
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium">Retention Summary</p>
                <p className="text-sm text-muted-foreground">
                  Data retention overview
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recent">Recent Reports</TabsTrigger>
          <TabsTrigger value="types">Report Types</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          {recentReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No Reports Generated</h3>
                <p className="mt-1 text-muted-foreground">
                  Generate your first compliance report
                </p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="types" className="space-y-6">
          {Object.entries(reportsByCategory).map(([category, configs]) => (
            <div key={category}>
              <h3 className="mb-3 text-lg font-medium capitalize">
                {category}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {configs.map((config) => (
                  <Card
                    key={config.type}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedType(config.type);
                      setIsDialogOpen(true);
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{config.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {config.description}
                          </p>
                          <div className="mt-2 flex gap-1">
                            {config.availableFormats.map((fmt) => (
                              <Badge
                                key={fmt}
                                variant="outline"
                                className="text-xs"
                              >
                                {fmt.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Generate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Generate Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Configure and generate a compliance report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select
                value={selectedType}
                onValueChange={(v: ComplianceReportType) => setSelectedType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPE_CONFIGS.map((config) => (
                    <SelectItem key={config.type} value={config.type}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {
                  REPORT_TYPE_CONFIGS.find((c) => c.type === selectedType)
                    ?.description
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select
                value={format}
                onValueChange={(v: "pdf" | "csv" | "json") => setFormat(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPE_CONFIGS.find(
                    (c) => c.type === selectedType,
                  )?.availableFormats.map((fmt) => (
                    <SelectItem key={fmt} value={fmt}>
                      {fmt.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
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
                Leave empty for last 30 days
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
