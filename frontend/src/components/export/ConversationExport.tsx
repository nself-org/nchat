"use client";

import * as React from "react";
import {
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
  Code,
  Loader2,
  Check,
  AlertCircle,
  X,
  Settings2,
  Calendar,
  Link2,
  Image,
  MessageSquare,
  Users,
  Hash,
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
import { useToast } from "@/hooks/use-toast";
import type {
  ExportFormat,
  ExportScope,
  MediaHandling,
  ExportOptions,
  ExportProgress,
  ExportStats,
} from "@/services/export";

interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "direct" | "group";
  messageCount?: number;
}

interface ConversationExportProps {
  channels: Channel[];
  selectedChannelIds?: string[];
  onExportComplete?: (stats: ExportStats) => void;
  className?: string;
}

const FORMAT_OPTIONS: Array<{
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "json",
    label: "JSON",
    description: "Full fidelity, machine-readable",
    icon: <FileJson className="h-4 w-4" />,
  },
  {
    value: "html",
    label: "HTML",
    description: "Human-readable archive",
    icon: <Code className="h-4 w-4" />,
  },
  {
    value: "text",
    label: "Plain Text",
    description: "Simple transcript",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    value: "csv",
    label: "CSV",
    description: "For spreadsheet analysis",
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
];

const SCOPE_OPTIONS: Array<{
  value: ExportScope;
  label: string;
  description: string;
}> = [
  {
    value: "single_conversation",
    label: "Single Conversation",
    description: "Export one channel only",
  },
  {
    value: "multiple_conversations",
    label: "Selected Channels",
    description: "Export multiple selected channels",
  },
  {
    value: "user_messages_only",
    label: "My Messages Only",
    description: "Only your own messages across channels",
  },
  {
    value: "full_channel",
    label: "Full Channel Export",
    description: "Complete channel history (admin only)",
  },
];

const MEDIA_OPTIONS: Array<{
  value: MediaHandling;
  label: string;
  description: string;
}> = [
  {
    value: "link",
    label: "Include Links",
    description: "Keep URLs to media files",
  },
  {
    value: "embed",
    label: "Embed Files",
    description: "Include files in export (larger size)",
  },
  {
    value: "exclude",
    label: "Exclude Media",
    description: "Text content only",
  },
];

/**
 * ConversationExport - Comprehensive export dialog for conversation history
 */
export function ConversationExport({
  channels,
  selectedChannelIds: initialSelectedIds,
  onExportComplete,
  className,
}: ConversationExportProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<
    "options" | "channels" | "progress" | "complete"
  >("options");

  // Export options
  const [format, setFormat] = React.useState<ExportFormat>("json");
  const [scope, setScope] = React.useState<ExportScope>(
    "multiple_conversations",
  );
  const [mediaHandling, setMediaHandling] =
    React.useState<MediaHandling>("link");
  const [selectedChannelIds, setSelectedChannelIds] = React.useState<string[]>(
    initialSelectedIds || [],
  );

  // Content options
  const [includeThreads, setIncludeThreads] = React.useState(true);
  const [includeReactions, setIncludeReactions] = React.useState(true);
  const [includePins, setIncludePins] = React.useState(true);
  const [includeEditHistory, setIncludeEditHistory] = React.useState(false);
  const [includeDeletedMarkers, setIncludeDeletedMarkers] =
    React.useState(false);
  const [anonymizeUsers, setAnonymizeUsers] = React.useState(false);

  // Date range
  const [useDateRange, setUseDateRange] = React.useState(false);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  // Progress state
  const [progress, setProgress] = React.useState<ExportProgress>({
    status: "pending",
    progress: 0,
    currentPhase: "",
    itemsProcessed: 0,
    totalItems: 0,
  });
  const [stats, setStats] = React.useState<ExportStats | null>(null);

  const handleExport = async () => {
    setStep("progress");
    setProgress({
      status: "processing",
      progress: 0,
      currentPhase: "Preparing export...",
      itemsProcessed: 0,
      totalItems: 0,
    });

    try {
      const options: ExportOptions = {
        format,
        scope,
        channelIds: selectedChannelIds,
        mediaHandling,
        includeThreads,
        includeReactions,
        includePins,
        includeEditHistory,
        includeDeletedMarkers,
        userMessagesOnly: scope === "user_messages_only",
        anonymizeUsers,
        ...(useDateRange && startDate && endDate
          ? {
              dateRange: {
                start: new Date(startDate),
                end: new Date(endDate),
              },
            }
          : {}),
      };

      // Call export API
      const response = await fetch("/api/conversations/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Handle file download
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch?.[1] || `conversation-export.${format}`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Parse stats from response headers if available
      const exportStats: ExportStats = {
        totalMessages: parseInt(
          response.headers.get("X-Export-Messages") || "0",
        ),
        totalThreads: 0,
        totalReactions: 0,
        totalMedia: 0,
        totalPins: 0,
        totalEdits: 0,
        totalDeleted: 0,
        channels: selectedChannelIds.length,
        users: 0,
        fileSizeBytes: blob.size,
        duration: 0,
      };

      setStats(exportStats);
      setProgress({
        status: "completed",
        progress: 100,
        currentPhase: "Complete",
        itemsProcessed: exportStats.totalMessages,
        totalItems: exportStats.totalMessages,
      });
      setStep("complete");

      onExportComplete?.(exportStats);

      toast({
        title: "Export complete",
        description: `Successfully exported ${exportStats.totalMessages} messages`,
      });
    } catch (error) {
      setProgress({
        status: "failed",
        progress: 0,
        currentPhase: "Failed",
        itemsProcessed: 0,
        totalItems: 0,
      });

      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId],
    );
  };

  const handleSelectAll = () => {
    setSelectedChannelIds(channels.map((c) => c.id));
  };

  const handleSelectNone = () => {
    setSelectedChannelIds([]);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after close animation
    setTimeout(() => {
      setStep("options");
      setProgress({
        status: "pending",
        progress: 0,
        currentPhase: "",
        itemsProcessed: 0,
        totalItems: 0,
      });
      setStats(null);
    }, 200);
  };

  const getChannelIcon = (type: Channel["type"]) => {
    switch (type) {
      case "direct":
        return <Users className="h-4 w-4" />;
      case "private":
        return <Hash className="h-4 w-4 opacity-50" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Conversations
          </DialogTitle>
          <DialogDescription>
            {step === "options" && "Choose your export format and options"}
            {step === "channels" && "Select which channels to export"}
            {step === "progress" && "Exporting your conversations..."}
            {step === "complete" && "Export completed successfully"}
          </DialogDescription>
        </DialogHeader>

        {step === "options" && (
          <div className="space-y-6 py-4">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Format</Label>
              <RadioGroup
                value={format}
                onValueChange={(v) => setFormat(v as ExportFormat)}
                className="grid grid-cols-2 gap-3"
              >
                {FORMAT_OPTIONS.map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={`format-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`format-${option.value}`}
                      className="flex items-center gap-3 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      {option.icon}
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Scope Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Scope</Label>
              <RadioGroup
                value={scope}
                onValueChange={(v) => setScope(v as ExportScope)}
                className="space-y-2"
              >
                {SCOPE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`scope-${option.value}`}
                    />
                    <Label
                      htmlFor={`scope-${option.value}`}
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

            <Separator />

            {/* Media Handling */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Media Files</Label>
              <RadioGroup
                value={mediaHandling}
                onValueChange={(v) => setMediaHandling(v as MediaHandling)}
                className="flex gap-4"
              >
                {MEDIA_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`media-${option.value}`}
                    />
                    <Label
                      htmlFor={`media-${option.value}`}
                      className="cursor-pointer text-sm"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Content Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Include in Export</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="threads"
                    checked={includeThreads}
                    onCheckedChange={(c) => setIncludeThreads(!!c)}
                  />
                  <Label htmlFor="threads" className="text-sm cursor-pointer">
                    Threads & Replies
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reactions"
                    checked={includeReactions}
                    onCheckedChange={(c) => setIncludeReactions(!!c)}
                  />
                  <Label htmlFor="reactions" className="text-sm cursor-pointer">
                    Reactions
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pins"
                    checked={includePins}
                    onCheckedChange={(c) => setIncludePins(!!c)}
                  />
                  <Label htmlFor="pins" className="text-sm cursor-pointer">
                    Pinned Messages
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="editHistory"
                    checked={includeEditHistory}
                    onCheckedChange={(c) => setIncludeEditHistory(!!c)}
                  />
                  <Label
                    htmlFor="editHistory"
                    className="text-sm cursor-pointer"
                  >
                    Edit History
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deleted"
                    checked={includeDeletedMarkers}
                    onCheckedChange={(c) => setIncludeDeletedMarkers(!!c)}
                  />
                  <Label htmlFor="deleted" className="text-sm cursor-pointer">
                    Deleted Message Markers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymize"
                    checked={anonymizeUsers}
                    onCheckedChange={(c) => setAnonymizeUsers(!!c)}
                  />
                  <Label htmlFor="anonymize" className="text-sm cursor-pointer">
                    Anonymize Users
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Date Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Date Range Filter</Label>
                <Checkbox
                  id="useDateRange"
                  checked={useDateRange}
                  onCheckedChange={(c) => setUseDateRange(!!c)}
                />
              </div>
              {useDateRange && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label
                      htmlFor="startDate"
                      className="text-xs text-muted-foreground"
                    >
                      From
                    </Label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="flex-1">
                    <Label
                      htmlFor="endDate"
                      className="text-xs text-muted-foreground"
                    >
                      To
                    </Label>
                    <input
                      type="date"
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "channels" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedChannelIds.length} of {channels.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                  Clear
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[300px] rounded-md border p-2">
              <div className="space-y-1">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center space-x-3 rounded-md p-2 hover:bg-accent cursor-pointer"
                    onClick={() => handleChannelToggle(channel.id)}
                  >
                    <Checkbox
                      checked={selectedChannelIds.includes(channel.id)}
                      onCheckedChange={() => handleChannelToggle(channel.id)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {getChannelIcon(channel.type)}
                      <span className="font-medium">{channel.name}</span>
                      {channel.messageCount !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {channel.messageCount} messages
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === "progress" && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center justify-center text-center">
              {progress.status === "processing" && (
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              )}
              {progress.status === "failed" && (
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              )}
              <p className="font-medium">{progress.currentPhase}</p>
              <p className="text-sm text-muted-foreground">
                {progress.itemsProcessed > 0 &&
                  `${progress.itemsProcessed.toLocaleString()} items processed`}
              </p>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>
        )}

        {step === "complete" && stats && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Check className="h-12 w-12 text-green-500 mb-4" />
              <p className="font-medium text-lg">Export Complete</p>
              <p className="text-sm text-muted-foreground">
                Your file has been downloaded
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-muted/50 rounded-lg p-4">
              <div>
                <p className="text-sm text-muted-foreground">Messages</p>
                <p className="text-lg font-medium">
                  {stats.totalMessages.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Channels</p>
                <p className="text-lg font-medium">{stats.channels}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">File Size</p>
                <p className="text-lg font-medium">
                  {(stats.fileSizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Format</p>
                <p className="text-lg font-medium">{format.toUpperCase()}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "options" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {scope !== "user_messages_only" && scope !== "full_channel" ? (
                <Button onClick={() => setStep("channels")}>
                  Select Channels
                </Button>
              ) : (
                <Button onClick={handleExport}>Export</Button>
              )}
            </>
          )}
          {step === "channels" && (
            <>
              <Button variant="outline" onClick={() => setStep("options")}>
                Back
              </Button>
              <Button
                onClick={handleExport}
                disabled={selectedChannelIds.length === 0}
              >
                Export {selectedChannelIds.length} Channel
                {selectedChannelIds.length !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {step === "progress" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step === "complete" && <Button onClick={handleClose}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConversationExport;
