"use client";

import * as React from "react";
import {
  Upload,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Hash,
  MessageSquare,
  ArrowRight,
  Info,
  ExternalLink,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type {
  SlackExportData,
  ImportConfig,
  ImportPreview,
  ImportError,
  ImportWarning,
} from "@/lib/import-export/types";
import {
  SlackParser,
  extractSlackExport,
  SLACK_DEFAULT_MAPPINGS,
} from "@/lib/import-export/slack-parser";
import { createDefaultImportConfig } from "@/lib/import-export/import-service";

// ============================================================================
// TYPES
// ============================================================================

interface SlackImportProps {
  onImportComplete?: (result: {
    success: boolean;
    stats: Record<string, number>;
  }) => void;
  onCancel?: () => void;
}

type ImportStep = "upload" | "review" | "mapping" | "importing" | "complete";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SlackImport({ onImportComplete, onCancel }: SlackImportProps) {
  const [step, setStep] = React.useState<ImportStep>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [data, setData] = React.useState<SlackExportData | null>(null);
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [config, setConfig] = React.useState<ImportConfig>(
    createDefaultImportConfig("slack"),
  );
  const [errors, setErrors] = React.useState<ImportError[]>([]);
  const [warnings, setWarnings] = React.useState<ImportWarning[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [selectedChannels, setSelectedChannels] = React.useState<Set<string>>(
    new Set(),
  );

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setErrors([]);
    setWarnings([]);

    try {
      // Extract and parse the Slack export
      const files = await extractSlackExport(selectedFile);
      const parser = new SlackParser();
      const exportData = await parser.parseExport(files);
      const exportPreview = parser.generatePreview(exportData);

      setData(exportData);
      setPreview(exportPreview);
      setErrors(parser.getErrors());
      setWarnings(parser.getWarnings());

      // Select all channels by default
      const allChannelIds = exportData.channels.map((c) => c.id);
      setSelectedChannels(new Set(allChannelIds));

      // Move to review step
      setStep("review");
    } catch (error) {
      setErrors([
        {
          code: "PARSE_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to parse Slack export",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle channel selection toggle
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
  };

  // Handle select/deselect all channels
  const toggleAllChannels = () => {
    if (selectedChannels.size === data?.channels.length) {
      setSelectedChannels(new Set());
    } else {
      setSelectedChannels(new Set(data?.channels.map((c) => c.id) || []));
    }
  };

  // Handle import options change
  const handleOptionChange = (
    key: keyof ImportConfig["options"],
    value: boolean,
  ) => {
    setConfig((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: value },
    }));
  };

  // Start the import process
  const startImport = async () => {
    if (!data || !preview) return;

    setStep("importing");
    setImportProgress(0);

    try {
      // Update config with selected channels
      const importConfig: ImportConfig = {
        ...config,
        options: {
          ...config.options,
          channelFilter: Array.from(selectedChannels),
        },
      };

      // Make API call to start import
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "slack",
          config: importConfig,
          data: {
            users: preview.users,
            channels: preview.channels.filter((c) =>
              selectedChannels.has(c.externalId),
            ),
            messages: preview.messages.filter((m) =>
              selectedChannels.has(m.channelId),
            ),
          },
        }),
      });

      // Simulate progress for demo
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setImportProgress(i);
      }

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();

      setStep("complete");
      onImportComplete?.({
        success: true,
        stats: result.stats,
      });
    } catch (error) {
      setErrors([
        {
          code: "IMPORT_ERROR",
          message: error instanceof Error ? error.message : "Import failed",
        },
      ]);
    }
  };

  // Render upload step
  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How to export from Slack</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <ol className="list-inside list-decimal space-y-1 text-sm">
            <li>Go to your Slack workspace settings</li>
            <li>Navigate to Import/Export Data</li>
            <li>Click Export and wait for the export to complete</li>
            <li>Download the ZIP file and upload it here</li>
          </ol>
          <a
            href="https://slack.com/help/articles/201658943-Export-your-workspace-data"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Learn more about Slack exports
            <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>

      {/* File Upload */}
      <Card>
        <CardContent className="pt-6">
          <div
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors",
              isProcessing ? "opacity-50" : "hover:border-primary",
            )}
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile?.name.endsWith(".zip")) {
                handleFileSelect(droppedFile);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            aria-label="Upload Slack export file"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  handleFileSelect(selectedFile);
                }
              }}
              className="hidden"
              disabled={isProcessing}
            />
            {isProcessing ? (
              <div className="space-y-4">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">
                  Processing Slack export...
                </p>
                <p className="text-sm text-muted-foreground">
                  This may take a moment for large exports
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <FileArchive className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">
                    Drop your Slack export here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse for the ZIP file
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {errors.map((error, index) => (
              <p key={index}>{error.message}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Render review step
  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {preview?.stats.totalUsers || 0}
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
                  {preview?.stats.totalChannels || 0}
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
                  {preview?.stats.totalMessages || 0}
                </p>
                <p className="text-sm text-muted-foreground">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Channels</CardTitle>
              <CardDescription>Choose which channels to import</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={toggleAllChannels}>
              {selectedChannels.size === data?.channels.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {data?.channels.map((channel) => {
                const messageCount =
                  data.messagesByChannel[channel.id]?.length || 0;
                return (
                  <div
                    key={channel.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors",
                      selectedChannels.has(channel.id)
                        ? "bg-primary/5 border-primary"
                        : "hover:bg-muted",
                    )}
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
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border",
                          selectedChannels.has(channel.id)
                            ? "border-primary bg-primary"
                            : "border-input",
                        )}
                      >
                        {selectedChannels.has(channel.id) && (
                          <CheckCircle2 className="text-primary-foreground h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">#{channel.name}</p>
                        {channel.purpose?.value && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {channel.purpose.value}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {channel.is_private && (
                        <Badge variant="secondary">Private</Badge>
                      )}
                      <Badge variant="outline">{messageCount} messages</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Import Options */}
      <Card>
        <CardHeader>
          <CardTitle>Import Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Import Users</Label>
              <p className="text-xs text-muted-foreground">
                Create user accounts for Slack users
              </p>
            </div>
            <Switch
              checked={config.options.importUsers}
              onCheckedChange={(checked) =>
                handleOptionChange("importUsers", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Skip Bot Users</Label>
              <p className="text-xs text-muted-foreground">
                Exclude Slack bots from import
              </p>
            </div>
            <Switch
              checked={config.options.skipBots}
              onCheckedChange={(checked) =>
                handleOptionChange("skipBots", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Import Attachments</Label>
              <p className="text-xs text-muted-foreground">
                Include file attachments in messages
              </p>
            </div>
            <Switch
              checked={config.options.importAttachments}
              onCheckedChange={(checked) =>
                handleOptionChange("importAttachments", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Import Reactions</Label>
              <p className="text-xs text-muted-foreground">
                Include emoji reactions on messages
              </p>
            </div>
            <Switch
              checked={config.options.importReactions}
              onCheckedChange={(checked) =>
                handleOptionChange("importReactions", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc">
              {warnings.map((warning, index) => (
                <li key={index}>{warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep("upload")}>
          Back
        </Button>
        <Button onClick={startImport} disabled={selectedChannels.size === 0}>
          Start Import
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Render importing step
  const renderImportingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
            <div>
              <h3 className="text-xl font-semibold">Importing Slack data...</h3>
              <p className="text-muted-foreground">
                This may take a few minutes for large workspaces
              </p>
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {importProgress}% complete
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render complete step
  const renderCompleteStep = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Import Complete!</h3>
              <p className="text-muted-foreground">
                Your Slack data has been imported successfully
              </p>
            </div>
            <div className="mx-auto grid max-w-md grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {preview?.stats.totalUsers || 0}
                </p>
                <p className="text-sm text-muted-foreground">Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{selectedChannels.size}</p>
                <p className="text-sm text-muted-foreground">Channels</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {preview?.stats.totalMessages || 0}
                </p>
                <p className="text-sm text-muted-foreground">Messages</p>
              </div>
            </div>
            <Button
              onClick={() => onImportComplete?.({ success: true, stats: {} })}
            >
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render current step
  const renderStep = () => {
    switch (step) {
      case "upload":
        return renderUploadStep();
      case "review":
        return renderReviewStep();
      case "importing":
        return renderImportingStep();
      case "complete":
        return renderCompleteStep();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-[#4A154B] p-3">
          <svg
            className="h-8 w-8 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Import from Slack</h2>
          <p className="text-muted-foreground">
            Import your Slack workspace data including users, channels, and
            messages
          </p>
        </div>
      </div>

      {renderStep()}

      {step !== "complete" && step !== "importing" && (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export default SlackImport;
