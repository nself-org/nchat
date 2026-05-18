"use client";

import { useState } from "react";
import { RefreshCw, Calendar, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserActivityEntry } from "@/lib/admin/users/user-types";

interface UserActivityProps {
  activities: UserActivityEntry[];
  userId: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const activityTypeColors: Record<string, string> = {
  message: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  channel: "bg-green-500/10 text-green-600 border-green-500/20",
  user: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  auth: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  admin: "bg-red-500/10 text-red-600 border-red-500/20",
  default: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const activityTypeIcons: Record<string, string> = {
  message_sent: "Message sent",
  message_deleted: "Message deleted",
  message_edited: "Message edited",
  channel_joined: "Joined channel",
  channel_left: "Left channel",
  channel_created: "Created channel",
  profile_updated: "Updated profile",
  login: "Logged in",
  logout: "Logged out",
  password_changed: "Changed password",
};

export function UserActivity({
  activities,
  userId,
  isLoading = false,
  onRefresh,
}: UserActivityProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");

  const filteredActivities = activities.filter((activity) => {
    // Type filter
    if (typeFilter !== "all" && activity.type !== typeFilter) {
      return false;
    }

    // Time filter
    if (timeFilter !== "all") {
      const activityDate = new Date(activity.createdAt);
      const now = new Date();
      const diffHours =
        (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);

      switch (timeFilter) {
        case "1h":
          if (diffHours > 1) return false;
          break;
        case "24h":
          if (diffHours > 24) return false;
          break;
        case "7d":
          if (diffHours > 24 * 7) return false;
          break;
        case "30d":
          if (diffHours > 24 * 30) return false;
          break;
      }
    }

    return true;
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  const getActivityTypeColor = (type: string) => {
    if (type.startsWith("message")) return activityTypeColors.message;
    if (type.startsWith("channel")) return activityTypeColors.channel;
    if (type.startsWith("user") || type.startsWith("profile"))
      return activityTypeColors.user;
    if (
      type.startsWith("login") ||
      type.startsWith("logout") ||
      type.startsWith("password")
    )
      return activityTypeColors.auth;
    if (
      type.startsWith("admin") ||
      type.startsWith("ban") ||
      type.startsWith("role")
    )
      return activityTypeColors.admin;
    return activityTypeColors.default;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Recent actions by this user</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="channel">Channels</SelectItem>
                <SelectItem value="profile">Profile</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="1h">Last hour</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Activity List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 border-l-2 border-muted pl-4"
              >
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2">No activity found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 border-l-2 border-muted pl-4 transition-colors hover:border-primary"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getActivityTypeColor(activity.type)}
                    >
                      {activity.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm">{activity.description}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTimestamp(activity.createdAt)}</span>
                    {activity.ipAddress && (
                      <>
                        <span>&middot;</span>
                        <span>IP: {activity.ipAddress}</span>
                      </>
                    )}
                    {activity.target && (
                      <>
                        <span>&middot;</span>
                        <span>
                          {activity.target.type}:{" "}
                          {activity.target.name || activity.target.id}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default UserActivity;
