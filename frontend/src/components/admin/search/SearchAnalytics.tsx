"use client";

/**
 * SearchAnalytics - Admin dashboard for search analytics
 *
 * Features:
 * - Top searches
 * - Search success rate (clicks / searches)
 * - Zero-result searches
 * - Average search time
 * - Search trends over time
 * - User search behavior
 */

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Search,
  Clock,
  Users,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================================
// Types
// ============================================================================

export interface SearchAnalyticsProps {
  /** Time range for analytics */
  timeRange?: "day" | "week" | "month" | "year";
  /** Callback when export is clicked */
  onExport?: (data: SearchAnalyticsData) => void;
  /** Additional class names */
  className?: string;
}

interface SearchAnalyticsData {
  overview: {
    totalSearches: number;
    uniqueUsers: number;
    avgSearchTime: number;
    successRate: number;
  };
  topSearches: Array<{
    query: string;
    count: number;
    successRate: number;
    avgClickPosition: number;
  }>;
  zeroResultSearches: Array<{
    query: string;
    count: number;
    lastSearched: Date;
  }>;
  searchTrends: Array<{
    date: Date;
    searches: number;
    successfulSearches: number;
  }>;
  userBehavior: {
    avgQueriesPerUser: number;
    avgFiltersUsed: number;
    mostUsedFilters: Array<{
      filter: string;
      count: number;
    }>;
  };
}

// ============================================================================
// Mock Data (Replace with real API calls)
// ============================================================================

const generateMockData = (timeRange: string): SearchAnalyticsData => {
  const days =
    timeRange === "day"
      ? 1
      : timeRange === "week"
        ? 7
        : timeRange === "month"
          ? 30
          : 365;

  return {
    overview: {
      totalSearches: Math.floor(Math.random() * 10000) + 1000,
      uniqueUsers: Math.floor(Math.random() * 500) + 50,
      avgSearchTime: Math.random() * 500 + 100,
      successRate: Math.random() * 0.3 + 0.7,
    },
    topSearches: Array.from({ length: 10 }, (_, i) => ({
      query: [
        "project update",
        "meeting notes",
        "design review",
        "bug fix",
        "deployment",
        "user feedback",
        "code review",
        "documentation",
        "roadmap",
        "sprint planning",
      ][i],
      count: Math.floor(Math.random() * 500) + 100,
      successRate: Math.random() * 0.4 + 0.6,
      avgClickPosition: Math.floor(Math.random() * 5) + 1,
    })),
    zeroResultSearches: Array.from({ length: 5 }, (_, i) => ({
      query: [
        "obscure term",
        "typo search",
        "nonexistent feature",
        "deleted channel",
        "old project",
      ][i],
      count: Math.floor(Math.random() * 20) + 1,
      lastSearched: subDays(new Date(), Math.floor(Math.random() * days)),
    })),
    searchTrends: Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const total = Math.floor(Math.random() * 200) + 50;
      return {
        date: subDays(new Date(), days - i - 1),
        searches: total,
        successfulSearches: Math.floor(total * (Math.random() * 0.3 + 0.7)),
      };
    }),
    userBehavior: {
      avgQueriesPerUser: Math.random() * 10 + 5,
      avgFiltersUsed: Math.random() * 2 + 1,
      mostUsedFilters: [
        { filter: "Date range", count: 450 },
        { filter: "From user", count: 320 },
        { filter: "In channel", count: 280 },
        { filter: "Has file", count: 150 },
        { filter: "Has link", count: 120 },
      ],
    },
  };
};

// ============================================================================
// Main Component
// ============================================================================

export function SearchAnalytics({
  timeRange = "week",
  onExport,
  className,
}: SearchAnalyticsProps) {
  const [selectedTimeRange, setSelectedTimeRange] = React.useState(timeRange);
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = React.useState<SearchAnalyticsData>(
    generateMockData(timeRange),
  );

  // Reload data when time range changes
  React.useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setData(generateMockData(selectedTimeRange));
      setIsLoading(false);
    }, 500);
  }, [selectedTimeRange]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setData(generateMockData(selectedTimeRange));
      setIsLoading(false);
    }, 500);
  };

  const handleExport = () => {
    if (onExport) {
      onExport(data);
    } else {
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `search-analytics-${format(new Date(), "yyyy-MM-dd")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Search Analytics
          </h1>
          <p className="text-muted-foreground">
            Monitor search performance and user behavior
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedTimeRange}
            onValueChange={(v: any) => setSelectedTimeRange(v)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24h</SelectItem>
              <SelectItem value="week">Last week</SelectItem>
              <SelectItem value="month">Last month</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="Total Searches"
          value={data.overview.totalSearches.toLocaleString()}
          icon={Search}
          trend={{ value: 12.5, isPositive: true }}
        />
        <OverviewCard
          title="Unique Users"
          value={data.overview.uniqueUsers.toLocaleString()}
          icon={Users}
          trend={{ value: 8.2, isPositive: true }}
        />
        <OverviewCard
          title="Avg Search Time"
          value={`${Math.round(data.overview.avgSearchTime)}ms`}
          icon={Clock}
          trend={{ value: 5.1, isPositive: false }}
        />
        <OverviewCard
          title="Success Rate"
          value={`${Math.round(data.overview.successRate * 100)}%`}
          icon={CheckCircle}
          trend={{ value: 3.2, isPositive: true }}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="top-searches">Top Searches</TabsTrigger>
          <TabsTrigger value="zero-results">Zero Results</TabsTrigger>
          <TabsTrigger value="user-behavior">User Behavior</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Trends</CardTitle>
              <CardDescription>
                Search volume and success rate over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.searchTrends.slice(-7).map((trend, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-muted-foreground">
                      {format(trend.date, "MMM d")}
                    </span>
                    <div className="flex-1">
                      <div className="relative h-8 overflow-hidden rounded-md bg-muted">
                        <div
                          className="bg-primary/50 absolute inset-y-0 left-0"
                          style={{
                            width: `${(trend.searches / Math.max(...data.searchTrends.map((t) => t.searches))) * 100}%`,
                          }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-primary"
                          style={{
                            width: `${(trend.successfulSearches / Math.max(...data.searchTrends.map((t) => t.searches))) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-16 text-right text-sm">
                      {trend.searches}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Searches Tab */}
        <TabsContent value="top-searches">
          <Card>
            <CardHeader>
              <CardTitle>Top Searches</CardTitle>
              <CardDescription>Most frequent search queries</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                    <TableHead className="text-right">Avg Click Pos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topSearches.map((search, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        #{index + 1}
                      </TableCell>
                      <TableCell>{search.query}</TableCell>
                      <TableCell className="text-right">
                        {search.count}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            search.successRate > 0.8 ? "default" : "secondary"
                          }
                        >
                          {Math.round(search.successRate * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {search.avgClickPosition}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zero Results Tab */}
        <TabsContent value="zero-results">
          <Card>
            <CardHeader>
              <CardTitle>Zero-Result Searches</CardTitle>
              <CardDescription>
                Queries that returned no results - opportunities for improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Last Searched</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.zeroResultSearches.map((search, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {search.query}
                      </TableCell>
                      <TableCell className="text-right">
                        {search.count}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {format(search.lastSearched, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Investigate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Behavior Tab */}
        <TabsContent value="user-behavior">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Avg queries per user
                    </span>
                    <span className="text-2xl font-bold">
                      {data.userBehavior.avgQueriesPerUser.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Avg filters used
                    </span>
                    <span className="text-2xl font-bold">
                      {data.userBehavior.avgFiltersUsed.toFixed(1)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Used Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.userBehavior.mostUsedFilters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="flex-1 text-sm">{filter.filter}</span>
                      <div className="w-24">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(filter.count / data.userBehavior.mostUsedFilters[0].count) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-12 text-right text-sm text-muted-foreground">
                        {filter.count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Overview Card
// ============================================================================

interface OverviewCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function OverviewCard({ title, value, icon: Icon, trend }: OverviewCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span
              className={trend.isPositive ? "text-green-500" : "text-red-500"}
            >
              {trend.value}%
            </span>
            <span>from last period</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default SearchAnalytics;
