/**
 * Billing Admin Dashboard
 * Overview of billing, subscriptions, and revenue
 */

"use client";

import { useState } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BillingStats, PlanTier, PaymentStatus } from "@/types/billing";
import { PLANS, formatPrice } from "@/config/billing-plans";
import { cn } from "@/lib/utils";

interface BillingDashboardProps {
  stats?: BillingStats;
  className?: string;
}

// Mock data for demo
const mockStats: BillingStats = {
  totalRevenue: 125_430,
  monthlyRecurringRevenue: 42_150,
  annualRecurringRevenue: 505_800,
  activeSubscriptions: 847,
  churnRate: 3.2,
  averageRevenuePerUser: 49.8,
  planDistribution: {
    free: 1234,
    starter: 456,
    pro: 289,
    business: 87,
    enterprise: 15,
  },
  paymentMethodDistribution: {
    card: 782,
    crypto: 65,
  },
  recentPayments: [],
  failedPayments: [],
  upcomingRenewals: [],
};

export function BillingDashboard({
  stats = mockStats,
  className,
}: BillingDashboardProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">(
    "30d",
  );

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    trend,
  }: {
    title: string;
    value: string;
    change: string;
    icon: any;
    trend: "up" | "down";
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {trend === "up" ? (
            <ArrowUpRight className="h-3 w-3 text-green-600" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-red-600" />
          )}
          <span className={trend === "up" ? "text-green-600" : "text-red-600"}>
            {change}
          </span>
          <span className="ml-1">from last period</span>
        </div>
      </CardContent>
    </Card>
  );

  const PlanDistributionCard = () => (
    <Card>
      <CardHeader>
        <CardTitle>Plan Distribution</CardTitle>
        <CardDescription>Active subscriptions by plan tier</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(stats.planDistribution).map(([planId, count]) => {
          const plan = PLANS[planId as PlanTier];
          const total = Object.values(stats.planDistribution).reduce(
            (a, b) => a + b,
            0,
          );
          const percentage = (count / total) * 100;

          return (
            <div key={planId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "min-w-[80px] justify-center",
                      plan.color && `border-${plan.color}-500`,
                    )}
                  >
                    {plan.name}
                  </Badge>
                  <span className="text-muted-foreground">
                    {count.toLocaleString()}
                  </span>
                </div>
                <span className="font-medium">{percentage.toFixed(1)}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  const RevenueBreakdownCard = () => {
    const cardRevenue =
      (stats.totalRevenue * stats.paymentMethodDistribution.card) /
      (stats.paymentMethodDistribution.card +
        stats.paymentMethodDistribution.crypto);
    const cryptoRevenue = stats.totalRevenue - cardRevenue;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
          <CardDescription>By payment method</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Card Payments</span>
              </div>
              <span className="font-medium">{formatPrice(cardRevenue)}</span>
            </div>
            <Progress
              value={(cardRevenue / stats.totalRevenue) * 100}
              className="h-2"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Crypto Payments</span>
              </div>
              <span className="font-medium">{formatPrice(cryptoRevenue)}</span>
            </div>
            <Progress
              value={(cryptoRevenue / stats.totalRevenue) * 100}
              className="h-2 bg-orange-500"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const FailedPaymentsCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Failed Payments
        </CardTitle>
        <CardDescription>
          {stats.failedPayments.length} payments need attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stats.failedPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failed payments</p>
        ) : (
          <div className="space-y-3">
            {stats.failedPayments.slice(0, 5).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatPrice(payment.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Retry
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const UpcomingRenewalsCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Renewals
        </CardTitle>
        <CardDescription>Next 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {stats.upcomingRenewals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming renewals</p>
        ) : (
          <div className="space-y-3">
            {stats.upcomingRenewals.slice(0, 5).map((subscription) => (
              <div
                key={subscription.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {PLANS[subscription.planId].name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Renews{" "}
                    {new Date(
                      subscription.currentPeriodEnd,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary">{subscription.interval}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Billing Dashboard</h2>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="1y">1 Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatPrice(stats.totalRevenue)}
          change="+12.5%"
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          title="MRR"
          value={formatPrice(stats.monthlyRecurringRevenue)}
          change="+8.2%"
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions.toLocaleString()}
          change="+5.1%"
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Churn Rate"
          value={`${stats.churnRate}%`}
          change="-1.2%"
          icon={TrendingDown}
          trend="down"
        />
      </div>

      {/* Charts and Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <PlanDistributionCard />
        <RevenueBreakdownCard />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FailedPaymentsCard />
        <UpcomingRenewalsCard />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            Export Revenue Report
          </Button>
          <Button variant="outline" size="sm">
            View All Transactions
          </Button>
          <Button variant="outline" size="sm">
            Manage Stripe Settings
          </Button>
          <Button variant="outline" size="sm">
            Configure Plans
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
