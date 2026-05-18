"use client";

import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  MessageSquare,
  User,
  Ban,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModerationReport, ReportType } from "@/lib/admin/admin-store";

interface ModerationItemProps {
  report: ModerationReport;
  onView?: (report: ModerationReport) => void;
  onApprove?: (report: ModerationReport) => void;
  onDismiss?: (report: ModerationReport) => void;
  onDeleteContent?: (report: ModerationReport) => void;
  onWarnUser?: (report: ModerationReport) => void;
  onBanUser?: (report: ModerationReport) => void;
  isProcessing?: boolean;
}

const reportTypeConfig: Record<
  ReportType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  spam: {
    label: "Spam",
    icon: AlertTriangle,
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  harassment: {
    label: "Harassment",
    icon: AlertTriangle,
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  inappropriate: {
    label: "Inappropriate",
    icon: AlertTriangle,
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  other: {
    label: "Other",
    icon: AlertTriangle,
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  },
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function ModerationItem({
  report,
  onView,
  onApprove,
  onDismiss,
  onDeleteContent,
  onWarnUser,
  onBanUser,
  isProcessing = false,
}: ModerationItemProps) {
  const typeConfig = reportTypeConfig[report.type] || reportTypeConfig.other;
  const TypeIcon = typeConfig.icon;

  const isResolved =
    report.status === "resolved" || report.status === "dismissed";

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isResolved && "opacity-60",
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Report Info */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("capitalize", typeConfig.color)}
              >
                <TypeIcon className="mr-1 h-3 w-3" />
                {typeConfig.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(report.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {isResolved && (
                <Badge
                  variant={
                    report.status === "resolved" ? "default" : "secondary"
                  }
                  className="ml-auto sm:ml-0"
                >
                  {report.status === "resolved" ? "Resolved" : "Dismissed"}
                </Badge>
              )}
            </div>

            {/* Reporter */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Reported by:</span>
              <Avatar className="h-5 w-5">
                <AvatarImage src={report.reporter.avatarUrl} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(report.reporter.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{report.reporter.displayName}</span>
            </div>

            {/* Reason */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm">{report.reason}</p>
            </div>

            {/* Reported Content */}
            {report.reportedMessage && (
              <div className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Message in #{report.reportedMessage.channel.name}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(report.reportedMessage.user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-sm font-medium">
                      {report.reportedMessage.user.displayName}
                    </span>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {report.reportedMessage.content}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reported User */}
            {report.reportedUser && !report.reportedMessage && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Reported user:
                </span>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={report.reportedUser.avatarUrl} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(report.reportedUser.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {report.reportedUser.displayName}
                </span>
              </div>
            )}

            {/* Resolution (if resolved) */}
            {isResolved && report.resolution && (
              <div className="bg-primary/5 rounded-lg border-l-2 border-primary p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3" />
                  <span>
                    Resolved by {report.moderator?.displayName ?? "Unknown"}{" "}
                    {report.resolvedAt &&
                      formatDistanceToNow(new Date(report.resolvedAt), {
                        addSuffix: true,
                      })}
                  </span>
                </div>
                <p className="text-sm">{report.resolution}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isResolved && (
            <div className="flex gap-2 sm:flex-col">
              {/* Quick Actions */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApprove?.(report)}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDismiss?.(report)}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Dismiss
              </Button>

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" disabled={isProcessing}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onView?.(report)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  {report.reportedMessage && (
                    <DropdownMenuItem
                      onClick={() => onDeleteContent?.(report)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Message
                    </DropdownMenuItem>
                  )}
                  {(report.reportedUser || report.reportedMessage) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onWarnUser?.(report)}
                        className="text-orange-600"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Warn User
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onBanUser?.(report)}
                        className="text-destructive"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Ban User
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton for loading state
export function ModerationItemSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-16 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="flex gap-2 sm:flex-col">
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ModerationItem;
