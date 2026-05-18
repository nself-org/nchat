"use client";

import * as React from "react";
import {
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
  Users,
  Hash,
  MessageSquare,
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
import type {
  ImportSource,
  ImportConfig,
  ImportProgress,
  ImportPreview,
  ImportError,
  ImportWarning,
} from "@/lib/import-export/types";
import {
  createDefaultImportConfig,
  estimateImportDuration,
} from "@/lib/import-export/import-service";

// ============================================================================
// TYPES
// ============================================================================

interface ImportWizardProps {
  onComplete?: (result: {
    success: boolean;
    stats: Record<string, number>;
  }) => void;
  onCancel?: () => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "source",
    title: "Select Source",
    description: "Choose where to import from",
  },
  {
    id: "upload",
    title: "Upload File",
    description: "Upload your export file",
  },
  {
    id: "mapping",
    title: "Map Fields",
    description: "Configure field mappings",
  },
  { id: "preview", title: "Preview", description: "Review data before import" },
  { id: "import", title: "Import", description: "Import your data" },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ImportWizard({ onComplete, onCancel }: ImportWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [source, setSource] = React.useState<ImportSource | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [config, setConfig] = React.useState<ImportConfig | null>(null);
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [progress, setProgress] = React.useState<ImportProgress | null>(null);
  const [errors, setErrors] = React.useState<ImportError[]>([]);
  const [warnings, setWarnings] = React.useState<ImportWarning[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const canGoNext = React.useMemo(() => {
    switch (currentStep) {
      case 0:
        return source !== null;
      case 1:
        return file !== null && preview !== null;
      case 2:
        return config !== null;
      case 3:
        return true;
      case 4:
        return progress?.status === "completed";
      default:
        return false;
    }
  }, [currentStep, source, file, preview, config, progress]);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSourceSelect = (selectedSource: ImportSource) => {
    setSource(selectedSource);
    setConfig(createDefaultImportConfig(selectedSource));
  };

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setErrors([]);
    setWarnings([]);

    try {
      // Parse the file based on source type
      if (source === "slack") {
        const { parseSlackExportFile } =
          await import("@/lib/import-export/slack-parser");
        const result = await parseSlackExportFile(uploadedFile);
        setPreview(result.preview);
        setErrors(result.errors);
        setWarnings(result.warnings);
      } else if (source === "discord") {
        const { parseDiscordExportFile } =
          await import("@/lib/import-export/discord-parser");
        const result = await parseDiscordExportFile(uploadedFile);
        setPreview(result.preview);
        setErrors(result.errors);
        setWarnings(result.warnings);
      } else {
        // Generic JSON import
        const content = await uploadedFile.text();
        const data = JSON.parse(content);
        setPreview({
          users: data.users || [],
          channels: data.channels || [],
          messages: data.messages || [],
          stats: {
            totalUsers: data.users?.length || 0,
            totalChannels: data.channels?.length || 0,
            totalMessages: data.messages?.length || 0,
            dateRange: {},
          },
        });
      }
    } catch (error) {
      setErrors([
        {
          code: "PARSE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to parse file",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfigChange = (updates: Partial<ImportConfig["options"]>) => {
    if (config) {
      setConfig({
        ...config,
        options: { ...config.options, ...updates },
      });
    }
  };

  const handleStartImport = async () => {
    if (!config || !preview) return;

    setIsProcessing(true);
    setProgress({
      status: "pending",
      currentStep: 0,
      totalSteps: 5,
      itemsProcessed: 0,
      totalItems:
        preview.stats.totalUsers +
        preview.stats.totalChannels +
        preview.stats.totalMessages,
      errors: [],
      warnings: [],
    });

    try {
      // Make API call to start import
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          preview,
        }),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();

      setProgress({
        status: "completed",
        currentStep: 5,
        totalSteps: 5,
        itemsProcessed:
          preview.stats.totalUsers +
          preview.stats.totalChannels +
          preview.stats.totalMessages,
        totalItems:
          preview.stats.totalUsers +
          preview.stats.totalChannels +
          preview.stats.totalMessages,
        errors: result.errors || [],
        warnings: result.warnings || [],
      });

      onComplete?.({
        success: true,
        stats: result.stats,
      });
    } catch (error) {
      setProgress({
        status: "failed",
        currentStep: 0,
        totalSteps: 5,
        itemsProcessed: 0,
        totalItems: 0,
        errors: [
          {
            code: "IMPORT_ERROR",
            message: error instanceof Error ? error.message : "Import failed",
          },
        ],
        warnings: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8 flex items-center justify-between">
      {WIZARD_STEPS.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium",
                index < currentStep
                  ? "text-primary-foreground bg-primary"
                  : index === currentStep
                    ? "text-primary-foreground bg-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {index < currentStep ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </div>
            <span className="mt-2 max-w-[80px] text-center text-xs">
              {step.title}
            </span>
          </div>
          {index < WIZARD_STEPS.length - 1 && (
            <div
              className={cn(
                "mx-2 h-0.5 flex-1",
                index < currentStep ? "bg-primary" : "bg-muted",
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderSourceStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SourceCard
          title="Slack"
          description="Import from a Slack workspace export"
          icon={<FileJson className="h-8 w-8" />}
          selected={source === "slack"}
          onClick={() => handleSourceSelect("slack")}
        />
        <SourceCard
          title="Discord"
          description="Import from a Discord server export"
          icon={<FileJson className="h-8 w-8" />}
          selected={source === "discord"}
          onClick={() => handleSourceSelect("discord")}
        />
        <SourceCard
          title="JSON File"
          description="Import from a generic JSON file"
          icon={<FileText className="h-8 w-8" />}
          selected={source === "file"}
          onClick={() => handleSourceSelect("file")}
        />
      </div>
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-6">
      <FileUploader
        source={source}
        onFileSelect={handleFileUpload}
        isProcessing={isProcessing}
        file={file}
      />

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errors found</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc">
              {errors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

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

      {preview && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<Users />}
            label="Users"
            value={preview.stats.totalUsers}
          />
          <StatCard
            icon={<Hash />}
            label="Channels"
            value={preview.stats.totalChannels}
          />
          <StatCard
            icon={<MessageSquare />}
            label="Messages"
            value={preview.stats.totalMessages}
          />
        </div>
      )}
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Options</CardTitle>
          <CardDescription>Configure what to import and how</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="import-users">Import Users</Label>
            <Switch
              id="import-users"
              checked={config?.options.importUsers}
              onCheckedChange={(checked) =>
                handleConfigChange({ importUsers: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="import-channels">Import Channels</Label>
            <Switch
              id="import-channels"
              checked={config?.options.importChannels}
              onCheckedChange={(checked) =>
                handleConfigChange({ importChannels: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="import-messages">Import Messages</Label>
            <Switch
              id="import-messages"
              checked={config?.options.importMessages}
              onCheckedChange={(checked) =>
                handleConfigChange({ importMessages: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="import-attachments">Import Attachments</Label>
            <Switch
              id="import-attachments"
              checked={config?.options.importAttachments}
              onCheckedChange={(checked) =>
                handleConfigChange({ importAttachments: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="import-reactions">Import Reactions</Label>
            <Switch
              id="import-reactions"
              checked={config?.options.importReactions}
              onCheckedChange={(checked) =>
                handleConfigChange({ importReactions: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="skip-bots">Skip Bot Users</Label>
            <Switch
              id="skip-bots"
              checked={config?.options.skipBots}
              onCheckedChange={(checked) =>
                handleConfigChange({ skipBots: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="skip-system">Skip System Messages</Label>
            <Switch
              id="skip-system"
              checked={config?.options.skipSystemMessages}
              onCheckedChange={(checked) =>
                handleConfigChange({ skipSystemMessages: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="deduplicate">Deduplicate Users</Label>
            <Switch
              id="deduplicate"
              checked={config?.options.deduplicateUsers}
              onCheckedChange={(checked) =>
                handleConfigChange({ deduplicateUsers: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
          <CardDescription>Review what will be imported</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {config?.options.importUsers && (
              <div className="flex justify-between border-b py-2">
                <span>Users</span>
                <span className="font-medium">
                  {preview?.stats.totalUsers || 0}
                </span>
              </div>
            )}
            {config?.options.importChannels && (
              <div className="flex justify-between border-b py-2">
                <span>Channels</span>
                <span className="font-medium">
                  {preview?.stats.totalChannels || 0}
                </span>
              </div>
            )}
            {config?.options.importMessages && (
              <div className="flex justify-between border-b py-2">
                <span>Messages</span>
                <span className="font-medium">
                  {preview?.stats.totalMessages || 0}
                </span>
              </div>
            )}
            {preview?.stats.dateRange.earliest && (
              <div className="flex justify-between border-b py-2">
                <span>Date Range</span>
                <span className="text-sm font-medium">
                  {new Date(
                    preview.stats.dateRange.earliest,
                  ).toLocaleDateString()}{" "}
                  -{" "}
                  {preview.stats.dateRange.latest
                    ? new Date(
                        preview.stats.dateRange.latest,
                      ).toLocaleDateString()
                    : "Now"}
                </span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span>Estimated Time</span>
              <span className="font-medium">
                {formatDuration(
                  estimateImportDuration(
                    config?.options.importUsers
                      ? preview?.stats.totalUsers || 0
                      : 0,
                    config?.options.importChannels
                      ? preview?.stats.totalChannels || 0
                      : 0,
                    config?.options.importMessages
                      ? preview?.stats.totalMessages || 0
                      : 0,
                  ),
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {(errors.length > 0 || warnings.length > 0) && (
        <Alert variant={errors.length > 0 ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{errors.length > 0 ? "Errors" : "Warnings"}</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc">
              {errors.map((error, index) => (
                <li key={`error-${index}`} className="text-destructive">
                  {error.message}
                </li>
              ))}
              {warnings.map((warning, index) => (
                <li key={`warning-${index}`}>{warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-6">
      {!progress || progress.status === "pending" ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Ready to Import</h3>
                <p className="text-sm text-muted-foreground">
                  Click the button below to start the import process
                </p>
              </div>
              <Button onClick={handleStartImport} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start Import"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {progress.status === "completed"
                    ? "Import Complete"
                    : progress.status === "failed"
                      ? "Import Failed"
                      : `Importing ${progress.currentItem || "..."}`}
                </span>
                <span className="text-sm text-muted-foreground">
                  {progress.itemsProcessed} / {progress.totalItems}
                </span>
              </div>
              <Progress
                value={(progress.itemsProcessed / progress.totalItems) * 100}
                className="h-2"
              />
              {progress.status === "completed" && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    Your data has been imported successfully.
                  </AlertDescription>
                </Alert>
              )}
              {progress.status === "failed" && progress.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Import Failed</AlertTitle>
                  <AlertDescription>
                    {progress.errors[0].message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderSourceStep();
      case 1:
        return renderUploadStep();
      case 2:
        return renderMappingStep();
      case 3:
        return renderPreviewStep();
      case 4:
        return renderImportStep();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {renderStepIndicator()}

      <div className="min-h-[400px]">{renderCurrentStep()}</div>

      <div className="flex justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : handleBack}
        >
          {currentStep === 0 ? (
            "Cancel"
          ) : (
            <>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </>
          )}
        </Button>
        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canGoNext || isProcessing}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          progress?.status === "completed" && (
            <Button onClick={() => onComplete?.({ success: true, stats: {} })}>
              Done
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface SourceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}

function SourceCard({
  title,
  description,
  icon,
  selected,
  onClick,
}: SourceCardProps) {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary",
        selected && "bg-primary/5 border-primary",
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div
            className={cn(
              "rounded-full p-3",
              selected ? "text-primary-foreground bg-primary" : "bg-muted",
            )}
          >
            {icon}
          </div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface FileUploaderProps {
  source: ImportSource | null;
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  file: File | null;
}

function FileUploader({
  source,
  onFileSelect,
  isProcessing,
  file,
}: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const acceptedTypes =
    source === "slack" ? ".zip" : source === "discord" ? ".json" : ".json";

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isProcessing ? "opacity-50" : "cursor-pointer hover:border-primary",
      )}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-label="Upload file"
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleChange}
        className="hidden"
        disabled={isProcessing}
        aria-label="Select file to upload"
      />
      {isProcessing ? (
        <div className="space-y-2">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p>Processing file...</p>
        </div>
      ) : file ? (
        <div className="space-y-2">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
          <p className="font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(file.size)} - Click to change
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Drop your file here or click to browse</p>
          <p className="text-sm text-muted-foreground">
            {source === "slack"
              ? "Upload a Slack export ZIP file"
              : source === "discord"
                ? "Upload a Discord export JSON file"
                : "Upload a JSON file"}
          </p>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted p-2">{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
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

function formatDuration(ms: number): string {
  if (ms < 1000) return "Less than a second";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? "s" : ""}`;
}

export default ImportWizard;
