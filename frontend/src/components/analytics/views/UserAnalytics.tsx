"use client";

/**
 * UserAnalytics - Detailed user analytics view
 */

import * as React from "react";
import {
  Users,
  UserPlus,
  UserMinus,
  Activity,
  Heart,
  FileText,
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

import { ActiveUsersChart } from "../charts/ActiveUsersChart";
import { GrowthChart } from "../charts/GrowthChart";
import { UserEngagementChart } from "../charts/UserEngagementChart";
import { TopUsersTable } from "../tables/TopUsersTable";
import { InactiveUsersTable } from "../tables/InactiveUsersTable";

// ============================================================================
// Types
// ============================================================================

interface UserAnalyticsProps {
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

export function UserAnalytics({ className }: UserAnalyticsProps) {
  const { summary, activeUsers, userGrowth, isLoading, fetchSectionData } =
    useAnalyticsStore();

  // Fetch user data on mount
  React.useEffect(() => {
    fetchSectionData("users");
  }, [fetchSectionData]);

  // Calculate growth stats
  const growthStats = React.useMemo(() => {
    if (!userGrowth || userGrowth.length === 0) return null;

    const totalNew = userGrowth.reduce((sum, d) => sum + d.newUsers, 0);
    const totalChurned = userGrowth.reduce((sum, d) => sum + d.churnedUsers, 0);
    const netGrowth = totalNew - totalChurned;

    const startTotal = userGrowth[0].totalUsers - userGrowth[0].newUsers;
    const endTotal = userGrowth[userGrowth.length - 1].totalUsers;
    const growthRate =
      startTotal > 0 ? ((endTotal - startTotal) / startTotal) * 100 : 0;

    return { totalNew, totalChurned, netGrowth, growthRate };
  }, [userGrowth]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={summary?.users.totalUsers.value.toLocaleString() ?? 0}
          description="registered users"
          icon={<Users className="h-4 w-4" />}
          trend={summary?.users.totalUsers.trend}
          trendValue={
            summary?.users.totalUsers.changePercent
              ? `${summary.users.totalUsers.changePercent >= 0 ? "+" : ""}${summary.users.totalUsers.changePercent.toFixed(1)}%`
              : undefined
          }
        />
        <StatCard
          title="Active Users"
          value={summary?.users.activeUsers.value.toLocaleString() ?? 0}
          description="in this period"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="New Users"
          value={growthStats?.totalNew.toLocaleString() ?? 0}
          description="joined this period"
          icon={<UserPlus className="h-4 w-4" />}
          trend={growthStats && growthStats.netGrowth >= 0 ? "up" : "down"}
        />
        <StatCard
          title="Churned Users"
          value={growthStats?.totalChurned.toLocaleString() ?? 0}
          description="became inactive"
          icon={<UserMinus className="h-4 w-4" />}
        />
      </div>

      {/* DAU/WAU/MAU */}
      {activeUsers && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Daily Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {activeUsers.dau.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {(activeUsers.dauWauRatio * 100).toFixed(1)}% of WAU
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Weekly Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {activeUsers.wau.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">last 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {activeUsers.mau.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {(activeUsers.dauMauRatio * 100).toFixed(1)}% DAU/MAU stickiness
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Views */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="inactive">At Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Active Users Trend</CardTitle>
                <CardDescription>DAU/WAU/MAU over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveUsersChart height={300} variant="detailed" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Active Users</CardTitle>
                <CardDescription>
                  Most engaged users this period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TopUsersTable
                  limit={10}
                  sortBy="engagement"
                  showDetails={false}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New users and churn over time</CardDescription>
            </CardHeader>
            <CardContent>
              <GrowthChart height={350} variant="combined" />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>New vs Churned</CardTitle>
                <CardDescription>Net growth breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart height={250} variant="net" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cumulative Growth</CardTitle>
                <CardDescription>Total user count over time</CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart height={250} variant="cumulative" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Radar</CardTitle>
                <CardDescription>
                  User engagement across different metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserEngagementChart height={300} variant="radar" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Per-User Averages</CardTitle>
                <CardDescription>Average activity per user</CardDescription>
              </CardHeader>
              <CardContent>
                <UserEngagementChart height={300} variant="bar" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Contributors</CardTitle>
              <CardDescription>
                Users with highest engagement scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopUsersTable limit={20} sortBy="engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Users</CardTitle>
              <CardDescription>
                Users who haven&apos;t been active recently - consider
                re-engagement campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InactiveUsersTable limit={30} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UserAnalytics;
