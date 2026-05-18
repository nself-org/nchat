"use client";

import * as React from "react";
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnalyticsStore } from "@/stores/analytics-store";
import { useToast } from "@/hooks/use-toast";
import type {
  ExportFormat,
  AnalyticsSectionType,
} from "@/lib/analytics/analytics-types";

interface AnalyticsExportProps {
  className?: string;
  onExport?: (format: ExportFormat) => void;
}

const EXPORT_SECTIONS: { key: AnalyticsSectionType; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "messages", label: "Messages" },
  { key: "users", label: "Users" },
  { key: "channels", label: "Channels" },
  { key: "reactions", label: "Reactions" },
  { key: "peakHours", label: "Peak Hours" },
  { key: "files", label: "Files" },
  { key: "search", label: "Search" },
];

/**
 * AnalyticsExport - Export analytics data in various formats
 */
export function AnalyticsExport({ className, onExport }: AnalyticsExportProps) {
  const { dateRange, isExporting } = useAnalyticsStore();
  const { toast } = useToast();

  const [selectedSections, setSelectedSections] = React.useState<
    AnalyticsSectionType[]
  >(["summary", "messages", "users", "channels"]);
  const [exportStatus, setExportStatus] = React.useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const toggleSection = (section: AnalyticsSectionType) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const handleExport = async (format: ExportFormat) => {
    if (selectedSections.length === 0) {
      toast({
        title: "No sections selected",
        description: "Please select at least one section to export.",
        variant: "destructive",
      });
      return;
    }

    setExportStatus("loading");

    try {
      const response = await fetch("/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format,
          sections: selectedSections,
          dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString(),
          },
          granularity: "day",
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Handle file download for CSV and JSON
      if (format === "csv" || format === "json") {
        const blob = await response.blob();
        const contentDisposition = response.headers.get("Content-Disposition");
        const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
        const fileName = fileNameMatch?.[1] || `analytics-export.${format}`;

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportStatus("success");
        toast({
          title: "Export complete",
          description: `Analytics data exported as ${format.toUpperCase()}.`,
        });
      } else if (format === "xlsx" || format === "pdf") {
        // Use client-side export for XLSX and PDF
        const { exportFullReport } =
          await import("@/lib/analytics/analytics-export");

        // Fetch dashboard data for client-side processing
        const dashboardResponse = await fetch("/api/analytics/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dateRange: {
              start: dateRange.start.toISOString(),
              end: dateRange.end.toISOString(),
            },
            granularity: "day",
          }),
        });

        if (!dashboardResponse.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const dashboardData = await dashboardResponse.json();

        // Export using client-side libraries
        await exportFullReport(
          {
            summary: dashboardData.summary,
            messageVolume: (dashboardData.messageVolume || []).map(
              (m: { timestamp: string; count: number }) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              }),
            ),
            userActivity: (dashboardData.topUsers || []).map(
              (u: { lastActive: string }) => ({
                ...u,
                lastActive: new Date(u.lastActive),
              }),
            ),
            channelActivity: dashboardData.channelActivity || [],
            reactions: dashboardData.reactions || [],
            fileUploads: (dashboardData.fileUploads || []).map(
              (f: { timestamp: string }) => ({
                ...f,
                timestamp: new Date(f.timestamp),
              }),
            ),
            searchQueries: (dashboardData.searchQueries || []).map(
              (s: { lastSearched: string }) => ({
                ...s,
                lastSearched: new Date(s.lastSearched),
              }),
            ),
            peakHours: dashboardData.peakHours || [],
            topMessages: (dashboardData.topMessages || []).map(
              (m: { timestamp: string }) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              }),
            ),
            inactiveUsers: (dashboardData.inactiveUsers || []).map(
              (u: { lastActive: string }) => ({
                ...u,
                lastActive: new Date(u.lastActive),
              }),
            ),
            userGrowth: (dashboardData.userGrowth || []).map(
              (g: { timestamp: string }) => ({
                ...g,
                timestamp: new Date(g.timestamp),
              }),
            ),
            dateRange: {
              start: dateRange.start,
              end: dateRange.end,
            },
          },
          {
            format,
            sections: selectedSections,
            dateRange: {
              start: dateRange.start,
              end: dateRange.end,
            },
          },
        );

        setExportStatus("success");
        toast({
          title: "Export complete",
          description: `Analytics data exported as ${format.toUpperCase()}.`,
        });
      }

      // Call the callback if provided
      if (onExport) {
        onExport(format);
      }

      // Reset status after delay
      setTimeout(() => setExportStatus("idle"), 2000);
    } catch (error) {
      console.error("Export error:", error);
      setExportStatus("error");
      toast({
        title: "Export failed",
        description:
          "There was an error exporting the analytics data. Please try again.",
        variant: "destructive",
      });
      setTimeout(() => setExportStatus("idle"), 2000);
    }
  };

  const getButtonIcon = () => {
    switch (exportStatus) {
      case "loading":
        return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
      case "success":
        return <Check className="mr-2 h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="mr-2 h-4 w-4 text-red-500" />;
      default:
        return <Download className="mr-2 h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={isExporting || exportStatus === "loading"}
        >
          {getButtonIcon()}
          {exportStatus === "loading" ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV (Spreadsheet)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="mr-2 h-4 w-4" />
          JSON (Data)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          XLSX (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="mr-2 h-4 w-4" />
          PDF Report
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="text-sm">
              Select Sections ({selectedSections.length})
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {EXPORT_SECTIONS.map((section) => (
              <DropdownMenuCheckboxItem
                key={section.key}
                checked={selectedSections.includes(section.key)}
                onCheckedChange={() => toggleSection(section.key)}
              >
                {section.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AnalyticsExport;
