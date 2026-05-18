"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  TrendingUp,
  Database,
  Users,
  Calendar,
  CheckCircle,
  ArrowRight,
  Loader2,
  Download,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useTeamStore } from "@/stores/team-store";
import { teamManager } from "@/lib/team/team-manager";
import type { PlanTier } from "@/lib/team/team-types";

import { logger } from "@/lib/logger";

interface TeamBillingProps {
  teamId: string;
}

export function TeamBilling({ teamId }: TeamBillingProps) {
  const { billing, usage, setBilling, setUsage, setLoadingBilling } =
    useTeamStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBillingData = async () => {
      setLoadingBilling(true);
      try {
        const [billingData, usageData] = await Promise.all([
          teamManager.getBillingInfo(teamId),
          teamManager.getUsageStatistics(teamId),
        ]);

        setBilling(billingData);
        setUsage(usageData);
      } catch (error) {
        logger.error("Failed to load billing data:", error);
      } finally {
        setLoadingBilling(false);
        setIsLoading(false);
      }
    };

    loadBillingData();
  }, [teamId]);

  const planFeatures = {
    free: ["5 members", "10 channels", "10 GB storage", "Basic support"],
    starter: [
      "25 members",
      "Unlimited channels",
      "100 GB storage",
      "Email support",
      "Custom branding",
    ],
    professional: [
      "100 members",
      "Unlimited channels",
      "1 TB storage",
      "Priority support",
      "Custom branding",
      "Advanced roles",
      "SSO integration",
    ],
    enterprise: [
      "Unlimited members",
      "Unlimited channels",
      "Unlimited storage",
      "24/7 priority support",
      "Custom branding",
      "Advanced roles",
      "SSO integration",
      "Audit logs",
      "Data export",
      "Dedicated support",
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const storagePercentage = usage
    ? teamManager.calculateStoragePercentage(
        usage.storageUsed,
        usage.storageQuota,
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Usage</h1>
        <p className="text-muted-foreground">
          Manage your subscription and view usage statistics
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge>{billing?.planTier || "Free"}</Badge>
              </CardTitle>
              <CardDescription>
                {billing?.billingInterval === "yearly"
                  ? "Billed annually"
                  : "Billed monthly"}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                ${billing?.planPrice || 0}
                <span className="text-sm font-normal text-muted-foreground">
                  /{billing?.billingInterval === "yearly" ? "year" : "month"}
                </span>
              </div>
              {billing?.status === "active" && (
                <Badge
                  variant="outline"
                  className="mt-2 bg-green-50 text-green-700"
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {billing && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Current Period
                  </p>
                  <p className="flex items-center gap-1 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    {new Date(
                      billing.currentPeriodStart,
                    ).toLocaleDateString()}{" "}
                    - {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>

                {billing.nextInvoiceDate && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Next Invoice
                    </p>
                    <p className="flex items-center gap-1 text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      {new Date(billing.nextInvoiceDate).toLocaleDateString()} -
                      ${billing.nextInvoiceAmount}
                    </p>
                  </div>
                )}
              </div>

              {billing.paymentMethod && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Payment Method
                    </p>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {billing.paymentMethod.brand} ending in{" "}
                        {billing.paymentMethod.last4}
                      </span>
                      <Button variant="outline" size="sm">
                        Update
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button>
              <TrendingUp className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
            <Button variant="outline">View All Plans</Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>Current billing period usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Members */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active Members</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {usage.activeMembers} / {usage.totalMembers}
                </span>
              </div>
              <Progress
                value={(usage.activeMembers / usage.totalMembers) * 100}
              />
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Storage</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {teamManager.formatFileSize(usage.storageUsed)} /{" "}
                  {usage.storageQuota} GB
                </span>
              </div>
              <Progress value={storagePercentage} />
            </div>

            {/* API Calls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    API Calls This Month
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {usage.apiCallsThisMonth.toLocaleString()} /{" "}
                  {usage.apiRateLimit.toLocaleString()}
                </span>
              </div>
              <Progress value={usage.apiPercentage} />
            </div>

            <Separator />

            {/* Storage Breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Storage Breakdown</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Files</span>
                  <span className="text-sm font-medium">
                    {teamManager.formatFileSize(usage.storageByType.files)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Images</span>
                  <span className="text-sm font-medium">
                    {teamManager.formatFileSize(usage.storageByType.images)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Videos</span>
                  <span className="text-sm font-medium">
                    {teamManager.formatFileSize(usage.storageByType.videos)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Other</span>
                  <span className="text-sm font-medium">
                    {teamManager.formatFileSize(usage.storageByType.other)}
                  </span>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Usage Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(planFeatures).map(([plan, features]) => (
            <Card
              key={plan}
              className={billing?.planTier === plan ? "border-primary" : ""}
            >
              <CardHeader>
                <CardTitle className="capitalize">{plan}</CardTitle>
                <div className="text-3xl font-bold">
                  $
                  {plan === "free"
                    ? 0
                    : plan === "starter"
                      ? 29
                      : plan === "professional"
                        ? 99
                        : "Custom"}
                  {plan !== "enterprise" && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={billing?.planTier === plan ? "outline" : "default"}
                  className="w-full"
                  disabled={billing?.planTier === plan}
                >
                  {billing?.planTier === plan ? (
                    "Current Plan"
                  ) : (
                    <>
                      {plan === "enterprise" ? "Contact Sales" : "Upgrade"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TeamBilling;
