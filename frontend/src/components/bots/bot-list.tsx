"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle,
  Settings,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Hash,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BotPermissionsSummary } from "./bot-permissions";
import { cn } from "@/lib/utils";
import type { Bot as BotType, BotInstallation } from "@/graphql/bots";

// ============================================================================
// TYPES
// ============================================================================

export interface BotListProps {
  bots: BotInstallation[];
  loading?: boolean;
  onConfigure?: (bot: BotType) => void;
  onRemove?: (botId: string, channelId?: string) => void;
  onViewDetails?: (bot: BotType) => void;
  showChannels?: boolean;
  emptyMessage?: string;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getBotStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "inactive":
      return "bg-gray-400";
    case "suspended":
      return "bg-red-500";
    case "pending":
      return "bg-amber-500";
    default:
      return "bg-gray-400";
  }
}

function getBotStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "inactive":
      return "secondary";
    case "suspended":
      return "destructive";
    case "pending":
      return "outline";
    default:
      return "secondary";
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BotList({
  bots,
  loading = false,
  onConfigure,
  onRemove,
  onViewDetails,
  showChannels = true,
  emptyMessage = "No bots installed",
  className,
}: BotListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBots = bots.filter((installation) => {
    if (!searchQuery) return true;
    const bot = installation.bot;
    if (!bot) return false;
    return (
      bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (loading) {
    return <BotListSkeleton />;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {bots.length > 5 && (
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search installed bots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <span className="text-sm text-muted-foreground">
            {filteredBots.length} of {bots.length} bots
          </span>
        </div>
      )}

      {filteredBots.length === 0 ? (
        <EmptyState
          message={searchQuery ? "No bots match your search" : emptyMessage}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Bot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                {showChannels && <TableHead>Channels</TableHead>}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBots.map((installation) => {
                const bot = installation.bot;
                if (!bot) return null;

                return (
                  <TableRow key={installation.id}>
                    <TableCell>
                      <div
                        className="flex cursor-pointer items-center gap-3"
                        role="button"
                        tabIndex={0}
                        onClick={() => onViewDetails?.(bot)}
                        onKeyDown={(e) => {
                          if (
                            onViewDetails &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            e.preventDefault();
                            onViewDetails(bot);
                          }
                        }}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={bot.avatarUrl} alt={bot.name} />
                          <AvatarFallback>
                            <Bot className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{bot.name}</span>
                            {bot.verified && (
                              <CheckCircle className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          <p className="line-clamp-1 text-sm text-muted-foreground">
                            {bot.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getBotStatusBadgeVariant(bot.status)}>
                        <span
                          className={cn(
                            "mr-1.5 h-2 w-2 rounded-full",
                            getBotStatusColor(bot.status),
                          )}
                        />
                        {bot.status.charAt(0).toUpperCase() +
                          bot.status.slice(1)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <BotPermissionsSummary
                        permissions={installation.permissions}
                      />
                    </TableCell>

                    {showChannels && (
                      <TableCell>
                        {installation.channel ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{installation.channel.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            All channels
                          </span>
                        )}
                      </TableCell>
                    )}

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onConfigure?.(bot)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onViewDetails?.(bot)}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              onRemove?.(bot.id, installation.channelId)
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <Bot className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-1 font-medium">{message}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Add bots to automate tasks, integrate with other services, and enhance
        your workspace.
      </p>
    </div>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function BotListSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Bot</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Channels</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// CARD VARIANT
// ============================================================================

export function BotListCards({
  bots,
  loading = false,
  onConfigure,
  onRemove,
  onViewDetails,
  emptyMessage = "No bots installed",
  className,
}: Omit<BotListProps, "showChannels">) {
  if (loading) {
    return (
      <div
        className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (bots.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {bots.map((installation) => {
        const bot = installation.bot;
        if (!bot) return null;

        return (
          <div
            key={installation.id}
            className="space-y-3 rounded-lg border bg-card p-4"
          >
            <div className="flex items-start justify-between">
              <div
                className="flex cursor-pointer items-center gap-3"
                role="button"
                tabIndex={0}
                onClick={() => onViewDetails?.(bot)}
                onKeyDown={(e) => {
                  if (onViewDetails && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onViewDetails(bot);
                  }
                }}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={bot.avatarUrl} alt={bot.name} />
                  <AvatarFallback>
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{bot.name}</span>
                    {bot.verified && (
                      <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <Badge
                    variant={getBotStatusBadgeVariant(bot.status)}
                    className="mt-1"
                  >
                    {bot.status}
                  </Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onConfigure?.(bot)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onRemove?.(bot.id, installation.channelId)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="line-clamp-2 text-sm text-muted-foreground">
              {bot.description}
            </p>

            <div className="flex items-center justify-between border-t pt-2">
              <BotPermissionsSummary permissions={installation.permissions} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigure?.(bot)}
              >
                Configure
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
