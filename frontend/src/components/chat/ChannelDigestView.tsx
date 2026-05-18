"use client";

/**
 * Channel Digest View Component
 * Displays daily/weekly channel summaries and highlights
 */

import { useState } from "react";
import {
  Sparkles,
  Calendar,
  TrendingUp,
  MessageSquare,
  Users,
  Clock,
  BarChart3,
  Download,
  Copy,
  Loader2,
  AlertCircle,
  ChevronRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getChannelDigestGenerator,
  isChannelDigestAvailable,
  type Message,
  type ChannelDigestResult,
  type ChannelDigestOptions,
} from "@/lib/ai/channel-digest";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface ChannelDigestViewProps {
  channelId: string;
  channelName: string;
  messages: Message[];
  period?: "daily" | "weekly" | "custom";
  customRange?: { start: Date; end: Date };
  className?: string;
  autoGenerate?: boolean;
  onMessageClick?: (messageId: string) => void;
}

export function ChannelDigestView({
  channelId,
  channelName,
  messages,
  period = "daily",
  customRange,
  className,
  autoGenerate = false,
  onMessageClick,
}: ChannelDigestViewProps) {
  const [digest, setDigest] = useState<ChannelDigestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("overview");
  const [isAIAvailable] = useState(isChannelDigestAvailable());
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (messages.length === 0) {
      setError("No messages to analyze");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generator = getChannelDigestGenerator();
      const options: ChannelDigestOptions = {
        period,
        customRange,
        maxTopMessages: 5,
        maxHighlights: 5,
        maxTopics: 5,
        includeStatistics: true,
        includeTrending: true,
      };

      const result = await generator.generateDigest(
        channelId,
        messages,
        options,
      );
      setDigest(result);

      toast({
        title: "Digest generated",
        description: `Analyzed ${result.statistics.totalMessages} messages`,
      });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to generate digest";
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
    if (!digest) return;

    const text = formatAsPlainText(digest, channelName);
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Channel digest copied successfully",
    });
  };

  const handleDownload = () => {
    if (!digest) return;

    const markdown = formatAsMarkdown(digest, channelName);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${channelName}-digest-${period}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Digest downloaded as Markdown",
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "rising":
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case "declining":
        return <TrendingUp className="h-3 w-3 rotate-180 text-red-600" />;
      default:
        return <BarChart3 className="h-3 w-3 text-gray-600" />;
    }
  };

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return "📢";
      case "decision":
        return "✅";
      case "milestone":
        return "🎯";
      case "achievement":
        return "🏆";
      default:
        return "💬";
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              {channelName} Digest
              {!isAIAvailable && (
                <Badge variant="outline" className="text-xs">
                  Basic
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {period === "daily"
                ? "Daily"
                : period === "weekly"
                  ? "Weekly"
                  : "Custom"}{" "}
              summary of channel activity
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {digest && (
              <>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            {!digest && (
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
                    Generate Digest
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {digest && (
        <CardContent className="space-y-6">
          {/* Time Range */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{digest.timeRange.label}</span>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="highlights">Highlights</TabsTrigger>
              <TabsTrigger value="topics">Topics</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Digest Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Summary</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {digest.digest}
                </p>
              </div>

              <Separator />

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg border bg-card p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Messages
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {digest.statistics.totalMessages}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Active Users
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {digest.statistics.activeUsers}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Peak Hour
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {digest.statistics.peakActivityHour}:00
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Avg Response
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {Math.round(digest.statistics.averageResponseTime)}m
                  </p>
                </div>
              </div>

              {/* Top Messages */}
              {digest.topMessages.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Top Messages</h4>
                    <div className="space-y-2">
                      {digest.topMessages.slice(0, 3).map((msg) => (
                        <div
                          key={msg.messageId}
                          className="cursor-pointer rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                          role="button"
                          tabIndex={0}
                          onClick={() => onMessageClick?.(msg.messageId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onMessageClick?.(msg.messageId);
                            }
                          }}
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {msg.author}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {msg.reason}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {msg.content}
                          </p>
                          <div className="mt-2 flex gap-2">
                            {msg.reactions > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {msg.reactions} reactions
                              </span>
                            )}
                            {msg.replies > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {msg.replies} replies
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Highlights Tab */}
            <TabsContent value="highlights" className="mt-4 space-y-4">
              {digest.highlights.length > 0 ? (
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {digest.highlights.map((highlight) => (
                      <div
                        key={highlight.id}
                        className="rounded-lg border bg-card p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">
                            {getHighlightIcon(highlight.type)}
                          </span>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {highlight.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(highlight.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{highlight.summary}</p>
                            {highlight.participants.length > 0 && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>
                                  {highlight.participants.length} participants
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No highlights found for this period
                </div>
              )}
            </TabsContent>

            {/* Topics Tab */}
            <TabsContent value="topics" className="mt-4 space-y-4">
              {digest.trendingTopics.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {digest.trendingTopics.map((topic, index) => (
                    <div key={index} className="rounded-lg border bg-card p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <h4 className="text-sm font-semibold">{topic.topic}</h4>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(topic.trend)}
                          <Badge variant="outline" className="text-xs">
                            {topic.trend}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          <span>{topic.mentions} mentions</span>
                        </div>
                        {topic.relatedKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {topic.relatedKeywords
                              .slice(0, 4)
                              .map((keyword, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {keyword}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No trending topics identified
                </div>
              )}
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="mt-4 space-y-4">
              <div className="space-y-4">
                {/* Sentiment Distribution */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">
                    Sentiment Distribution
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Positive
                      </span>
                      <span className="text-sm font-medium">
                        {digest.statistics.sentiment.positive.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${digest.statistics.sentiment.positive}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Neutral
                      </span>
                      <span className="text-sm font-medium">
                        {digest.statistics.sentiment.neutral.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-gray-500"
                        style={{
                          width: `${digest.statistics.sentiment.neutral}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Negative
                      </span>
                      <span className="text-sm font-medium">
                        {digest.statistics.sentiment.negative.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${digest.statistics.sentiment.negative}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Most Active User */}
                {digest.statistics.mostActiveUser.messageCount > 0 && (
                  <div className="rounded-lg border bg-card p-4">
                    <h4 className="mb-2 text-sm font-semibold">Most Active</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {digest.statistics.mostActiveUser.userName}
                      </span>
                      <Badge variant="default">
                        {digest.statistics.mostActiveUser.messageCount} messages
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Next Digest */}
                <Separator />
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">Next Digest</h4>
                      <p className="text-xs text-muted-foreground">
                        Scheduled for{" "}
                        {new Date(digest.schedule.nextRun).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        digest.schedule.enabled ? "default" : "secondary"
                      }
                    >
                      {digest.schedule.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}

      {loading && (
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-4 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-32 w-full" />
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

function formatAsPlainText(
  digest: ChannelDigestResult,
  channelName: string,
): string {
  const lines: string[] = [];

  lines.push(`${channelName} Digest - ${digest.timeRange.label}`);
  lines.push("");
  lines.push(digest.digest);
  lines.push("");
  lines.push(`Messages: ${digest.statistics.totalMessages}`);
  lines.push(`Active Users: ${digest.statistics.activeUsers}`);
  lines.push("");

  if (digest.topMessages.length > 0) {
    lines.push("Top Messages:");
    digest.topMessages.forEach((msg, i) => {
      lines.push(`${i + 1}. ${msg.author}: ${msg.content.slice(0, 100)}...`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function formatAsMarkdown(
  digest: ChannelDigestResult,
  channelName: string,
): string {
  const lines: string[] = [];

  lines.push(`# ${channelName} Digest`);
  lines.push("");
  lines.push(`**Period:** ${digest.timeRange.label}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(digest.digest);
  lines.push("");
  lines.push("## Statistics");
  lines.push("");
  lines.push(`- Total Messages: ${digest.statistics.totalMessages}`);
  lines.push(`- Active Users: ${digest.statistics.activeUsers}`);
  lines.push(`- Peak Activity: ${digest.statistics.peakActivityHour}:00`);
  lines.push(
    `- Avg Response Time: ${Math.round(digest.statistics.averageResponseTime)}m`,
  );
  lines.push("");

  if (digest.topMessages.length > 0) {
    lines.push("## Top Messages");
    lines.push("");
    digest.topMessages.forEach((msg, i) => {
      lines.push(`${i + 1}. **${msg.author}** - ${msg.reason}`);
      lines.push(`   > ${msg.content}`);
      lines.push("");
    });
  }

  if (digest.highlights.length > 0) {
    lines.push("## Highlights");
    lines.push("");
    digest.highlights.forEach((h, i) => {
      lines.push(`${i + 1}. **${h.type}**: ${h.summary}`);
    });
    lines.push("");
  }

  if (digest.trendingTopics.length > 0) {
    lines.push("## Trending Topics");
    lines.push("");
    digest.trendingTopics.forEach((t) => {
      lines.push(`- **${t.topic}** (${t.mentions} mentions, ${t.trend})`);
    });
    lines.push("");
  }

  lines.push("---");
  lines.push(`*Generated on ${new Date().toLocaleString()}*`);

  return lines.join("\n");
}
