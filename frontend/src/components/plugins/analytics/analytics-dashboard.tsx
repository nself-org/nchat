/**
 * Analytics Dashboard Component
 * Displays key metrics from Analytics plugin
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAnalyticsDashboard } from "@/hooks/use-analytics-plugin";
import { Users, MessageSquare, Hash, TrendingUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
}

function MetricCard({ title, value, icon, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
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

interface AnalyticsDashboardProps {
  period?: string;
}

export function AnalyticsDashboard({
  period = "30d",
}: AnalyticsDashboardProps) {
  const { dashboard, isLoading, error } = useAnalyticsDashboard({ period });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error Loading Analytics</CardTitle>
          <CardDescription>
            Failed to load analytics data. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Users"
          value={dashboard.activeUsers.toLocaleString()}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description={`Last ${dashboard.period}`}
        />
        <MetricCard
          title="Total Messages"
          value={dashboard.totalMessages.toLocaleString()}
          icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
          description={`Last ${dashboard.period}`}
        />
        <MetricCard
          title="Active Channels"
          value={dashboard.totalChannels.toLocaleString()}
          icon={<Hash className="h-4 w-4 text-muted-foreground" />}
          description="All channels"
        />
        <MetricCard
          title="Avg Messages/User"
          value={dashboard.avgMessagesPerUser.toFixed(1)}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          description="Engagement metric"
        />
      </div>
    </div>
  );
}
