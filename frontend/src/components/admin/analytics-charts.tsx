"use client";

import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ChartData {
  date: string;
  users: number;
  messages: number;
  activeUsers: number;
}

interface PeakHour {
  hour: string;
  messages: number;
}

interface PopularChannel {
  name: string;
  messages: number;
  members: number;
  percentage: number;
}

interface RoleDistribution {
  role: string;
  count: number;
  color: string;
}

export function MessagesOverTimeChart({ data }: { data: ChartData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Messages Over Time</CardTitle>
        <CardDescription>
          Daily message volume for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[300px] items-end gap-1">
          {data.slice(-14).map((d, i) => (
            <div
              key={i}
              className="bg-primary/20 hover:bg-primary/40 flex-1 rounded-t transition-colors"
              style={{
                height: `${(d.messages / 600) * 100}%`,
                minHeight: "4px",
              }}
              title={`${d.date}: ${d.messages} messages`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{data[data.length - 14]?.date ?? ""}</span>
          <span>{data[data.length - 1]?.date ?? ""}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function PeakActivityChart({ data }: { data: PeakHour[] }) {
  const maxMessages = Math.max(...data.map((h) => h.messages));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Peak Activity Hours</CardTitle>
        <CardDescription>Average message volume by hour (UTC)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((hour) => (
            <div key={hour.hour} className="flex items-center gap-3">
              <span className="w-16 text-sm text-muted-foreground">
                {hour.hour}
              </span>
              <div className="flex-1">
                <Progress
                  value={(hour.messages / maxMessages) * 100}
                  className="h-2"
                />
              </div>
              <span className="w-12 text-right text-sm">{hour.messages}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function UserGrowthChart({ data }: { data: ChartData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">User Growth</CardTitle>
        <CardDescription>New user signups over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[300px] items-end gap-1">
          {data.slice(-14).map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-green-500/20 transition-colors hover:bg-green-500/40"
              style={{
                height: `${(d.users / 25) * 100}%`,
                minHeight: "4px",
              }}
              title={`${d.date}: ${d.users} new users`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{data[data.length - 14]?.date ?? ""}</span>
          <span>{data[data.length - 1]?.date ?? ""}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function RoleDistributionChart({
  data,
  totalCount,
}: {
  data: RoleDistribution[];
  totalCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Role Distribution</CardTitle>
        <CardDescription>Users by role type</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((role) => (
            <div key={role.role} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${role.color}`} />
                  <span className="text-sm font-medium">{role.role}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {role.count} ({((role.count / totalCount) * 100).toFixed(1)}%)
                </span>
              </div>
              <Progress
                value={(role.count / totalCount) * 100}
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DailyActiveUsersChart({ data }: { data: ChartData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily Active Users</CardTitle>
        <CardDescription>Number of users active each day</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[200px] items-end gap-1">
          {data.map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-blue-500/20 transition-colors hover:bg-blue-500/40"
              style={{
                height: `${(d.activeUsers / 70) * 100}%`,
                minHeight: "4px",
              }}
              title={`${d.date}: ${d.activeUsers} active users`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{data[0]?.date ?? ""}</span>
          <span>{data[data.length - 1]?.date ?? ""}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function PopularChannelsChart({ data }: { data: PopularChannel[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Most Active Channels</CardTitle>
        <CardDescription>Ranked by message volume</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((channel, index) => (
            <div key={channel.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded border text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="font-medium">#{channel.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {channel.messages.toLocaleString()} messages
                </span>
              </div>
              <Progress value={channel.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
