/**
 * User Analytics Table Component
 * Displays user engagement metrics
 */

"use client";

import { useUserAnalytics } from "@/hooks/use-analytics-plugin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserAnalyticsTableProps {
  period?: string;
  limit?: number;
}

export function UserAnalyticsTable({
  period = "7d",
  limit = 10,
}: UserAnalyticsTableProps) {
  const { users, isLoading, error } = useUserAnalytics({ period, limit });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Analytics</CardTitle>
          <CardDescription>Loading user engagement data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error Loading User Analytics</CardTitle>
          <CardDescription>
            Failed to load user analytics. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getEngagementBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default">High</Badge>;
    if (score >= 50) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Analytics</CardTitle>
        <CardDescription>
          Top {limit} users by engagement (last {period})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Messages</TableHead>
              <TableHead className="text-right">Channels</TableHead>
              <TableHead className="text-right">Engagement</TableHead>
              <TableHead>Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No user data available
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.messageCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.channelCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {getEngagementBadge(user.engagementScore)}
                  </TableCell>
                  <TableCell>
                    {new Date(user.lastActive).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
