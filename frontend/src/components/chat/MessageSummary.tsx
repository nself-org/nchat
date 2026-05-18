"use client";

/**
 * MessageSummary component
 * Displays AI-powered summaries of messages, threads, and channel digests
 */

import { useState, useEffect } from "react";
import {
  Sparkles,
  Clock,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
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
import {
  getMessageSummarizer,
  isAISummarizationAvailable,
  type Message,
  type ChannelDigest,
  type ThreadSummary,
  type SummaryOptions,
} from "@/lib/ai/message-summarizer";
import { cn } from "@/lib/utils";

export interface MessageSummaryProps {
  messages: Message[];
  type?: "brief" | "digest" | "thread" | "catchup";
  className?: string;
  autoGenerate?: boolean;
  onSummaryGenerated?: (summary: string) => void;
}

export function MessageSummary({
  messages,
  type = "brief",
  className,
  autoGenerate = false,
  onSummaryGenerated,
}: MessageSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [digest, setDigest] = useState<ChannelDigest | null>(null);
  const [threadSummary, setThreadSummary] = useState<ThreadSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState(false);

  useEffect(() => {
    setIsAIAvailable(isAISummarizationAvailable());
  }, []);

  useEffect(() => {
    if (autoGenerate && messages.length > 0 && !summary && !loading) {
      handleGenerate();
    }
  }, [autoGenerate, messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (messages.length === 0) {
      setError("No messages to summarize");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const summarizer = getMessageSummarizer();

      switch (type) {
        case "digest": {
          const channelDigest =
            await summarizer.generateChannelDigest(messages);
          setDigest(channelDigest);
          if (onSummaryGenerated) {
            onSummaryGenerated(channelDigest.summary);
          }
          break;
        }

        case "thread": {
          const threadSum = await summarizer.summarizeThread(messages);
          setThreadSummary(threadSum);
          if (onSummaryGenerated) {
            onSummaryGenerated(threadSum.summary);
          }
          break;
        }

        case "catchup": {
          const catchupSummary =
            await summarizer.generateCatchUpSummary(messages);
          setSummary(catchupSummary);
          if (onSummaryGenerated) {
            onSummaryGenerated(catchupSummary);
          }
          break;
        }

        case "brief":
        default: {
          const options: SummaryOptions = {
            style: "brief",
            includeKeyPoints: false,
          };
          const briefSummary = await summarizer.summarizeMessages(
            messages,
            options,
          );
          setSummary(briefSummary);
          if (onSummaryGenerated) {
            onSummaryGenerated(briefSummary);
          }
          break;
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate summary",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSummary(null);
    setDigest(null);
    setThreadSummary(null);
    setError(null);
  };

  const renderBriefSummary = () => {
    if (!summary) return null;

    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{summary}</p>
      </div>
    );
  };

  const renderDigest = () => {
    if (!digest) return null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{digest.summary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {digest.messageCount} messages
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {digest.participantCount} participants
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeRange(digest.timeRange.start, digest.timeRange.end)}
          </Badge>
        </div>

        {digest.keyPoints && digest.keyPoints.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Key Points</h4>
            <ul className="space-y-1">
              {digest.keyPoints.map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1 text-primary">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {digest.topics && digest.topics.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Topics Discussed</h4>
            <div className="flex flex-wrap gap-2">
              {digest.topics.map((topic, index) => (
                <Badge key={index} variant="outline">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderThreadSummary = () => {
    if (!threadSummary) return null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {threadSummary.summary}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {threadSummary.messageCount} messages
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {threadSummary.participantCount} participants
          </Badge>
        </div>

        {threadSummary.keyDecisions &&
          threadSummary.keyDecisions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Key Decisions</h4>
              <ul className="space-y-1">
                {threadSummary.keyDecisions.map((decision, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1 text-primary">•</span>
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!summary && !digest && !threadSummary) {
      return null;
    }

    return (
      <div className={cn("space-y-4", !expanded && "max-h-32 overflow-hidden")}>
        {type === "digest" && renderDigest()}
        {type === "thread" && renderThreadSummary()}
        {(type === "brief" || type === "catchup") && renderBriefSummary()}
      </div>
    );
  };

  const hasSummary = summary || digest || threadSummary;
  const canExpand = type === "digest" || type === "thread";

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              {type === "digest" && "Channel Digest"}
              {type === "thread" && "Thread Summary"}
              {type === "catchup" && "Catch Up"}
              {type === "brief" && "Summary"}
              {!isAIAvailable && (
                <Badge variant="outline" className="text-xs">
                  Basic
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {type === "digest" && "AI-powered overview of channel activity"}
              {type === "thread" && "AI-powered thread summary"}
              {type === "catchup" && "Summary of messages you missed"}
              {type === "brief" && "Quick summary of the conversation"}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {hasSummary && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear
              </Button>
            )}
            {!hasSummary && (
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

      {hasSummary && (
        <CardContent className="space-y-4">
          {renderContent()}

          {canExpand && hasSummary && !loading && !error && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show More
                </>
              )}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Format time range for display
 */
function formatTimeRange(start: Date, end: Date): string {
  const duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60); // minutes

  if (duration < 60) {
    return `${duration} min${duration > 1 ? "s" : ""}`;
  }

  const hours = Math.floor(duration / 60);
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""}`;
}
