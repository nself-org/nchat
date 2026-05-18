"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Pause,
  Play,
  Send,
  Copy,
  Check,
  Hash,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Webhook,
  getWebhookStatusColor,
  copyWebhookUrl,
  formatDeliveryTime,
} from "@/lib/webhooks";

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookItemProps {
  webhook: Webhook;
  onEdit?: (webhook: Webhook) => void;
  onDelete?: (webhook: Webhook) => void;
  onTest?: (webhook: Webhook) => void;
  onToggleStatus?: (webhook: Webhook) => void;
  onSelect?: (webhook: Webhook) => void;
  isSelected?: boolean;
  showChannel?: boolean;
  compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WebhookItem({
  webhook,
  onEdit,
  onDelete,
  onTest,
  onToggleStatus,
  onSelect,
  isSelected = false,
  showChannel = true,
  compact = false,
}: WebhookItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    const success = await copyWebhookUrl(webhook.url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusVariant = getWebhookStatusColor(webhook.status);
  const isActive = webhook.status === "active";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-3 transition-colors",
          "hover:bg-accent/50 cursor-pointer",
          isSelected && "border-primary bg-accent",
        )}
        onClick={() => onSelect?.(webhook)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.(webhook);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={webhook.avatar_url} alt={webhook.name} />
          <AvatarFallback className="text-xs">
            {getInitials(webhook.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{webhook.name}</span>
            <Badge variant={statusVariant} className="h-5 text-[10px]">
              {webhook.status}
            </Badge>
          </div>
          {showChannel && webhook.channel && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              {webhook.channel.name}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors",
        "hover:bg-accent/50",
        isSelected && "border-primary ring-1 ring-primary",
      )}
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={webhook.avatar_url} alt={webhook.name} />
        <AvatarFallback>{getInitials(webhook.name)}</AvatarFallback>
      </Avatar>

      {/* Main Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold">{webhook.name}</h3>
          <Badge variant={statusVariant}>{webhook.status}</Badge>
        </div>

        {showChannel && webhook.channel && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Hash className="h-3.5 w-3.5" />
            <span>{webhook.channel.name}</span>
          </div>
        )}

        {/* Webhook URL */}
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
            {webhook.url}
          </code>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyUrl();
                  }}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy URL"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Last Used */}
        {webhook.last_used_at && (
          <p className="mt-2 text-xs text-muted-foreground">
            Last used: {formatDeliveryTime(webhook.last_used_at)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onTest?.(webhook);
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Test Webhook</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus?.(webhook);
                }}
              >
                {isActive ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isActive ? "Pause" : "Activate"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(webhook);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleCopyUrl();
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(webhook);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

export function WebhookItemSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-6 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default WebhookItem;
