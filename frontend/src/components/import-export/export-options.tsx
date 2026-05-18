"use client";

import * as React from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Calendar,
  Users,
  Hash,
  MessageSquare,
  Paperclip,
  Smile,
  GitBranch,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ExportFormat,
  ExportConfig,
  ExportProgress,
} from "@/lib/import-export/types";
import {
  createDefaultExportConfig,
  generateExportFilename,
  estimateExportSize,
} from "@/lib/import-export/export-service";

// ============================================================================
// TYPES
// ============================================================================

interface ExportOptionsProps {
  channels?: Array<{ id: string; name: string }>;
  userCount?: number;
  channelCount?: number;
  messageCount?: number;
  onExport?: (config: ExportConfig) => Promise<void>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExportOptions({
  channels = [],
  userCount = 0,
  channelCount = 0,
  messageCount = 0,
  onExport,
}: ExportOptionsProps) {
  const [config, setConfig] = React.useState<ExportConfig>(
    createDefaultExportConfig(),
  );
  const [progress, setProgress] = React.useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [selectedChannels, setSelectedChannels] = React.useState<string[]>([]);

  const estimatedSize = React.useMemo(() => {
    return estimateExportSize(
      config.options.includeUsers ? userCount : 0,
      config.options.includeChannels ? channelCount : 0,
      config.options.includeMessages ? messageCount : 0,
      config.format,
    );
  }, [config, userCount, channelCount, messageCount]);

  const handleFormatChange = (format: ExportFormat) => {
    setConfig((prev) => ({ ...prev, format }));
  };

  const handleOptionChange = (
    key: keyof ExportConfig["options"],
    value: boolean,
  ) => {
    setConfig((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: value },
    }));
  };

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

  const handleChannelFilterChange = (channelIds: string[]) => {
    setSelectedChannels(channelIds);
    setConfig((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        channelIds: channelIds.length > 0 ? channelIds : undefined,
      },
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress({ status: "generating", progress: 0 });

    try {
      if (onExport) {
        await onExport(config);
      } else {
        // Make API call to generate export
        const response = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          throw new Error("Export failed");
        }

        // Handle streaming download for large files
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
      }

      setProgress({ status: "completed", progress: 100 });
    } catch (error) {
      setProgress({
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Export failed",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Export Format</CardTitle>
          <CardDescription>Choose the format for your export</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <FormatCard
              format="json"
              title="JSON"
              description="Full data with nested structure"
              icon={<FileJson className="h-6 w-6" />}
              selected={config.format === "json"}
              onClick={() => handleFormatChange("json")}
            />
            <FormatCard
              format="csv"
              title="CSV"
              description="Flat data for spreadsheets"
              icon={<FileSpreadsheet className="h-6 w-6" />}
              selected={config.format === "csv"}
              onClick={() => handleFormatChange("csv")}
            />
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
              <TabsTrigger value="options">Options</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <ExportToggle
                icon={<Users className="h-4 w-4" />}
                label="Users"
                description={`Export ${userCount.toLocaleString()} user profiles`}
                checked={config.options.includeUsers}
                onChange={(checked) =>
                  handleOptionChange("includeUsers", checked)
                }
              />
              <ExportToggle
                icon={<Hash className="h-4 w-4" />}
                label="Channels"
                description={`Export ${channelCount.toLocaleString()} channels`}
                checked={config.options.includeChannels}
                onChange={(checked) =>
                  handleOptionChange("includeChannels", checked)
                }
              />
              <ExportToggle
                icon={<MessageSquare className="h-4 w-4" />}
                label="Messages"
                description={`Export ${messageCount.toLocaleString()} messages`}
                checked={config.options.includeMessages}
                onChange={(checked) =>
                  handleOptionChange("includeMessages", checked)
                }
              />
              <ExportToggle
                icon={<Paperclip className="h-4 w-4" />}
                label="Attachments"
                description="Include attachment metadata"
                checked={config.options.includeAttachments}
                onChange={(checked) =>
                  handleOptionChange("includeAttachments", checked)
                }
                disabled={!config.options.includeMessages}
              />
              <ExportToggle
                icon={<Smile className="h-4 w-4" />}
                label="Reactions"
                description="Include message reactions"
                checked={config.options.includeReactions}
                onChange={(checked) =>
                  handleOptionChange("includeReactions", checked)
                }
                disabled={!config.options.includeMessages}
              />
              <ExportToggle
                icon={<GitBranch className="h-4 w-4" />}
                label="Threads"
                description="Include threaded messages"
                checked={config.options.includeThreads}
                onChange={(checked) =>
                  handleOptionChange("includeThreads", checked)
                }
                disabled={!config.options.includeMessages}
              />
            </TabsContent>

            <TabsContent value="options" className="space-y-4">
              <ExportToggle
                icon={<EyeOff className="h-4 w-4" />}
                label="Anonymize Users"
                description="Replace names with anonymous identifiers"
                checked={config.options.anonymizeUsers}
                onChange={(checked) =>
                  handleOptionChange("anonymizeUsers", checked)
                }
              />
              <ExportToggle
                icon={<GitBranch className="h-4 w-4" />}
                label="Flatten Threads"
                description="Include thread messages inline"
                checked={config.options.flattenThreads}
                onChange={(checked) =>
                  handleOptionChange("flattenThreads", checked)
                }
                disabled={!config.options.includeThreads}
              />
              <ExportToggle
                icon={<Eye className="h-4 w-4" />}
                label="Include Metadata"
                description="Include additional metadata fields"
                checked={config.options.includeMetadata}
                onChange={(checked) =>
                  handleOptionChange("includeMetadata", checked)
                }
              />
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              {/* Date Range Filter */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Label>
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

              {/* Channel Filter */}
              {channels.length > 0 && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Filter by Channels
                  </Label>
                  <Select
                    value={selectedChannels.length === 0 ? "all" : "selected"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        handleChannelFilterChange([]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      <SelectItem value="selected">
                        {selectedChannels.length > 0
                          ? `${selectedChannels.length} channel${selectedChannels.length > 1 ? "s" : ""} selected`
                          : "Select channels..."}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedChannels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedChannels.map((id) => {
                        const channel = channels.find((c) => c.id === id);
                        return channel ? (
                          <span
                            key={id}
                            className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm"
                          >
                            #{channel.name}
                            <button
                              onClick={() =>
                                handleChannelFilterChange(
                                  selectedChannels.filter((cid) => cid !== id),
                                )
                              }
                              className="hover:text-destructive"
                            >
                              x
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              )}
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
              <span className="font-medium">{config.format.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Estimated Size</span>
              <span className="font-medium">
                {formatFileSize(estimatedSize)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Items</span>
              <span className="font-medium">
                {(config.options.includeUsers ? userCount : 0) +
                  (config.options.includeChannels ? channelCount : 0) +
                  (config.options.includeMessages ? messageCount : 0)}{" "}
                items
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress / Download */}
      {progress && (
        <Alert
          variant={progress.status === "failed" ? "destructive" : "default"}
          className="mt-4"
        >
          {progress.status === "generating" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Generating Export</AlertTitle>
              <AlertDescription>
                <Progress value={progress.progress} className="mt-2" />
              </AlertDescription>
            </>
          ) : progress.status === "completed" ? (
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
              <AlertDescription>{progress.error}</AlertDescription>
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
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface FormatCardProps {
  format: ExportFormat;
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}

function FormatCard({
  title,
  description,
  icon,
  selected,
  onClick,
}: FormatCardProps) {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={cn(
        "cursor-pointer rounded-lg border p-4 transition-all hover:border-primary",
        selected && "bg-primary/5 border-primary",
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "rounded-full p-2",
            selected ? "text-primary-foreground bg-primary" : "bg-muted",
          )}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

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
      className={cn(
        "flex items-center justify-between rounded-lg border p-3",
        disabled && "opacity-50",
      )}
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

export default ExportOptions;
