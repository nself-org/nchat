"use client";

/**
 * SearchAnalytics - Search query analytics view
 */

import * as React from "react";
import { format } from "date-fns";
import { Search, TrendingUp, AlertCircle, MousePointer } from "lucide-react";

import { cn } from "@/lib/utils";
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

// ============================================================================
// Types
// ============================================================================

interface SearchAnalyticsProps {
  className?: string;
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

export function SearchAnalytics({ className }: SearchAnalyticsProps) {
  const { summary, searchQueries, isLoading, fetchSectionData } =
    useAnalyticsStore();

  // Fetch search data on mount
  React.useEffect(() => {
    fetchSectionData("search");
  }, [fetchSectionData]);

  // Calculate search stats
  const searchStats = React.useMemo(() => {
    if (!searchQueries || searchQueries.length === 0) return null;

    const totalSearches = searchQueries.reduce((sum, q) => sum + q.count, 0);
    const noResults = searchQueries.filter((q) => q.resultCount === 0);
    const avgResults =
      searchQueries.reduce((sum, q) => sum + q.resultCount, 0) /
      searchQueries.length;
    const avgCTR =
      searchQueries.reduce((sum, q) => sum + q.clickThroughRate, 0) /
      searchQueries.length;

    return {
      totalSearches,
      uniqueQueries: searchQueries.length,
      noResultsCount: noResults.length,
      noResultsRate: (noResults.length / searchQueries.length) * 100,
      avgResults: Math.round(avgResults),
      avgCTR: avgCTR * 100,
    };
  }, [searchQueries]);

  // Get top searches and no-results searches
  const topSearches = React.useMemo(() => {
    if (!searchQueries) return [];
    return [...searchQueries].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [searchQueries]);

  const noResultsSearches = React.useMemo(() => {
    if (!searchQueries) return [];
    return searchQueries
      .filter((q) => q.resultCount === 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [searchQueries]);

  const maxSearchCount =
    topSearches.length > 0 ? Math.max(...topSearches.map((q) => q.count)) : 1;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Searches"
          value={summary?.search.totalSearches.value.toLocaleString() ?? 0}
          description="search queries"
          icon={<Search className="h-4 w-4" />}
        />
        <StatCard
          title="Unique Queries"
          value={searchStats?.uniqueQueries.toLocaleString() ?? 0}
          description="different searches"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Avg. Results"
          value={searchStats?.avgResults ?? 0}
          description="per search"
          icon={<Search className="h-4 w-4" />}
        />
        <StatCard
          title="No Results Rate"
          value={`${(searchStats?.noResultsRate ?? 0).toFixed(1)}%`}
          description="searches with no results"
          icon={<AlertCircle className="h-4 w-4" />}
        />
      </div>

      {/* Search Quality Summary */}
      {searchStats && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Search Quality</CardTitle>
              <CardDescription>
                How well are searches performing?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Results Found Rate</span>
                    <span className="font-medium">
                      {(100 - searchStats.noResultsRate).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={100 - searchStats.noResultsRate}
                    className="mt-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Click-Through Rate</span>
                    <span className="font-medium">
                      {searchStats.avgCTR.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={searchStats.avgCTR} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search Overview</CardTitle>
              <CardDescription>Key search metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Searches</span>
                  <Badge variant="secondary">
                    {searchStats.totalSearches.toLocaleString()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Unique Queries</span>
                  <Badge variant="outline">
                    {searchStats.uniqueQueries.toLocaleString()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Failed Searches</span>
                  <Badge variant="destructive">
                    {searchStats.noResultsCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg. Results per Query</span>
                  <Badge>{searchStats.avgResults}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Searches */}
        <Card>
          <CardHeader>
            <CardTitle>Top Search Queries</CardTitle>
            <CardDescription>Most frequently searched terms</CardDescription>
          </CardHeader>
          <CardContent>
            {topSearches.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No search data available
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Results</TableHead>
                    <TableHead className="w-[100px]">Volume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSearches.map((query, index) => (
                    <TableRow key={query.query}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {index + 1}.
                          </span>
                          <span className="font-medium">{query.query}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {query.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            query.resultCount > 0 ? "outline" : "destructive"
                          }
                        >
                          {query.resultCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Progress
                          value={(query.count / maxSearchCount) * 100}
                          className="h-2"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* No Results Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Searches with No Results
            </CardTitle>
            <CardDescription>
              Consider adding content for these common searches
            </CardDescription>
          </CardHeader>
          <CardContent>
            {noResultsSearches.length === 0 ? (
              <div className="py-8 text-center">
                <div className="font-medium text-green-600">All clear!</div>
                <p className="text-sm text-muted-foreground">
                  No frequently searched terms without results
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Last Searched</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noResultsSearches.map((query) => (
                    <TableRow key={query.query}>
                      <TableCell>
                        <span className="font-medium text-destructive">
                          {query.query}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {query.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {format(new Date(query.lastSearched), "MMM d")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SearchAnalytics;
