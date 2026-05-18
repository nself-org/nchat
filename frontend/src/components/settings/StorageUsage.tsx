"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Image,
  Video,
  Music,
  File,
  Archive,
  Code,
  Database,
  Trash2,
  Download,
  RefreshCw,
  ArrowUpCircle,
  Info,
} from "lucide-react";
import {
  formatBytes,
  getQuotaStatus,
  STORAGE_TIERS,
  type StorageQuota,
  type StorageUsageBreakdown,
  type QuotaWarning,
} from "@/lib/storage/quota-manager";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

import { logger } from "@/lib/logger";

interface StorageUsageProps {
  className?: string;
}

export function StorageUsage({ className }: StorageUsageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [breakdown, setBreakdown] = useState<StorageUsageBreakdown | null>(
    null,
  );
  const [warnings, setWarnings] = useState<QuotaWarning[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Load user quota
      const quotaRes = await fetch(
        `/api/storage?action=quota&entityId=${user.id}&entityType=user`,
      );
      const quotaData = await quotaRes.json();
      setQuota(quotaData);

      // Load usage breakdown
      const breakdownRes = await fetch(
        `/api/storage?action=breakdown&entityId=${user.id}&entityType=user`,
      );
      const breakdownData = await breakdownRes.json();
      setBreakdown(breakdownData);

      // Load warnings
      const warningsRes = await fetch(
        `/api/storage?action=warnings&entityId=${user.id}&entityType=user`,
      );
      const warningsData = await warningsRes.json();
      setWarnings(warningsData);
    } catch (error) {
      logger.error("Failed to load storage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOldFiles = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-old-files",
          entityId: user.id,
          entityType: "user",
          olderThanDays: 90,
        }),
      });
      await res.json();
      await loadData();
    } catch (error) {
      logger.error("Failed to delete old files:", error);
    }
  };

  const handleClearCache = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear-cache",
          entityId: user.id,
          entityType: "user",
        }),
      });
      await res.json();
      await loadData();
    } catch (error) {
      logger.error("Failed to clear cache:", error);
    }
  };

  const handleDownloadData = async () => {
    // Implement data export
    // REMOVED: console.log('Download data')
  };

  const handleAcknowledgeWarning = async (warningId: string) => {
    try {
      await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "acknowledge-warning",
          warningId,
        }),
      });
      await loadData();
    } catch (error) {
      logger.error("Failed to acknowledge warning:", error);
    }
  };

  const quotaStatus = quota ? getQuotaStatus(quota.used, quota.limit) : "ok";
  const currentTier =
    STORAGE_TIERS.find((tier) => quota && tier.limit >= quota.limit) ||
    STORAGE_TIERS[0];

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Storage Usage</h3>
          <p className="text-sm text-muted-foreground">
            Manage your personal storage quota
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning) => (
            <Alert
              key={warning.id}
              variant={warning.type === "exceeded" ? "destructive" : "default"}
              className={cn(
                warning.type === "critical" &&
                  "border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
                warning.type === "approaching" &&
                  "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{warning.message}</span>
                {!warning.acknowledged && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAcknowledgeWarning(warning.id)}
                  >
                    Dismiss
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Storage Quota Overview */}
      {quota && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Your Storage Quota
            </CardTitle>
            <CardDescription>
              {currentTier.name} Plan - {formatBytes(quota.limit)} total
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium">
                  {formatBytes(quota.used)} / {formatBytes(quota.limit)}
                </span>
              </div>
              <Progress
                value={quota.percentage}
                className={cn(
                  "h-2",
                  quotaStatus === "exceeded" && "[&>*]:bg-red-500",
                  quotaStatus === "critical" && "[&>*]:bg-orange-500",
                  quotaStatus === "warning" && "[&>*]:bg-yellow-500",
                )}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{quota.percentage}% used</span>
                <Badge
                  variant={
                    quotaStatus === "exceeded"
                      ? "destructive"
                      : quotaStatus === "critical" || quotaStatus === "warning"
                        ? "default"
                        : "secondary"
                  }
                >
                  {quotaStatus === "ok" && (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  )}
                  {(quotaStatus === "warning" ||
                    quotaStatus === "critical") && (
                    <AlertTriangle className="mr-1 h-3 w-3" />
                  )}
                  {quotaStatus === "exceeded" && (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  {quotaStatus.toUpperCase()}
                </Badge>
              </div>
            </div>

            {quota.percentage >= 80 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {quota.percentage >= 100 ? (
                    <>
                      You've reached your storage limit. Delete some files or
                      upgrade your plan to continue uploading.
                    </>
                  ) : (
                    <>
                      You're running low on storage. Consider deleting old files
                      or upgrading your plan.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          {breakdown && (
            <Card>
              <CardHeader>
                <CardTitle>Storage Breakdown</CardTitle>
                <CardDescription>
                  See what's taking up your storage space
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      type: "Messages",
                      size: breakdown.byType.messages,
                      icon: FileText,
                      color: "bg-blue-500",
                    },
                    {
                      type: "Images",
                      size: breakdown.byType.images,
                      icon: Image,
                      color: "bg-purple-500",
                    },
                    {
                      type: "Videos",
                      size: breakdown.byType.videos,
                      icon: Video,
                      color: "bg-red-500",
                    },
                    {
                      type: "Audio",
                      size: breakdown.byType.audio,
                      icon: Music,
                      color: "bg-green-500",
                    },
                    {
                      type: "Documents",
                      size: breakdown.byType.documents,
                      icon: File,
                      color: "bg-orange-500",
                    },
                    {
                      type: "Archives",
                      size: breakdown.byType.archives,
                      icon: Archive,
                      color: "bg-yellow-500",
                    },
                    {
                      type: "Code",
                      size: breakdown.byType.code,
                      icon: Code,
                      color: "bg-pink-500",
                    },
                    {
                      type: "Cache",
                      size: breakdown.byType.cache,
                      icon: Database,
                      color: "bg-gray-500",
                    },
                  ].map(({ type, size, icon: Icon, color }) => {
                    const percentage =
                      breakdown.total > 0
                        ? Math.round((size / breakdown.total) * 100)
                        : 0;

                    if (percentage === 0) return null;

                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span>{type}</span>
                          </div>
                          <span className="font-medium">
                            {formatBytes(size)} ({percentage}%)
                          </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn("h-full transition-all", color)}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Actions</CardTitle>
              <CardDescription>
                Free up space by managing your files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={handleDeleteOldFiles}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete files older than 90 days
                </Button>

                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={handleClearCache}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Clear cached data
                </Button>

                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={handleDownloadData}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download all your data
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Need more space?</h4>
                <p className="text-sm text-muted-foreground">
                  Upgrade to a higher plan to get more storage and features.
                </p>
                <Button>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  View Plans
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                You are on the {currentTier.name} plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Storage</span>
                  <span className="text-sm font-medium">
                    {formatBytes(currentTier.limit)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="text-sm font-medium">
                    ${(currentTier.priceMonthly / 100).toFixed(2)}/month
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Features included:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {currentTier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
