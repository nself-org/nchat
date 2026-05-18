"use client";

/**
 * Thread Summary Panel Component
 * Displays comprehensive thread summaries with action items
 */

import { useState } from "react";
import {
  Sparkles,
  Clock,
  Users,
  MessageSquare,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getThreadSummarizer,
  isThreadSummarizationAvailable,
  type Message,
  type ThreadSummaryResult,
} from "@/lib/ai/thread-summarizer";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface ThreadSummaryPanelProps {
  messages: Message[];
  threadId?: string;
  className?: string;
  autoGenerate?: boolean;
  onActionItemClick?: (actionItemId: string) => void;
}

export function ThreadSummaryPanel({
  messages,
  threadId,
  className,
  autoGenerate = false,
  onActionItemClick,
}: ThreadSummaryPanelProps) {
  const [summary, setSummary] = useState<ThreadSummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [isAIAvailable] = useState(isThreadSummarizationAvailable());
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (messages.length === 0) {
      setError("No messages to summarize");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const summarizer = getThreadSummarizer();
      const result = await summarizer.summarizeThread(messages);
      setSummary(result);

      toast({
        title: "Thread summary generated",
        description: `Quality score: ${result.qualityScore}%`,
      });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to generate summary";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;

    const text = `${summary.tldr}\n\nKey Points:\n${summary.keyPoints.map((p) => `- ${p}`).join("\n")}\n\nAction Items:\n${summary.actionItems.map((a) => `- ${a.description}`).join("\n")}`;

    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Thread summary copied successfully",
    });
  };

  const handleDownload = () => {
    if (!summary) return;

    const markdown = formatAsMarkdown(summary);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thread-summary-${threadId || Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Thread summary downloaded as Markdown",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      case "mixed":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Thread Summary
              {!isAIAvailable && (
                <Badge variant="outline" className="text-xs">
                  Basic
                </Badge>
              )}
              {summary && (
                <Badge
                  variant={summary.qualityScore >= 80 ? "default" : "secondary"}
                  className="text-xs"
                >
                  Quality: {summary.qualityScore}%
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              AI-powered analysis of {messages.length} messages
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {summary && (
              <>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
            {!summary && (
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerate}
                disabled={loading || messages.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {summary && expanded && (
        <CardContent className="space-y-6">
          {/* TL;DR */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" />
              TL;DR
            </h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {summary.tldr}
            </p>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {summary.metadata.messageCount} messages
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {summary.metadata.participantCount} participants
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(summary.metadata.duration)}
            </Badge>
            <Badge
              variant="secondary"
              className={cn(
                "flex items-center gap-1",
                getSentimentColor(summary.metadata.sentiment),
              )}
            >
              {summary.metadata.sentiment}
            </Badge>
            {summary.metadata.resolved && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </Badge>
            )}
          </div>

          {/* Key Points */}
          {summary.keyPoints.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Key Points</h4>
                <ul className="space-y-2">
                  {summary.keyPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-0.5 text-primary">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Action Items */}
          {summary.actionItems.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Action Items ({summary.actionItems.length})
                </h4>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {summary.actionItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "cursor-pointer rounded-lg border bg-card p-3 transition-colors hover:bg-accent",
                          item.status === "completed" && "opacity-60",
                        )}
                        role="button"
                        tabIndex={0}
                        onClick={() => onActionItemClick?.(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onActionItemClick?.(item.id);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {item.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : item.status === "in-progress" ? (
                              <Circle className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">
                              {item.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant={getPriorityColor(item.priority)}
                                className="text-xs"
                              >
                                {item.priority}
                              </Badge>
                              {item.assignee && (
                                <Badge variant="outline" className="text-xs">
                                  @{item.assignee}
                                </Badge>
                              )}
                              {item.dueDate && (
                                <Badge variant="outline" className="text-xs">
                                  Due:{" "}
                                  {new Date(item.dueDate).toLocaleDateString()}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Participants */}
          {summary.participants.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4" />
                  Participants ({summary.participants.length})
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {summary.participants.slice(0, 6).map((participant) => (
                    <div
                      key={participant.userId}
                      className="rounded-lg border bg-card p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {participant.userName}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {participant.messageCount} messages
                        </Badge>
                      </div>
                      {participant.keyContributions.length > 0 && (
                        <ul className="space-y-1">
                          {participant.keyContributions
                            .slice(0, 2)
                            .map((contribution, idx) => (
                              <li
                                key={idx}
                                className="truncate text-xs text-muted-foreground"
                              >
                                • {contribution}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}

      {loading && (
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardContent>
      )}

      {error && (
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format summary as Markdown
 */
function formatAsMarkdown(summary: ThreadSummaryResult): string {
  const lines: string[] = [];

  lines.push("# Thread Summary");
  lines.push("");
  lines.push(`**Quality Score:** ${summary.qualityScore}%`);
  lines.push(`**Messages:** ${summary.metadata.messageCount}`);
  lines.push(`**Participants:** ${summary.metadata.participantCount}`);
  lines.push(`**Duration:** ${formatDuration(summary.metadata.duration)}`);
  lines.push(`**Sentiment:** ${summary.metadata.sentiment}`);
  lines.push("");

  lines.push("## TL;DR");
  lines.push("");
  lines.push(summary.tldr);
  lines.push("");

  if (summary.keyPoints.length > 0) {
    lines.push("## Key Points");
    lines.push("");
    summary.keyPoints.forEach((point) => {
      lines.push(`- ${point}`);
    });
    lines.push("");
  }

  if (summary.actionItems.length > 0) {
    lines.push("## Action Items");
    lines.push("");
    summary.actionItems.forEach((item, i) => {
      const checkbox = item.status === "completed" ? "[x]" : "[ ]";
      lines.push(`${i + 1}. ${checkbox} ${item.description}`);
      if (item.assignee) lines.push(`   - Assignee: ${item.assignee}`);
      lines.push(`   - Priority: ${item.priority}`);
      lines.push("");
    });
  }

  if (summary.participants.length > 0) {
    lines.push("## Participants");
    lines.push("");
    summary.participants.forEach((p) => {
      lines.push(`- **${p.userName}** (${p.messageCount} messages)`);
      p.keyContributions.forEach((c) => {
        lines.push(`  - ${c}`);
      });
      lines.push("");
    });
  }

  lines.push("---");
  lines.push(`*Generated on ${new Date().toLocaleString()}*`);

  return lines.join("\n");
}
