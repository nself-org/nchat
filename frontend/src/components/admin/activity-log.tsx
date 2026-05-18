"use client";

import { formatDistanceToNow, format } from "date-fns";
import {
  UserPlus,
  UserMinus,
  UserX,
  UserCheck,
  Ban,
  Shield,
  Trash2,
  Hash,
  Archive,
  Settings,
  AlertTriangle,
  Activity,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityLogEntry } from "@/lib/admin/admin-store";

interface ActivityLogProps {
  logs: ActivityLogEntry[];
  isLoading?: boolean;
  title?: string;
  maxHeight?: string;
  showHeader?: boolean;
}

// Map activity types to icons and colors
const activityConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    label: string;
  }
> = {
  user_created: {
    icon: UserPlus,
    color: "text-green-500 bg-green-500/10",
    label: "User Created",
  },
  user_deleted: {
    icon: UserMinus,
    color: "text-red-500 bg-red-500/10",
    label: "User Deleted",
  },
  user_banned: {
    icon: Ban,
    color: "text-red-500 bg-red-500/10",
    label: "User Banned",
  },
  user_unbanned: {
    icon: UserCheck,
    color: "text-green-500 bg-green-500/10",
    label: "User Unbanned",
  },
  user_warned: {
    icon: AlertTriangle,
    color: "text-orange-500 bg-orange-500/10",
    label: "User Warned",
  },
  user_deactivated: {
    icon: UserX,
    color: "text-orange-500 bg-orange-500/10",
    label: "User Deactivated",
  },
  user_reactivated: {
    icon: UserCheck,
    color: "text-green-500 bg-green-500/10",
    label: "User Reactivated",
  },
  role_changed: {
    icon: Shield,
    color: "text-blue-500 bg-blue-500/10",
    label: "Role Changed",
  },
  message_deleted: {
    icon: Trash2,
    color: "text-red-500 bg-red-500/10",
    label: "Message Deleted",
  },
  channel_created: {
    icon: Hash,
    color: "text-green-500 bg-green-500/10",
    label: "Channel Created",
  },
  channel_deleted: {
    icon: Trash2,
    color: "text-red-500 bg-red-500/10",
    label: "Channel Deleted",
  },
  channel_archived: {
    icon: Archive,
    color: "text-orange-500 bg-orange-500/10",
    label: "Channel Archived",
  },
  report_resolved: {
    icon: Eye,
    color: "text-blue-500 bg-blue-500/10",
    label: "Report Resolved",
  },
  settings_updated: {
    icon: Settings,
    color: "text-purple-500 bg-purple-500/10",
    label: "Settings Updated",
  },
};

const defaultConfig = {
  icon: Activity,
  color: "text-gray-500 bg-gray-500/10",
  label: "Activity",
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function ActivityLog({
  logs,
  isLoading = false,
  title = "Recent Activity",
  maxHeight = "400px",
  showHeader = true,
}: ActivityLogProps) {
  const content = (
    <div className="space-y-1">
      {isLoading ? (
        // Loading skeleton
        Array.from({ length: 5 }).map((_, i) => (
          <ActivityItemSkeleton key={i} />
        ))
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No activity to show
        </div>
      ) : (
        logs.map((log) => <ActivityItem key={log.id} log={log} />)
      )}
    </div>
  );

  if (!showHeader) {
    return (
      <ScrollArea style={{ maxHeight }} className="pr-4">
        {content}
      </ScrollArea>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }} className="pr-4">
          {content}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface ActivityItemProps {
  log: ActivityLogEntry;
}

export function ActivityItem({ log }: ActivityItemProps) {
  const config = activityConfig[log.type] || defaultConfig;
  const Icon = config.icon;
  const timeAgo = formatDistanceToNow(new Date(log.createdAt), {
    addSuffix: true,
  });
  const fullDate = format(new Date(log.createdAt), "PPpp");

  return (
    <div className="hover:bg-muted/50 group flex items-start gap-3 rounded-lg p-2 transition-colors">
      {/* Icon */}
      <div className={cn("mt-0.5 rounded-full p-1.5", config.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={log.actor.avatarUrl} />
            <AvatarFallback className="text-[10px]">
              {getInitials(log.actor.displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">
            {log.actor.displayName}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {log.description}
        </p>
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            {"reason" in log.metadata && log.metadata.reason ? (
              <span className="italic">
                Reason: {String(log.metadata.reason)}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <time className="shrink-0 text-xs text-muted-foreground" title={fullDate}>
        {timeAgo}
      </time>
    </div>
  );
}

function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg p-2">
      <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

// Compact version for sidebar or small spaces
interface ActivityLogCompactProps {
  logs: ActivityLogEntry[];
  isLoading?: boolean;
  limit?: number;
}

export function ActivityLogCompact({
  logs,
  isLoading = false,
  limit = 5,
}: ActivityLogCompactProps) {
  const displayLogs = logs.slice(0, limit);

  return (
    <div className="space-y-2">
      {isLoading ? (
        Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
            <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
          </div>
        ))
      ) : displayLogs.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">
          No recent activity
        </div>
      ) : (
        displayLogs.map((log) => {
          const config = activityConfig[log.type] || defaultConfig;
          const Icon = config.icon;
          const timeAgo = formatDistanceToNow(new Date(log.createdAt), {
            addSuffix: true,
          });

          return (
            <div key={log.id} className="flex items-center gap-2 text-xs">
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  config.color.split(" ")[0],
                )}
              />
              <span className="flex-1 truncate">
                <span className="font-medium">{log.actor.displayName}</span>{" "}
                <span className="text-muted-foreground">
                  {log.description.toLowerCase()}
                </span>
              </span>
              <span className="shrink-0 text-muted-foreground">{timeAgo}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default ActivityLog;
