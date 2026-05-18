"use client";

import * as React from "react";
import {
  Upload,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  AlertTriangle,
  X,
  MessageSquare,
  Users,
  Hash,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  detectImportFormat,
  parseWhatsAppExport,
  parseTelegramExport,
  parseNchatExport,
  estimateImportTime,
  type ImportPlatform,
  type ConflictResolution,
  type ImportProgress,
  type ImportStats,
  type ParsedImportData,
} from "@/services/import";

interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "direct" | "group";
}

interface ConversationImportProps {
  channels: Channel[];
  onImportComplete?: (stats: ImportStats) => void;
  className?: string;
}

const PLATFORM_INFO: Record<
  ImportPlatform,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
    fileTypes: string;
    instructions: string;
  }
> = {
  nchat: {
    label: "nchat Export",
    description: "Re-import a previous nchat export",
    icon: <MessageSquare className="h-5 w-5" />,
    fileTypes: ".json",
    instructions: "Upload a JSON file from a previous nchat export.",
  },
  whatsapp: {
    label: "WhatsApp",
    description: "Import from WhatsApp export",
    icon: <MessageSquare className="h-5 w-5 text-green-500" />,
    fileTypes: ".txt,.zip",
    instructions:
      'In WhatsApp, open a chat, tap More > Export chat, and choose "Without media". Upload the .txt file.',
  },
  telegram: {
    label: "Telegram",
    description: "Import from Telegram export",
    icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
    fileTypes: ".json,.html",
    instructions:
      "In Telegram Desktop, go to Settings > Advanced > Export Data. Choose JSON format and upload the result.json file.",
  },
  slack: {
    label: "Slack",
    description: "Import from Slack export",
    icon: <Hash className="h-5 w-5 text-purple-500" />,
    fileTypes: ".zip,.json",
    instructions:
      "From Slack admin, export your workspace data. Upload the ZIP file or extracted JSON files.",
  },
  discord: {
    label: "Discord",
    description: "Import from Discord export",
    icon: <Hash className="h-5 w-5 text-indigo-500" />,
    fileTypes: ".json",
    instructions:
      "Use a Discord data export tool like DiscordChatExporter. Upload the JSON export file.",
  },
  generic: {
    label: "Generic",
    description: "Import from CSV or JSON",
    icon: <FileText className="h-5 w-5" />,
    fileTypes: ".json,.csv",
    instructions: "Upload a JSON or CSV file with message data.",
  },
};

const CONFLICT_OPTIONS: Array<{
  value: ConflictResolution;
  label: string;
  description: string;
}> = [
  {
    value: "skip",
    label: "Skip Duplicates",
    description: "Keep existing messages, skip imports",
  },
  {
    value: "overwrite",
    label: "Overwrite",
    description: "Replace existing with imported",
  },
  {
    value: "duplicate",
    label: "Create Copies",
    description: "Import as new messages",
  },
  {
    value: "merge",
    label: "Merge",
    description: "Combine content and metadata",
  },
];

/**
 * ConversationImport - Comprehensive import dialog for conversation history
 */
export function ConversationImport({
  channels,
  onImportComplete,
  className,
}: ConversationImportProps) {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<
    "upload" | "preview" | "options" | "progress" | "complete"
  >("upload");

  // File state
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<ParsedImportData | null>(
    null,
  );
  const [parseError, setParseError] = React.useState<string | null>(null);

  // Import options
  const [platform, setPlatform] = React.useState<ImportPlatform | null>(null);
  const [targetChannelId, setTargetChannelId] = React.useState<string>("");
  const [createMissingChannels, setCreateMissingChannels] =
    React.useState(true);
  const [createMissingUsers, setCreateMissingUsers] = React.useState(false);
  const [importMedia, setImportMedia] = React.useState(true);
  const [importReactions, setImportReactions] = React.useState(true);
  const [importThreads, setImportThreads] = React.useState(true);
  const [preserveTimestamps, setPreserveTimestamps] = React.useState(true);
  const [conflictResolution, setConflictResolution] =
    React.useState<ConflictResolution>("skip");

  // Progress state
  const [progress, setProgress] = React.useState<ImportProgress>({
    status: "pending",
    phase: "",
    progress: 0,
    itemsProcessed: 0,
    totalItems: 0,
    errors: [],
    warnings: [],
  });
  const [stats, setStats] = React.useState<ImportStats | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);

    try {
      const content = await selectedFile.text();
      const detectedPlatform = detectImportFormat(content);
      setPlatform(detectedPlatform);

      // Parse the file
      let parsed: ParsedImportData;

      switch (detectedPlatform) {
        case "whatsapp":
          parsed = parseWhatsAppExport(content);
          break;
        case "telegram":
          parsed = parseTelegramExport(content);
          break;
        case "nchat":
          parsed = parseNchatExport(content);
          break;
        default:
          throw new Error(`Unsupported format: ${detectedPlatform}`);
      }

      setParsedData(parsed);
      setStep("preview");
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "Failed to parse file",
      );
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // Trigger the same logic as file input
      const event = {
        target: { files: [droppedFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleFileSelect(event);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImport = async () => {
    if (!parsedData || !platform) return;

    setStep("progress");
    setProgress({
      status: "importing",
      phase: "Starting import...",
      progress: 0,
      itemsProcessed: 0,
      totalItems:
        parsedData.users.length +
        parsedData.channels.length +
        parsedData.messages.length,
      errors: [],
      warnings: [],
    });

    try {
      const response = await fetch("/api/conversations/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          data: parsedData,
          options: {
            platform,
            targetChannelId: targetChannelId || undefined,
            createMissingChannels,
            createMissingUsers,
            importMedia,
            importReactions,
            importThreads,
            preserveTimestamps,
            conflictResolution,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();

      setStats(result.stats);
      setProgress({
        status: "completed",
        phase: "Complete",
        progress: 100,
        itemsProcessed: result.stats.messagesImported,
        totalItems: result.stats.messagesImported,
        errors: result.errors || [],
        warnings: result.warnings || [],
      });
      setStep("complete");

      onImportComplete?.(result.stats);

      toast({
        title: "Import complete",
        description: `Successfully imported ${result.stats.messagesImported} messages`,
      });
    } catch (error) {
      setProgress({
        status: "failed",
        phase: "Failed",
        progress: 0,
        itemsProcessed: 0,
        totalItems: 0,
        errors: [
          {
            code: "IMPORT_FAILED",
            message: error instanceof Error ? error.message : "Import failed",
            recoverable: false,
          },
        ],
        warnings: [],
      });

      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after close animation
    setTimeout(() => {
      setStep("upload");
      setFile(null);
      setParsedData(null);
      setParseError(null);
      setPlatform(null);
      setProgress({
        status: "pending",
        phase: "",
        progress: 0,
        itemsProcessed: 0,
        totalItems: 0,
        errors: [],
        warnings: [],
      });
      setStats(null);
    }, 200);
  };

  const estimatedTime = parsedData
    ? Math.ceil(estimateImportTime(parsedData) / 1000)
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Conversations
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload an export file from another platform"}
            {step === "preview" && "Review the data before importing"}
            {step === "options" && "Configure import options"}
            {step === "progress" && "Importing your conversations..."}
            {step === "complete" && "Import completed"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 py-4">
            {/* File Drop Zone */}
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center hover:border-muted-foreground/50 cursor-pointer transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="font-medium">Drop file here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports WhatsApp, Telegram, Slack, Discord, and nchat exports
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,.zip,.csv,.html"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Parse Error</AlertTitle>
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            {/* Platform Info */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Supported Platforms</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PLATFORM_INFO)
                  .filter(([key]) => key !== "generic")
                  .map(([key, info]) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-md border p-2 text-sm"
                    >
                      {info.icon}
                      <span>{info.label}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {step === "preview" && parsedData && platform && (
          <div className="space-y-4 py-4">
            {/* Platform Detection */}
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>Detected: {PLATFORM_INFO[platform].label}</AlertTitle>
              <AlertDescription>
                {file?.name} ({(file?.size || 0 / 1024).toFixed(1)} KB)
              </AlertDescription>
            </Alert>

            {/* Preview Stats */}
            <div className="grid grid-cols-3 gap-4 bg-muted/50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {parsedData.messages.length}
                </p>
                <p className="text-sm text-muted-foreground">Messages</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{parsedData.users.length}</p>
                <p className="text-sm text-muted-foreground">Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {parsedData.channels.length}
                </p>
                <p className="text-sm text-muted-foreground">Channels</p>
              </div>
            </div>

            {/* Date Range */}
            {parsedData.messages.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Date range:{" "}
                {new Date(
                  parsedData.messages[0].createdAt,
                ).toLocaleDateString()}{" "}
                -{" "}
                {new Date(
                  parsedData.messages[parsedData.messages.length - 1].createdAt,
                ).toLocaleDateString()}
              </div>
            )}

            {/* Channels Preview */}
            {parsedData.channels.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Channels Found</Label>
                <ScrollArea className="h-[120px] rounded-md border p-2">
                  <div className="space-y-1">
                    {parsedData.channels.map((channel) => (
                      <div
                        key={channel.externalId}
                        className="flex items-center gap-2 p-1 text-sm"
                      >
                        <Hash className="h-3 w-3" />
                        <span>{channel.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {channel.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Users Preview */}
            {parsedData.users.length > 0 && parsedData.users.length <= 20 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Users Found</Label>
                <div className="flex flex-wrap gap-2">
                  {parsedData.users.map((user) => (
                    <Badge key={user.externalId} variant="secondary">
                      {user.displayName || user.username}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated Time */}
            <div className="text-sm text-muted-foreground">
              Estimated import time: ~{estimatedTime} seconds
            </div>
          </div>
        )}

        {step === "options" && (
          <div className="space-y-4 py-4">
            {/* Target Channel */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Import Destination</Label>
              <Select
                value={targetChannelId}
                onValueChange={setTargetChannelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keep original channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keep original channels</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      #{channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Import all messages to a single channel, or preserve the
                original structure
              </p>
            </div>

            <Separator />

            {/* Content Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Import Options</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createChannels"
                    checked={createMissingChannels}
                    onCheckedChange={(c) => setCreateMissingChannels(!!c)}
                  />
                  <Label
                    htmlFor="createChannels"
                    className="text-sm cursor-pointer"
                  >
                    Create missing channels
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createUsers"
                    checked={createMissingUsers}
                    onCheckedChange={(c) => setCreateMissingUsers(!!c)}
                  />
                  <Label
                    htmlFor="createUsers"
                    className="text-sm cursor-pointer"
                  >
                    Create missing users
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="importMedia"
                    checked={importMedia}
                    onCheckedChange={(c) => setImportMedia(!!c)}
                  />
                  <Label
                    htmlFor="importMedia"
                    className="text-sm cursor-pointer"
                  >
                    Import media files
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="importReactions"
                    checked={importReactions}
                    onCheckedChange={(c) => setImportReactions(!!c)}
                  />
                  <Label
                    htmlFor="importReactions"
                    className="text-sm cursor-pointer"
                  >
                    Import reactions
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="importThreads"
                    checked={importThreads}
                    onCheckedChange={(c) => setImportThreads(!!c)}
                  />
                  <Label
                    htmlFor="importThreads"
                    className="text-sm cursor-pointer"
                  >
                    Import threads
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="preserveTimestamps"
                    checked={preserveTimestamps}
                    onCheckedChange={(c) => setPreserveTimestamps(!!c)}
                  />
                  <Label
                    htmlFor="preserveTimestamps"
                    className="text-sm cursor-pointer"
                  >
                    Preserve timestamps
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Conflict Resolution */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Duplicate Handling</Label>
              <RadioGroup
                value={conflictResolution}
                onValueChange={(v) =>
                  setConflictResolution(v as ConflictResolution)
                }
                className="space-y-2"
              >
                {CONFLICT_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`conflict-${option.value}`}
                    />
                    <Label
                      htmlFor={`conflict-${option.value}`}
                      className="flex flex-col cursor-pointer"
                    >
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {step === "progress" && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center justify-center text-center">
              {progress.status === "importing" && (
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              )}
              {progress.status === "failed" && (
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              )}
              <p className="font-medium">{progress.phase}</p>
              <p className="text-sm text-muted-foreground">
                {progress.itemsProcessed > 0 &&
                  `${progress.itemsProcessed.toLocaleString()} / ${progress.totalItems.toLocaleString()} items`}
              </p>
            </div>
            <Progress value={progress.progress} className="h-2" />

            {progress.warnings.length > 0 && (
              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warnings</AlertTitle>
                <AlertDescription>
                  {progress.warnings.length} warning(s) occurred
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === "complete" && stats && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Check className="h-12 w-12 text-green-500 mb-4" />
              <p className="font-medium text-lg">Import Complete</p>
              <p className="text-sm text-muted-foreground">
                Your conversations have been imported
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/50 rounded-lg p-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Messages Imported
                </p>
                <p className="text-lg font-medium">
                  {stats.messagesImported.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Skipped</p>
                <p className="text-lg font-medium">{stats.messagesSkipped}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-lg font-medium">
                  {stats.usersCreated} created, {stats.usersMatched} matched
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-lg font-medium">
                  {(stats.duration / 1000).toFixed(1)}s
                </p>
              </div>
            </div>

            {(progress.errors.length > 0 || progress.warnings.length > 0) && (
              <div className="space-y-2">
                {progress.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{progress.errors.length} Error(s)</AlertTitle>
                    <AlertDescription>
                      {progress.errors[0].message}
                      {progress.errors.length > 1 &&
                        ` and ${progress.errors.length - 1} more`}
                    </AlertDescription>
                  </Alert>
                )}
                {progress.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                      {progress.warnings.length} Warning(s)
                    </AlertTitle>
                    <AlertDescription>
                      {progress.warnings[0].message}
                      {progress.warnings.length > 1 &&
                        ` and ${progress.warnings.length - 1} more`}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setParsedData(null);
                }}
              >
                Back
              </Button>
              <Button onClick={() => setStep("options")}>Continue</Button>
            </>
          )}
          {step === "options" && (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {parsedData?.messages.length.toLocaleString()} Messages
              </Button>
            </>
          )}
          {step === "progress" && progress.status !== "failed" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {(step === "complete" || progress.status === "failed") && (
            <Button onClick={handleClose}>
              {progress.status === "failed" ? "Close" : "Done"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConversationImport;
