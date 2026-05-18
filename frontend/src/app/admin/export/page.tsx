"use client";

import * as React from "react";
import Link from "next/link";
import {
  Download,
  Users,
  Hash,
  MessageSquare,
  Calendar,
  FileJson,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ExportFormat, ExportConfig } from "@/lib/import-export/types";
import {
  createDefaultExportConfig,
  generateExportFilename,
  estimateExportSize,
} from "@/lib/import-export/export-service";

// ============================================================================
// MOCK DATA (In production, this would come from GraphQL)
// ============================================================================

const MOCK_STATS = {
  userCount: 156,
  channelCount: 24,
  messageCount: 45892,
};

const MOCK_CHANNELS = [
  { id: "1", name: "general", messageCount: 12500 },
  { id: "2", name: "random", messageCount: 8300 },
  { id: "3", name: "announcements", messageCount: 450 },
  { id: "4", name: "engineering", messageCount: 15200 },
  { id: "5", name: "design", messageCount: 4200 },
  { id: "6", name: "marketing", messageCount: 2800 },
  { id: "7", name: "support", messageCount: 2442 },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ExportPage() {
  const [config, setConfig] = React.useState<ExportConfig>(
    createDefaultExportConfig(),
  );
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState(0);
  const [exportComplete, setExportComplete] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = React.useState<Set<string>>(
    new Set(),
  );
  const [selectAllChannels, setSelectAllChannels] = React.useState(true);

  // Calculate estimated size
  const estimatedSize = React.useMemo(() => {
    return estimateExportSize(
      config.options.includeUsers ? MOCK_STATS.userCount : 0,
      config.options.includeChannels ? MOCK_STATS.channelCount : 0,
      config.options.includeMessages ? MOCK_STATS.messageCount : 0,
      config.format,
    );
  }, [config]);

  // Handle format change
  const handleFormatChange = (format: ExportFormat) => {
    setConfig((prev) => ({ ...prev, format }));
  };

  // Handle option change
  const handleOptionChange = (
    key: keyof ExportConfig["options"],
    value: boolean,
  ) => {
    setConfig((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: value },
    }));
  };

  // Handle date range change
  const handleDateRangeChange = (field: "start" | "end", value: string) => {
    setConfig((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        dateRange: {
          ...prev.filters.dateRange,
          [field]: value || undefined,
        },
      },
    }));
  };

  // Handle channel selection
  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
    setSelectAllChannels(false);
  };

  // Handle select all channels toggle
  const handleSelectAllChannels = (checked: boolean) => {
    setSelectAllChannels(checked);
    if (checked) {
      setSelectedChannels(new Set());
    }
  };

  // Start export
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    setExportComplete(false);

    try {
      // Update config with selected channels
      const exportConfig: ExportConfig = {
        ...config,
        filters: {
          ...config.filters,
          channelIds: selectAllChannels
            ? undefined
            : Array.from(selectedChannels),
        },
      };

      // Simulate progress
      for (let i = 0; i <= 90; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setExportProgress(i);
      }

      // Make API call
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportConfig),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = generateExportFilename(config.format);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportComplete(true);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground"
          >
            Admin
          </Link>
          <span className="text-muted-foreground">/</span>
          <span>Export</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 rounded-lg p-3">
            <Download className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Export Data</h1>
            <p className="text-muted-foreground">
              Export your nchat data for backup or migration
            </p>
          </div>
        </div>
      </div>

      {/* Data Overview */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {MOCK_STATS.userCount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                <Hash className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {MOCK_STATS.channelCount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Channels</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {MOCK_STATS.messageCount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Configuration */}
      <div className="space-y-6">
        {/* Format Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Export Format</CardTitle>
            <CardDescription>Choose the format for your export</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`cursor-pointer rounded-lg border p-4 transition-all hover:border-primary ${
                  config.format === "json" ? "bg-primary/5 border-primary" : ""
                }`}
                role="button"
                tabIndex={0}
                onClick={() => handleFormatChange("json")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleFormatChange("json");
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${
                      config.format === "json"
                        ? "text-primary-foreground bg-primary"
                        : "bg-muted"
                    }`}
                  >
                    <FileJson className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">JSON</h3>
                    <p className="text-sm text-muted-foreground">
                      Full data with nested structure
                    </p>
                  </div>
                </div>
              </div>
              <div
                className={`cursor-pointer rounded-lg border p-4 transition-all hover:border-primary ${
                  config.format === "csv" ? "bg-primary/5 border-primary" : ""
                }`}
                role="button"
                tabIndex={0}
                onClick={() => handleFormatChange("csv")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleFormatChange("csv");
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${
                      config.format === "csv"
                        ? "text-primary-foreground bg-primary"
                        : "bg-muted"
                    }`}
                  >
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">CSV</h3>
                    <p className="text-sm text-muted-foreground">
                      Flat data for spreadsheets
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Data to Export</CardTitle>
            <CardDescription>
              Select what data to include in the export
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="content" className="space-y-4">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="channels">Channels</TabsTrigger>
                <TabsTrigger value="options">Options</TabsTrigger>
                <TabsTrigger value="filters">Date Range</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <ExportToggle
                  icon={<Users className="h-4 w-4" />}
                  label="Users"
                  description={`Export ${MOCK_STATS.userCount.toLocaleString()} user profiles`}
                  checked={config.options.includeUsers}
                  onChange={(checked) =>
                    handleOptionChange("includeUsers", checked)
                  }
                />
                <ExportToggle
                  icon={<Hash className="h-4 w-4" />}
                  label="Channels"
                  description={`Export ${MOCK_STATS.channelCount.toLocaleString()} channels`}
                  checked={config.options.includeChannels}
                  onChange={(checked) =>
                    handleOptionChange("includeChannels", checked)
                  }
                />
                <ExportToggle
                  icon={<MessageSquare className="h-4 w-4" />}
                  label="Messages"
                  description={`Export ${MOCK_STATS.messageCount.toLocaleString()} messages`}
                  checked={config.options.includeMessages}
                  onChange={(checked) =>
                    handleOptionChange("includeMessages", checked)
                  }
                />
                <ExportToggle
                  icon={<HardDrive className="h-4 w-4" />}
                  label="Attachments"
                  description="Include attachment metadata"
                  checked={config.options.includeAttachments}
                  onChange={(checked) =>
                    handleOptionChange("includeAttachments", checked)
                  }
                  disabled={!config.options.includeMessages}
                />
              </TabsContent>

              <TabsContent value="channels" className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>Export All Channels</Label>
                    <p className="text-xs text-muted-foreground">
                      Include all channels in the export
                    </p>
                  </div>
                  <Switch
                    checked={selectAllChannels}
                    onCheckedChange={handleSelectAllChannels}
                  />
                </div>

                {!selectAllChannels && (
                  <ScrollArea className="h-[250px] rounded-lg border p-2">
                    <div className="space-y-2">
                      {MOCK_CHANNELS.map((channel) => (
                        <div
                          key={channel.id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                            selectedChannels.has(channel.id)
                              ? "bg-primary/5 border-primary"
                              : "hover:bg-muted"
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleChannel(channel.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleChannel(channel.id);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded border ${
                                selectedChannels.has(channel.id)
                                  ? "border-primary bg-primary"
                                  : "border-input"
                              }`}
                            >
                              {selectedChannels.has(channel.id) && (
                                <CheckCircle2 className="text-primary-foreground h-4 w-4" />
                              )}
                            </div>
                            <span className="font-medium">#{channel.name}</span>
                          </div>
                          <Badge variant="outline">
                            {channel.messageCount.toLocaleString()} messages
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="options" className="space-y-4">
                <ExportToggle
                  icon={<Users className="h-4 w-4" />}
                  label="Anonymize Users"
                  description="Replace names with anonymous identifiers"
                  checked={config.options.anonymizeUsers}
                  onChange={(checked) =>
                    handleOptionChange("anonymizeUsers", checked)
                  }
                />
                <ExportToggle
                  icon={<MessageSquare className="h-4 w-4" />}
                  label="Include Threads"
                  description="Include threaded messages"
                  checked={config.options.includeThreads}
                  onChange={(checked) =>
                    handleOptionChange("includeThreads", checked)
                  }
                  disabled={!config.options.includeMessages}
                />
                <ExportToggle
                  icon={<Clock className="h-4 w-4" />}
                  label="Include Metadata"
                  description="Include additional metadata fields"
                  checked={config.options.includeMetadata}
                  onChange={(checked) =>
                    handleOptionChange("includeMetadata", checked)
                  }
                />
              </TabsContent>

              <TabsContent value="filters" className="space-y-4">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Only export messages within the specified date range
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="start-date"
                        className="text-xs text-muted-foreground"
                      >
                        Start Date
                      </Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={config.filters.dateRange?.start || ""}
                        onChange={(e) =>
                          handleDateRangeChange("start", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="end-date"
                        className="text-xs text-muted-foreground"
                      >
                        End Date
                      </Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={config.filters.dateRange?.end || ""}
                        onChange={(e) =>
                          handleDateRangeChange("end", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Export Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Export Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Format</span>
                <span className="font-medium">
                  {config.format.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Estimated Size</span>
                <span className="font-medium">
                  {formatFileSize(estimatedSize)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Channels</span>
                <span className="font-medium">
                  {selectAllChannels
                    ? "All channels"
                    : `${selectedChannels.size} selected`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Date Range</span>
                <span className="font-medium">
                  {config.filters.dateRange?.start ||
                  config.filters.dateRange?.end
                    ? `${config.filters.dateRange?.start || "Start"} - ${config.filters.dateRange?.end || "Now"}`
                    : "All time"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Progress / Status */}
        {(isExporting || exportComplete || exportError) && (
          <Alert
            variant={exportError ? "destructive" : "default"}
            className="mt-4"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Generating Export</AlertTitle>
                <AlertDescription>
                  <Progress value={exportProgress} className="mt-2" />
                </AlertDescription>
              </>
            ) : exportComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Export Complete</AlertTitle>
                <AlertDescription>
                  Your export has been downloaded successfully.
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Export Failed</AlertTitle>
                <AlertDescription>{exportError}</AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface ExportToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ExportToggle({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: ExportToggleProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-muted p-2">{icon}</div>
        <div>
          <Label className="font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
