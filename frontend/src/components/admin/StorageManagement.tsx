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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  HardDrive,
  Users,
  Hash,
  TrendingUp,
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
  Zap,
  Calendar,
  Download,
  Upload,
  Settings,
  ArrowUpCircle,
  RefreshCw,
} from "lucide-react";
import { StatsCard, StatsGrid } from "./stats-card";
import {
  formatBytes,
  getQuotaStatus,
  STORAGE_TIERS,
  type StorageQuota,
  type StorageUsageBreakdown,
  type StorageStats,
  type QuotaWarning,
  type CleanupPolicy,
  type StorageTier,
} from "@/lib/storage/quota-manager";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

interface StorageManagementProps {
  className?: string;
}

export function StorageManagement({ className }: StorageManagementProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [teamQuota, setTeamQuota] = useState<StorageQuota | null>(null);
  const [breakdown, setBreakdown] = useState<StorageUsageBreakdown | null>(
    null,
  );
  const [warnings, setWarnings] = useState<QuotaWarning[]>([]);
  const [cleanupPolicy, setCleanupPolicy] = useState<CleanupPolicy>({
    enabled: false,
    deleteOlderThan: 90,
    compressImagesOlderThan: 30,
    archiveMessagesOlderThan: 180,
    deleteCacheOlderThan: 7,
    maintainFreeSpace: 20,
  });
  const [selectedTier, setSelectedTier] = useState<string>("free");
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load statistics
      const statsRes = await fetch("/api/storage?action=stats");
      const statsData = await statsRes.json();
      setStats(statsData);

      // Load team quota (using placeholder team ID)
      const quotaRes = await fetch(
        "/api/storage?action=quota&entityId=team-1&entityType=team",
      );
      const quotaData = await quotaRes.json();
      setTeamQuota(quotaData);

      // Load usage breakdown
      const breakdownRes = await fetch(
        "/api/storage?action=breakdown&entityId=team-1&entityType=team",
      );
      const breakdownData = await breakdownRes.json();
      setBreakdown(breakdownData);

      // Load warnings
      const warningsRes = await fetch(
        "/api/storage?action=warnings&entityId=team-1&entityType=team",
      );
      const warningsData = await warningsRes.json();
      setWarnings(warningsData);
    } catch (error) {
      logger.error("Failed to load storage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeStorage = async () => {
    setOptimizeLoading(true);
    try {
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "optimize",
          entityId: "team-1",
          entityType: "team",
        }),
      });
      await res.json();
      await loadData();
    } catch (error) {
      logger.error("Failed to optimize storage:", error);
    } finally {
      setOptimizeLoading(false);
    }
  };

  const handleApplyCleanup = async () => {
    try {
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cleanup",
          entityId: "team-1",
          entityType: "team",
          policy: cleanupPolicy,
        }),
      });
      await res.json();
      setCleanupDialogOpen(false);
      await loadData();
    } catch (error) {
      logger.error("Failed to apply cleanup:", error);
    }
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

  const quotaStatus = teamQuota
    ? getQuotaStatus(teamQuota.used, teamQuota.limit)
    : "ok";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Storage Management
          </h2>
          <p className="text-muted-foreground">
            Monitor and manage your team's storage usage
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
            />
            Refresh
          </Button>
          <Button onClick={handleOptimizeStorage} disabled={optimizeLoading}>
            <Zap className="mr-2 h-4 w-4" />
            Optimize Storage
          </Button>
        </div>
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

      {/* Overview Stats */}
      {stats && teamQuota && (
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Storage"
            value={formatBytes(stats.totalAllocated)}
            description="Total allocated storage"
            icon={HardDrive}
          />
          <StatsCard
            title="Storage Used"
            value={formatBytes(stats.totalUsed)}
            description={`${teamQuota.percentage}% of quota`}
            icon={Database}
            trend={{
              value: 12,
              label: "vs last month",
              isPositive: false,
            }}
          />
          <StatsCard
            title="Files"
            value={stats.fileCount.toLocaleString()}
            description={`Avg ${formatBytes(stats.averageFileSize)}`}
            icon={FileText}
          />
          <StatsCard
            title="Growth Rate"
            value={formatBytes(stats.growthRate)}
            description="per day"
            icon={TrendingUp}
          />
        </StatsGrid>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
          <TabsTrigger value="upgrade">Upgrade</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Storage Quota Card */}
          {teamQuota && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Storage Quota
                </CardTitle>
                <CardDescription>Team-wide storage usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">
                      {formatBytes(teamQuota.used)} /{" "}
                      {formatBytes(teamQuota.limit)}
                    </span>
                  </div>
                  <Progress
                    value={teamQuota.percentage}
                    className={cn(
                      "h-2",
                      quotaStatus === "exceeded" && "[&>*]:bg-red-500",
                      quotaStatus === "critical" && "[&>*]:bg-orange-500",
                      quotaStatus === "warning" && "[&>*]:bg-yellow-500",
                    )}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{teamQuota.percentage}% used</span>
                    <Badge
                      variant={
                        quotaStatus === "exceeded"
                          ? "destructive"
                          : quotaStatus === "critical"
                            ? "default"
                            : quotaStatus === "warning"
                              ? "default"
                              : "secondary"
                      }
                    >
                      {quotaStatus === "ok" && (
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                      )}
                      {quotaStatus === "warning" && (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      )}
                      {quotaStatus === "critical" && (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      )}
                      {quotaStatus === "exceeded" && (
                        <XCircle className="mr-1 h-3 w-3" />
                      )}
                      {quotaStatus.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {stats && stats.daysUntilFull !== null && (
                  <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertDescription>
                      At current growth rate, storage will be full in
                      approximately <strong>{stats.daysUntilFull}</strong> days
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common storage management tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setCleanupDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Old Files
              </Button>
              <Button variant="outline" className="justify-start">
                <Archive className="mr-2 h-4 w-4" />
                Archive Old Messages
              </Button>
              <Button variant="outline" className="justify-start">
                <Database className="mr-2 h-4 w-4" />
                Clear Cache
              </Button>
              <Button variant="outline" className="justify-start">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          {breakdown && (
            <>
              {/* Storage by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Storage by Type</CardTitle>
                  <CardDescription>
                    Breakdown of storage usage by file type
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

              {/* Largest Files */}
              <Card>
                <CardHeader>
                  <CardTitle>Largest Files</CardTitle>
                  <CardDescription>
                    Files taking up the most space
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {breakdown.largestFiles.length > 0 ? (
                      <div className="space-y-2">
                        {breakdown.largestFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded{" "}
                                {new Date(file.uploadedAt).toLocaleDateString()}{" "}
                                by {file.uploadedBy}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {formatBytes(file.size)}
                              </p>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                        No large files found
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage by User</CardTitle>
              <CardDescription>Individual user storage usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center text-muted-foreground">
                User storage breakdown coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage by Channel</CardTitle>
              <CardDescription>Channel-level storage usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center text-muted-foreground">
                Channel storage breakdown coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cleanup Tab */}
        <TabsContent value="cleanup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cleanup Policy</CardTitle>
              <CardDescription>
                Configure automatic storage cleanup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cleanup-enabled">
                    Enable Automatic Cleanup
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically clean up old files and data
                  </p>
                </div>
                <Switch
                  id="cleanup-enabled"
                  checked={cleanupPolicy.enabled}
                  onCheckedChange={(checked) =>
                    setCleanupPolicy({ ...cleanupPolicy, enabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-files">
                    Delete files older than (days)
                  </Label>
                  <Input
                    id="delete-files"
                    type="number"
                    value={cleanupPolicy.deleteOlderThan || ""}
                    onChange={(e) =>
                      setCleanupPolicy({
                        ...cleanupPolicy,
                        deleteOlderThan: parseInt(e.target.value) || undefined,
                      })
                    }
                    disabled={!cleanupPolicy.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compress-images">
                    Compress images older than (days)
                  </Label>
                  <Input
                    id="compress-images"
                    type="number"
                    value={cleanupPolicy.compressImagesOlderThan || ""}
                    onChange={(e) =>
                      setCleanupPolicy({
                        ...cleanupPolicy,
                        compressImagesOlderThan:
                          parseInt(e.target.value) || undefined,
                      })
                    }
                    disabled={!cleanupPolicy.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="archive-messages">
                    Archive messages older than (days)
                  </Label>
                  <Input
                    id="archive-messages"
                    type="number"
                    value={cleanupPolicy.archiveMessagesOlderThan || ""}
                    onChange={(e) =>
                      setCleanupPolicy({
                        ...cleanupPolicy,
                        archiveMessagesOlderThan:
                          parseInt(e.target.value) || undefined,
                      })
                    }
                    disabled={!cleanupPolicy.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-cache">
                    Delete cache older than (days)
                  </Label>
                  <Input
                    id="delete-cache"
                    type="number"
                    value={cleanupPolicy.deleteCacheOlderThan || ""}
                    onChange={(e) =>
                      setCleanupPolicy({
                        ...cleanupPolicy,
                        deleteCacheOlderThan:
                          parseInt(e.target.value) || undefined,
                      })
                    }
                    disabled={!cleanupPolicy.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="free-space">Maintain free space (%)</Label>
                  <Input
                    id="free-space"
                    type="number"
                    min="0"
                    max="100"
                    value={cleanupPolicy.maintainFreeSpace || ""}
                    onChange={(e) =>
                      setCleanupPolicy({
                        ...cleanupPolicy,
                        maintainFreeSpace:
                          parseInt(e.target.value) || undefined,
                      })
                    }
                    disabled={!cleanupPolicy.enabled}
                  />
                </div>
              </div>

              <Button
                onClick={() => setCleanupDialogOpen(true)}
                disabled={!cleanupPolicy.enabled}
              >
                Apply Cleanup Policy
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upgrade Tab */}
        <TabsContent value="upgrade" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Plans</CardTitle>
              <CardDescription>
                Upgrade your storage to get more space
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STORAGE_TIERS.map((tier) => (
                  <Card
                    key={tier.id}
                    className={cn(
                      "relative cursor-pointer transition-all hover:border-primary",
                      selectedTier === tier.id && "border-primary shadow-md",
                    )}
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{tier.name}</CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold text-foreground">
                          ${(tier.priceMonthly / 100).toFixed(2)}
                        </span>
                        /month
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm font-medium">
                        {formatBytes(tier.limit)}
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {selectedTier === tier.id && tier.id !== "free" && (
                        <Button className="w-full">
                          <ArrowUpCircle className="mr-2 h-4 w-4" />
                          Upgrade Now
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cleanup Confirmation Dialog */}
      <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Cleanup Policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete old files and data according to the policy
              settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyCleanup}>
              Apply Cleanup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
