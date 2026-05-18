"use client";

/**
 * ChannelAnalytics - Detailed channel analytics view
 */

import * as React from "react";
import { Hash, Lock, Users } from "lucide-react";

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

import { ChannelActivityChart } from "../charts/ChannelActivityChart";
import { MessageVolumeChart } from "../charts/MessageVolumeChart";
import { TopChannelsTable } from "../tables/TopChannelsTable";

// ============================================================================
// Types
// ============================================================================

interface ChannelAnalyticsProps {
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
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ChannelAnalytics({ className }: ChannelAnalyticsProps) {
  const { summary, channelActivity, isLoading, fetchSectionData } =
    useAnalyticsStore();

  // Fetch channel data on mount
  React.useEffect(() => {
    fetchSectionData("channels");
  }, [fetchSectionData]);

  // Calculate channel stats
  const channelStats = React.useMemo(() => {
    if (!channelActivity || channelActivity.length === 0) return null;

    const totalMessages = channelActivity.reduce(
      (sum, c) => sum + c.messageCount,
      0,
    );
    const totalMembers = channelActivity.reduce(
      (sum, c) => sum + c.memberCount,
      0,
    );
    const avgEngagement =
      channelActivity.reduce((sum, c) => sum + c.engagementRate, 0) /
      channelActivity.length;

    const mostActive = channelActivity.reduce(
      (max, c) => (c.messageCount > max.messageCount ? c : max),
      channelActivity[0],
    );

    return { totalMessages, totalMembers, avgEngagement, mostActive };
  }, [channelActivity]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Channels"
          value={summary?.channels.totalChannels.value ?? 0}
          description="active channels"
          icon={<Hash className="h-4 w-4" />}
        />
        <StatCard
          title="Public Channels"
          value={summary?.channels.publicChannels.value ?? 0}
          description="open to all"
          icon={<Hash className="h-4 w-4" />}
        />
        <StatCard
          title="Private Channels"
          value={summary?.channels.privateChannels.value ?? 0}
          description="invite only"
          icon={<Lock className="h-4 w-4" />}
        />
        <StatCard
          title="Avg. Members"
          value={summary?.channels.averageMembers.value ?? 0}
          description="per channel"
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Channel Activity Summary */}
      {channelStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {channelStats.totalMessages.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                across all channels
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {channelStats.avgEngagement.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                active members ratio
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Most Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <span className="text-xl font-bold">
                  {channelStats.mostActive.channelName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {channelStats.mostActive.messageCount.toLocaleString()} messages
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Channel Activity Distribution</CardTitle>
                <CardDescription>Messages by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <ChannelActivityChart height={300} variant="bar" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Activity Share</CardTitle>
                <CardDescription>Percentage of total activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ChannelActivityChart height={300} variant="pie" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Volume Over Time</CardTitle>
              <CardDescription>Messages across all channels</CardDescription>
            </CardHeader>
            <CardContent>
              <MessageVolumeChart height={350} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Channel Activity by Volume</CardTitle>
              <CardDescription>
                Stacked view of channel contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessageVolumeChart height={300} stacked />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Channels by Messages</CardTitle>
                <CardDescription>Most active channels</CardDescription>
              </CardHeader>
              <CardContent>
                <TopChannelsTable
                  limit={10}
                  sortBy="messages"
                  showEngagement={false}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Channels by Engagement</CardTitle>
                <CardDescription>Highest member participation</CardDescription>
              </CardHeader>
              <CardContent>
                <TopChannelsTable
                  limit={10}
                  sortBy="engagement"
                  showEngagement
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Channels</CardTitle>
              <CardDescription>Complete channel activity list</CardDescription>
            </CardHeader>
            <CardContent>
              <TopChannelsTable limit={20} sortBy="messages" showEngagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ChannelAnalytics;
