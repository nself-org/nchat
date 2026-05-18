"use client";

/**
 * Analytics Dashboard Component
 * Re-exports analytics-charts as the analytics dashboard
 */

export {
  MessagesOverTimeChart,
  PeakActivityChart,
  UserGrowthChart,
  RoleDistributionChart,
  DailyActiveUsersChart,
  PopularChannelsChart,
} from "./analytics-charts";

// Create a combined dashboard component
import {
  MessagesOverTimeChart,
  PeakActivityChart,
  UserGrowthChart,
  RoleDistributionChart,
  DailyActiveUsersChart,
  PopularChannelsChart,
} from "./analytics-charts";

export function AnalyticsDashboard() {
  // Sample data for demonstration
  const chartData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    users: Math.floor(Math.random() * 20) + 5,
    messages: Math.floor(Math.random() * 500) + 100,
    activeUsers: Math.floor(Math.random() * 50) + 20,
  }));

  const peakHours = Array.from({ length: 6 }, (_, i) => ({
    hour: `${9 + i * 2}:00`,
    messages: Math.floor(Math.random() * 100) + 20,
  }));

  const popularChannels = [
    { name: "general", messages: 1500, members: 50, percentage: 100 },
    { name: "random", messages: 800, members: 45, percentage: 53 },
    { name: "announcements", messages: 300, members: 50, percentage: 20 },
  ];

  const roleDistribution = [
    { role: "Member", count: 45, color: "bg-blue-500" },
    { role: "Moderator", count: 5, color: "bg-yellow-500" },
    { role: "Admin", count: 3, color: "bg-red-500" },
    { role: "Owner", count: 1, color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <MessagesOverTimeChart data={chartData} />
        <UserGrowthChart data={chartData} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PeakActivityChart data={peakHours} />
        <RoleDistributionChart data={roleDistribution} totalCount={54} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DailyActiveUsersChart data={chartData} />
        <PopularChannelsChart data={popularChannels} />
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
