"use client";

/**
 * MessageAnalytics - Detailed message analytics view
 */

import * as React from "react";
import {
  MessageSquare,
  Edit,
  Trash2,
  Paperclip,
  Heart,
  MessagesSquare,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAnalyticsStore } from "@/stores/analytics-store";

import { MessageVolumeChart } from "../charts/MessageVolumeChart";
import { PeakHoursChart } from "../charts/PeakHoursChart";
import { ResponseTimeChart } from "../charts/ResponseTimeChart";
import { TopMessagesTable } from "../tables/TopMessagesTable";

// ============================================================================
// Types
// ============================================================================

interface MessageAnalyticsProps {
  className?: string;
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trendValue) && (
          <p className="text-xs text-muted-foreground">
            {trendValue && (
              <span
                className={cn(
                  "mr-1 font-medium",
                  trend === "up"
                    ? "text-green-600"
                    : trend === "down"
                      ? "text-red-600"
                      : "",
                )}
              >
                {trendValue}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Component
// ============================================================================

export function MessageAnalytics({ className }: MessageAnalyticsProps) {
  const { summary, messageVolume, isLoading, fetchSectionData } =
    useAnalyticsStore();

  // Fetch message data on mount
  React.useEffect(() => {
    fetchSectionData("messages");
  }, [fetchSectionData]);

  // Calculate message stats
  const messageStats = React.useMemo(() => {
    if (!messageVolume || messageVolume.length === 0) return null;

    const totalMessages = messageVolume.reduce((sum, d) => sum + d.count, 0);
    const avgPerDay = totalMessages / messageVolume.length;
    const maxDay = messageVolume.reduce(
      (max, d) => (d.count > max.count ? d : max),
      messageVolume[0],
    );
    const minDay = messageVolume.reduce(
      (min, d) => (d.count < min.count ? d : min),
      messageVolume[0],
    );

    return { totalMessages, avgPerDay, maxDay, minDay };
  }, [messageVolume]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Messages"
          value={summary?.messages.total.value.toLocaleString() ?? 0}
          description="in this period"
          icon={<MessageSquare className="h-4 w-4" />}
          trend={summary?.messages.total.trend}
          trendValue={
            summary?.messages.total.changePercent
              ? `${summary.messages.total.changePercent >= 0 ? "+" : ""}${summary.messages.total.changePercent.toFixed(1)}%`
              : undefined
          }
        />
        <StatCard
          title="With Attachments"
          value={summary?.messages.withAttachments.value.toLocaleString() ?? 0}
          description="files shared"
          icon={<Paperclip className="h-4 w-4" />}
        />
        <StatCard
          title="With Reactions"
          value={summary?.messages.withReactions.value.toLocaleString() ?? 0}
          description="received reactions"
          icon={<Heart className="h-4 w-4" />}
        />
        <StatCard
          title="In Threads"
          value={summary?.messages.inThreads.value.toLocaleString() ?? 0}
          description="threaded discussions"
          icon={<MessagesSquare className="h-4 w-4" />}
        />
      </div>

      {/* Message Activity Summary */}
      {messageStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Daily Average
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round(messageStats.avgPerDay).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">messages per day</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {messageStats.maxDay.count.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                on{" "}
                {new Date(messageStats.maxDay.timestamp).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quiet Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {messageStats.minDay.count.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                on{" "}
                {new Date(messageStats.minDay.timestamp).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Views */}
      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="response">Response Time</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Volume Over Time</CardTitle>
              <CardDescription>Daily message count trend</CardDescription>
            </CardHeader>
            <CardContent>
              <MessageVolumeChart height={350} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Volume by Channel</CardTitle>
              <CardDescription>
                Stacked view of channel contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessageVolumeChart height={300} stacked />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity by Hour</CardTitle>
              <CardDescription>When is your team most active?</CardDescription>
            </CardHeader>
            <CardContent>
              <PeakHoursChart height={300} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hourly Activity Heatmap</CardTitle>
              <CardDescription>
                Visual representation of activity patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PeakHoursChart height={200} variant="heatmap" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend</CardTitle>
                <CardDescription>
                  Average and median response times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponseTimeChart height={300} variant="timeline" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
                <CardDescription>
                  How quickly are messages responded to?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponseTimeChart height={300} variant="distribution" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Response Time Percentiles</CardTitle>
              <CardDescription>P50, P95, P99 response times</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponseTimeChart height={300} variant="percentiles" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popular" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Most Reacted Messages</CardTitle>
                <CardDescription>
                  Messages with highest reaction count
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TopMessagesTable limit={10} sortBy="reactions" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Most Discussed Messages</CardTitle>
                <CardDescription>Messages with most replies</CardDescription>
              </CardHeader>
              <CardContent>
                <TopMessagesTable limit={10} sortBy="replies" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MessageAnalytics;
