"use client";

/**
 * BotAnalytics - Bot usage analytics view
 */

import * as React from "react";
import { format } from "date-fns";
import {
  Bot,
  MessageSquare,
  Terminal,
  AlertTriangle,
  Hash,
  Activity,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAnalyticsStore } from "@/stores/analytics-store";
import type { BotActivityData } from "@/lib/analytics/analytics-types";

// ============================================================================
// Types
// ============================================================================

interface BotAnalyticsProps {
  className?: string;
}

// ============================================================================
// Mock Bot Data (since collector doesn't have real bot data yet)
// ============================================================================

const mockBotData: BotActivityData[] = [
  {
    botId: "bot-1",
    botName: "HelpBot",
    avatarUrl: undefined,
    messageCount: 1234,
    commandCount: 567,
    errorCount: 12,
    lastActive: new Date(Date.now() - 1000 * 60 * 5),
    channels: ["general", "support", "help"],
  },
  {
    botId: "bot-2",
    botName: "GitHubBot",
    avatarUrl: undefined,
    messageCount: 456,
    commandCount: 234,
    errorCount: 3,
    lastActive: new Date(Date.now() - 1000 * 60 * 30),
    channels: ["dev", "engineering"],
  },
  {
    botId: "bot-3",
    botName: "NotifyBot",
    avatarUrl: undefined,
    messageCount: 789,
    commandCount: 0,
    errorCount: 1,
    lastActive: new Date(Date.now() - 1000 * 60 * 60),
    channels: ["general", "announcements"],
  },
  {
    botId: "bot-4",
    botName: "CalendarBot",
    avatarUrl: undefined,
    messageCount: 234,
    commandCount: 123,
    errorCount: 5,
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2),
    channels: ["general"],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(/(?=[A-Z])|Bot/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getHealthStatus(errorRate: number): {
  label: string;
  variant: "default" | "secondary" | "destructive";
} {
  if (errorRate < 1) return { label: "Healthy", variant: "default" };
  if (errorRate < 5) return { label: "Warning", variant: "secondary" };
  return { label: "Critical", variant: "destructive" };
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
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

// ============================================================================
// Component
// ============================================================================

export function BotAnalytics({ className }: BotAnalyticsProps) {
  const { isLoading, includeBots, toggleIncludeBots } = useAnalyticsStore();

  // Use mock data for now
  const botData = mockBotData;

  // Calculate bot stats
  const botStats = React.useMemo(() => {
    const totalBots = botData.length;
    const activeBots = botData.filter(
      (b) => Date.now() - b.lastActive.getTime() < 24 * 60 * 60 * 1000,
    ).length;
    const totalMessages = botData.reduce((sum, b) => sum + b.messageCount, 0);
    const totalCommands = botData.reduce((sum, b) => sum + b.commandCount, 0);
    const totalErrors = botData.reduce((sum, b) => sum + b.errorCount, 0);
    const errorRate =
      totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0;

    return {
      totalBots,
      activeBots,
      totalMessages,
      totalCommands,
      totalErrors,
      errorRate,
    };
  }, [botData]);

  const maxMessages = Math.max(...botData.map((b) => b.messageCount));

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Bots"
          value={botStats.totalBots}
          description="registered bots"
          icon={<Bot className="h-4 w-4" />}
        />
        <StatCard
          title="Active Bots"
          value={botStats.activeBots}
          description="active in last 24h"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="Bot Messages"
          value={botStats.totalMessages.toLocaleString()}
          description="messages from bots"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <StatCard
          title="Commands Executed"
          value={botStats.totalCommands.toLocaleString()}
          description="bot commands run"
          icon={<Terminal className="h-4 w-4" />}
        />
      </div>

      {/* Health Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {botStats.errorRate < 1 ? (
                <Badge variant="default" className="bg-green-600">
                  Healthy
                </Badge>
              ) : botStats.errorRate < 5 ? (
                <Badge variant="secondary">Warning</Badge>
              ) : (
                <Badge variant="destructive">Critical</Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {botStats.errorRate.toFixed(2)}% error rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={cn(
                  "h-5 w-5",
                  botStats.totalErrors > 0
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              />
              <span className="text-3xl font-bold">{botStats.totalErrors}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              errors in this period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Messages/Bot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {botStats.totalBots > 0
                ? Math.round(
                    botStats.totalMessages / botStats.totalBots,
                  ).toLocaleString()
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">messages per bot</p>
          </CardContent>
        </Card>
      </div>

      {/* Bot List */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Activity</CardTitle>
          <CardDescription>
            All registered bots and their activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {botData.length === 0 ? (
            <div className="py-8 text-center">
              <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No bots registered</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bot</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Commands</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="w-[100px]">Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {botData.map((bot) => {
                  const errorRate =
                    bot.messageCount > 0
                      ? (bot.errorCount / bot.messageCount) * 100
                      : 0;
                  const health = getHealthStatus(errorRate);

                  return (
                    <TableRow key={bot.botId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={bot.avatarUrl}
                              alt={bot.botName}
                            />
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {getInitials(bot.botName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{bot.botName}</div>
                            <div className="text-xs text-muted-foreground">
                              Last active{" "}
                              {format(bot.lastActive, "MMM d, h:mm a")}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          {bot.messageCount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Terminal className="h-4 w-4 text-muted-foreground" />
                          {bot.commandCount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            bot.errorCount > 0 ? "destructive" : "outline"
                          }
                        >
                          {bot.errorCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {bot.channels.slice(0, 2).map((channel) => (
                            <Badge
                              key={channel}
                              variant="outline"
                              className="text-xs"
                            >
                              <Hash className="mr-1 h-3 w-3" />
                              {channel}
                            </Badge>
                          ))}
                          {bot.channels.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{bot.channels.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={health.variant}>{health.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Progress
                          value={(bot.messageCount / maxMessages) * 100}
                          className="h-2"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BotAnalytics;
