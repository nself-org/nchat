"use client";

/**
 * AnalyticsDashboard - Main analytics dashboard component
 */

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import { useAnalyticsStore } from "@/stores/analytics-store";

// Overview Components
import { AnalyticsHeader } from "./AnalyticsHeader";
import { AnalyticsSummary } from "./AnalyticsSummary";
import { AnalyticsCards } from "./AnalyticsCards";

// Chart Components
import { MessageVolumeChart } from "../charts/MessageVolumeChart";
import { ActiveUsersChart } from "../charts/ActiveUsersChart";
import { ChannelActivityChart } from "../charts/ChannelActivityChart";
import { ReactionChart } from "../charts/ReactionChart";
import { PeakHoursChart } from "../charts/PeakHoursChart";
import { GrowthChart } from "../charts/GrowthChart";

// Table Components
import { TopChannelsTable } from "../tables/TopChannelsTable";
import { TopUsersTable } from "../tables/TopUsersTable";
import { TopMessagesTable } from "../tables/TopMessagesTable";

// Export Components
import { AnalyticsExport } from "../export/AnalyticsExport";

// ============================================================================
// Types
// ============================================================================

interface AnalyticsDashboardProps {
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const { isLoading, error, dashboardData, fetchDashboardData, clearError } =
    useAnalyticsStore();

  const [showExport, setShowExport] = React.useState(false);

  // Fetch data on mount
  React.useEffect(() => {
    if (!dashboardData) {
      fetchDashboardData();
    }
  }, [dashboardData, fetchDashboardData]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <AnalyticsHeader
        title="Analytics Dashboard"
        onExport={() => setShowExport(true)}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <AnalyticsSummary />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Message Volume Chart */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Message Volume</CardTitle>
                <CardDescription>
                  Messages sent over time across all channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessageVolumeChart height={300} />
              </CardContent>
            </Card>

            {/* Active Users Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
                <CardDescription>DAU / WAU / MAU trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveUsersChart height={250} />
              </CardContent>
            </Card>

            {/* Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart height={250} />
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Cards */}
          <AnalyticsCards />
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Channel Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Activity</CardTitle>
                <CardDescription>
                  Most active channels by message count
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChannelActivityChart height={300} />
              </CardContent>
            </Card>

            {/* Reactions */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Reactions</CardTitle>
                <CardDescription>Most used emoji reactions</CardDescription>
              </CardHeader>
              <CardContent>
                <ReactionChart height={300} />
              </CardContent>
            </Card>

            {/* Peak Hours */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Activity by Hour</CardTitle>
                <CardDescription>When your team is most active</CardDescription>
              </CardHeader>
              <CardContent>
                <PeakHoursChart height={250} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top Users Table */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Most Active Users</CardTitle>
                <CardDescription>
                  Users with the highest engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TopUsersTable limit={10} />
              </CardContent>
            </Card>

            {/* Active Users Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Activity Trends</CardTitle>
                <CardDescription>
                  Daily, weekly, monthly active users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveUsersChart height={250} variant="detailed" />
              </CardContent>
            </Card>

            {/* User Growth */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user signups over time</CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart height={250} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top Channels Table */}
            <Card>
              <CardHeader>
                <CardTitle>Top Channels</CardTitle>
                <CardDescription>Channels with most activity</CardDescription>
              </CardHeader>
              <CardContent>
                <TopChannelsTable limit={10} />
              </CardContent>
            </Card>

            {/* Top Messages Table */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Messages</CardTitle>
                <CardDescription>Messages with most reactions</CardDescription>
              </CardHeader>
              <CardContent>
                <TopMessagesTable limit={10} />
              </CardContent>
            </Card>

            {/* Message Volume */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Message Distribution</CardTitle>
                <CardDescription>Messages by channel over time</CardDescription>
              </CardHeader>
              <CardContent>
                <MessageVolumeChart height={300} stacked />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Button */}
      {showExport && (
        <AnalyticsExport
          onExport={(format) => {
            setShowExport(false);
          }}
        />
      )}
    </div>
  );
}

export default AnalyticsDashboard;
