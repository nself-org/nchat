"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserMinus, Shield } from "lucide-react";

interface UserStatsProps {
  totalUsers?: number;
  activeUsers?: number;
  newUsersThisWeek?: number;
  bannedUsers?: number;
}

/**
 * UserStats - Display user statistics in the admin dashboard
 */
export function UserStats({
  totalUsers = 0,
  activeUsers = 0,
  newUsersThisWeek = 0,
  bannedUsers = 0,
}: UserStatsProps) {
  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      description: "Total registered users",
    },
    {
      title: "Active Users",
      value: activeUsers,
      icon: UserPlus,
      description: "Active in last 30 days",
    },
    {
      title: "New This Week",
      value: newUsersThisWeek,
      icon: UserPlus,
      description: "Joined in the last 7 days",
    },
    {
      title: "Banned Users",
      value: bannedUsers,
      icon: Shield,
      description: "Currently banned",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default UserStats;
