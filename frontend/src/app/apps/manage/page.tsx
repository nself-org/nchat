"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Search,
  Settings,
  Shield,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppIcon } from "@/components/app-directory";
import { getAllApps } from "@/lib/app-directory/app-registry";
import type { App } from "@/lib/app-directory/app-types";
import { useAdminTranslation } from "@/hooks/use-translation";

export default function ManageAppsPage() {
  const { t } = useAdminTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");

  const allApps = getAllApps();

  // Filter apps
  const filteredApps = allApps.filter((app) => {
    const matchesSearch = app.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: allApps.length,
    active: allApps.filter((a) => a.status === "active").length,
    pending: allApps.filter((a) => a.status === "pending").length,
    deprecated: allApps.filter((a) => a.status === "deprecated").length,
    totalInstalls: allApps.reduce((sum, a) => sum + a.stats.installs, 0),
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/apps"
          className="mb-4 flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("manage.apps.backLink")}
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("manage.apps.title")}</h1>
            <p className="mt-2 text-muted-foreground">
              {t("manage.apps.subtitle")}
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("manage.apps.addApp")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("manage.apps.totalApps")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("manage.apps.activeApps")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.active}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("manage.apps.pendingReview")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("manage.apps.deprecated")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.deprecated}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("manage.apps.totalInstalls")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {formatNumber(stats.totalInstalls)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("manage.apps.tabAll")}</TabsTrigger>
          <TabsTrigger value="pending">
            {t("manage.apps.tabPending")}
            {stats.pending > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="featured">{t("manage.apps.tabFeatured")}</TabsTrigger>
          <TabsTrigger value="settings">{t("manage.apps.tabSettings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {/* Filters */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("manage.apps.searchPlaceholder")}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("manage.apps.statusFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("manage.apps.statusAll")}</SelectItem>
                <SelectItem value="active">{t("manage.apps.statusActive")}</SelectItem>
                <SelectItem value="pending">{t("manage.apps.statusPending")}</SelectItem>
                <SelectItem value="deprecated">{t("manage.apps.statusDeprecated")}</SelectItem>
                <SelectItem value="disabled">{t("manage.apps.statusDisabled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Apps Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("manage.apps.tableApp")}</TableHead>
                  <TableHead>{t("manage.apps.tableType")}</TableHead>
                  <TableHead>{t("manage.apps.tableStatus")}</TableHead>
                  <TableHead>{t("manage.apps.tableInstalls")}</TableHead>
                  <TableHead>{t("manage.apps.tableRating")}</TableHead>
                  <TableHead className="text-right">{t("manage.apps.tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => (
                  <AppTableRow key={app.id} app={app} t={t} />
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>{t("manage.apps.noPendingApps")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="featured" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("manage.apps.featuredTitle")}</CardTitle>
              <CardDescription>
                {t("manage.apps.featuredSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {allApps
                  .filter((a) => a.featured)
                  .map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center gap-4 rounded-lg border p-4"
                    >
                      <AppIcon icon={app.icon} name={app.name} size="md" />
                      <div className="flex-1">
                        <p className="font-medium">{app.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(app.stats.activeInstalls)} {t("manage.apps.activeInstalls")}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        {t("manage.apps.removeFeatured")}
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>{t("manage.apps.securityTitle")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="setting-require-review"
                      className="font-medium cursor-pointer"
                    >
                      {t("manage.apps.requireReviewLabel")}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t("manage.apps.requireReviewDesc")}
                    </p>
                  </div>
                  <input
                    id="setting-require-review"
                    type="checkbox"
                    defaultChecked
                    className="toggle"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="setting-third-party-apps"
                      className="font-medium cursor-pointer"
                    >
                      {t("manage.apps.allowThirdPartyLabel")}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t("manage.apps.allowThirdPartyDesc")}
                    </p>
                  </div>
                  <input
                    id="setting-third-party-apps"
                    type="checkbox"
                    defaultChecked
                    className="toggle"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <CardTitle>{t("manage.apps.permissionsTitle")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="setting-auto-approve-low-risk"
                      className="font-medium cursor-pointer"
                    >
                      {t("manage.apps.autoApproveLowRiskLabel")}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t("manage.apps.autoApproveLowRiskDesc")}
                    </p>
                  </div>
                  <input
                    id="setting-auto-approve-low-risk"
                    type="checkbox"
                    className="toggle"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="setting-admin-approval"
                      className="font-medium cursor-pointer"
                    >
                      {t("manage.apps.requireAdminApprovalLabel")}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t("manage.apps.requireAdminApprovalDesc")}
                    </p>
                  </div>
                  <input
                    id="setting-admin-approval"
                    type="checkbox"
                    defaultChecked
                    className="toggle"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AppTableRow({ app, t }: { app: App; t: (key: string, opts?: Record<string, string | number>) => string }) {
  const statusColors = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    deprecated: "bg-red-100 text-red-700",
    disabled: "bg-gray-100 text-gray-700",
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <AppIcon icon={app.icon} name={app.name} size="sm" />
          <div>
            <Link
              href={`/apps/${app.slug}`}
              className="font-medium hover:underline"
            >
              {app.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("manage.apps.developerBy", { name: app.developer.name })}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {app.type}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={cn("capitalize", statusColors[app.status])}>
          {app.status}
        </Badge>
      </TableCell>
      <TableCell>{formatNumber(app.stats.activeInstalls)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">★</span>
          {app.stats.rating.toFixed(1)}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/apps/${app.slug}`}>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
