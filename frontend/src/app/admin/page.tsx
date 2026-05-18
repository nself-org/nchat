"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import {
  Users,
  Hash,
  MessageSquare,
  Activity,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { StatsCard } from "@/components/admin/stats-card";
import { generateMockActivityData } from "@/components/admin/activity-chart";
import { ChartSkeleton } from "@/components/ui/loading-skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Lazy load heavy chart component (recharts)
const ActivityChart = dynamic(
  () =>
    import("@/components/admin/activity-chart").then((mod) => ({
      default: mod.ActivityChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false },
);

// Mock data for demonstration
const mockStats = {
  totalUsers: 156,
  activeUsers: 89,
  totalChannels: 24,
  totalMessages: 12847,
  newUsersThisWeek: 12,
  messagesThisWeek: 2341,
};

const mockRecentActivity = [
  {
    id: "1",
    type: "user.joined",
    user: { name: "Alice Johnson", avatar: "" },
    description: "joined the workspace",
    time: "2 minutes ago",
  },
  {
    id: "2",
    type: "channel.created",
    user: { name: "Bob Smith", avatar: "" },
    description: "created channel #engineering",
    time: "15 minutes ago",
  },
  {
    id: "3",
    type: "user.role_changed",
    user: { name: "Charlie Brown", avatar: "" },
    description: "was promoted to moderator",
    time: "1 hour ago",
  },
  {
    id: "4",
    type: "message.flagged",
    user: { name: "System", avatar: "" },
    description: "flagged a message in #general",
    time: "2 hours ago",
  },
  {
    id: "5",
    type: "user.joined",
    user: { name: "Diana Prince", avatar: "" },
    description: "joined the workspace",
    time: "3 hours ago",
  },
];

const mockSystemHealth = [
  { name: "Database", status: "healthy" as const },
  { name: "Auth Service", status: "healthy" as const },
  { name: "Storage", status: "healthy" as const },
  { name: "Real-time", status: "warning" as const },
];

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activityData, setActivityData] = useState(generateMockActivityData(7));
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");

  useEffect(() => {
    if (!loading && (!user || !["owner", "admin"].includes(user.role))) {
      router.push("/chat");
    }
  }, [user, loading, router]);

  const handleTimeRangeChange = (range: "7d" | "30d" | "90d") => {
    setTimeRange(range);
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    setActivityData(generateMockActivityData(days));
  };

  if (loading || !user || !["owner", "admin"].includes(user.role)) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your workspace activity and health
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Users"
            value={mockStats.totalUsers}
            description={`${mockStats.activeUsers} active now`}
            icon={Users}
            trend={{
              value: 8,
              label: "from last week",
              isPositive: true,
            }}
          />
          <StatsCard
            title="Channels"
            value={mockStats.totalChannels}
            description="Public and private"
            icon={Hash}
          />
          <StatsCard
            title="Messages"
            value={mockStats.totalMessages.toLocaleString()}
            description="Total sent"
            icon={MessageSquare}
            trend={{
              value: 12,
              label: "from last week",
              isPositive: true,
            }}
          />
          <StatsCard
            title="Active Sessions"
            value={mockStats.activeUsers}
            description="Users online"
            icon={Activity}
          />
        </div>

        {/* Activity Chart */}
        <ActivityChart
          data={activityData}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          showChannels
        />

        {/* Bottom Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest actions in your workspace
                </CardDescription>
              </div>
              <Link href="/admin/audit">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {activity.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">
                          {activity.user.name}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {activity.description}
                        </span>
                      </p>
                      <p className="flex items-center text-xs text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Health & Quick Actions */}
          <div className="space-y-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  System Health
                </CardTitle>
                <CardDescription>Status of backend services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockSystemHealth.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm font-medium">
                        {service.name}
                      </span>
                      <Badge
                        variant={
                          service.status === "healthy" ? "default" : "secondary"
                        }
                        className={
                          service.status === "healthy"
                            ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            : "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"
                        }
                      >
                        {service.status === "healthy" ? (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        ) : (
                          <AlertTriangle className="mr-1 h-3 w-3" />
                        )}
                        {service.status === "healthy" ? "Healthy" : "Warning"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Quick Actions
                </CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Link href="/admin/users">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Button>
                  </Link>
                  <Link href="/admin/channels">
                    <Button variant="outline" className="w-full justify-start">
                      <Hash className="mr-2 h-4 w-4" />
                      Manage Channels
                    </Button>
                  </Link>
                  <Link href="/admin/audit">
                    <Button variant="outline" className="w-full justify-start">
                      <Activity className="mr-2 h-4 w-4" />
                      View Audit Log
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
