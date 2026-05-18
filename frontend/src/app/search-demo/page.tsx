"use client";

/**
 * Search Demo Page
 *
 * Demonstrates all Smart Search UI v0.7.0 components
 */

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SearchResultCard,
  SearchHistory,
  AdvancedSearchBuilder,
} from "@/components/search";
import { SavedSearches } from "@/components/search/SavedSearches";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { SearchAnalytics } from "@/components/admin/search/SearchAnalytics";
import type { MessageSearchResult } from "@/stores/search-store";
import type { DateRange } from "@/components/ui/date-range-picker";

// Mock data
const mockResult: MessageSearchResult = {
  id: "1",
  type: "message",
  score: 0.95,
  highlights: ["Found a relevant result", "This matches your query"],
  channelId: "general",
  channelName: "general",
  authorId: "user1",
  authorName: "Alice Johnson",
  authorAvatar: null,
  content:
    "Here is the project update you were looking for. We have completed the main features and are ready for testing.",
  timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  threadId: null,
  isPinned: false,
  isStarred: true,
  reactions: [
    { emoji: "👍", count: 5 },
    { emoji: "🎉", count: 3 },
  ],
  hasAttachments: true,
};

export default function SearchDemoPage() {
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: null,
    to: null,
  });
  const [query, setQuery] = React.useState("");

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Smart Search UI Demo
        </h1>
        <p className="text-muted-foreground">
          Demonstration of all Smart Search UI v0.7.0 components
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="result-card" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="result-card">Result Card</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="date">Date Picker</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Search Result Card */}
        <TabsContent value="result-card" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SearchResultCard</CardTitle>
              <CardDescription>
                Enhanced search result card with highlighting, metadata, and
                quick actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="search-query" className="text-sm font-medium">
                  Search Query:
                </label>
                <input
                  id="search-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter search terms to highlight..."
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>

              <SearchResultCard
                result={mockResult}
                query={query}
                showContext={true}
                contextSize={2}
                isBookmarked={false}
                onClick={(result) => console.log("Clicked:", result)}
                onJumpToMessage={(result) => console.log("Jump to:", result)}
                onShare={(result) => console.log("Share:", result)}
                onToggleBookmark={(result) => console.log("Bookmark:", result)}
              />

              <div className="rounded-lg border bg-muted p-4">
                <h4 className="mb-2 font-medium">Features:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    ✓ Search term highlighting (try typing "project" or
                    "update")
                  </li>
                  <li>✓ Author avatar with fallback</li>
                  <li>✓ Channel and timestamp metadata</li>
                  <li>✓ Relevance score badge (95%)</li>
                  <li>✓ Quick actions on hover</li>
                  <li>✓ Reaction badges</li>
                  <li>✓ Thread indicator</li>
                  <li>✓ Pin/Star status</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SearchHistory</CardTitle>
              <CardDescription>
                Manage and re-run previous searches with filter tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SearchHistory
                maxItems={10}
                onSelect={(search) => console.log("Run search:", search)}
                onExport={(searches) => console.log("Export:", searches)}
              />

              <div className="mt-4 rounded-lg border bg-muted p-4">
                <h4 className="mb-2 font-medium">Features:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Recent searches with timestamps</li>
                  <li>✓ Filter count badges</li>
                  <li>✓ Re-run search button</li>
                  <li>✓ Remove individual searches</li>
                  <li>✓ Clear all with confirmation</li>
                  <li>✓ Export to JSON</li>
                  <li>✓ Hover actions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Searches */}
        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SavedSearches</CardTitle>
              <CardDescription>
                Save and organize frequently used searches with categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <SavedSearches
                  onSelect={(search) => console.log("Load search:", search)}
                  onExport={(searches) => console.log("Export:", searches)}
                  onImport={(searches) => console.log("Import:", searches)}
                />
              </div>

              <div className="mt-4 rounded-lg border bg-muted p-4">
                <h4 className="mb-2 font-medium">Features:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Category organization (Work, Personal, etc.)</li>
                  <li>✓ Save current search with custom name</li>
                  <li>✓ Edit and delete saved searches</li>
                  <li>✓ Run saved search with one click</li>
                  <li>✓ Import/Export searches as JSON</li>
                  <li>✓ Creation date tracking</li>
                  <li>✓ Filter count badges</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Search Builder */}
        <TabsContent value="builder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AdvancedSearchBuilder</CardTitle>
              <CardDescription>
                Visual query builder with boolean operators and field-specific
                search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdvancedSearchBuilder
                onChange={(query, parts) => {
                  // REMOVED: console.log('Query:', query)
                  // REMOVED: console.log('Parts:', parts)
                }}
                onSearch={(query) => console.log("Execute search:", query)}
              />

              <div className="mt-4 rounded-lg border bg-muted p-4">
                <h4 className="mb-2 font-medium">Features:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Visual query builder interface</li>
                  <li>✓ Boolean operators (AND, OR, NOT)</li>
                  <li>✓ Field-specific search (from:, in:, has:, is:)</li>
                  <li>✓ Exact phrase matching</li>
                  <li>✓ Real-time query preview</li>
                  <li>✓ Code view with syntax</li>
                  <li>✓ Export/Import queries</li>
                  <li>✓ Add/Remove conditions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Date Range Picker */}
        <TabsContent value="date" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DateRangePicker</CardTitle>
              <CardDescription>
                Select date ranges with quick presets and calendar picker
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span id="date-range-label" className="text-sm font-medium">
                  Date Range:
                </span>
                <DateRangePicker
                  aria-labelledby="date-range-label"
                  value={dateRange}
                  onChange={(range) => {
                    setDateRange(range);
                    // REMOVED: console.log('Date range:', range)
                  }}
                  showPresets={true}
                />
              </div>

              {dateRange.from && (
                <div className="rounded-lg border bg-muted p-4">
                  <h4 className="mb-2 font-medium">Selected Range:</h4>
                  <p className="text-sm">
                    From: {dateRange.from.toLocaleDateString()}
                  </p>
                  {dateRange.to && (
                    <p className="text-sm">
                      To: {dateRange.to.toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-lg border bg-muted p-4">
                <h4 className="mb-2 font-medium">Features:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Calendar date picker</li>
                  <li>✓ Quick presets (Today, Yesterday, Last 7 days, etc.)</li>
                  <li>✓ Visual range highlighting</li>
                  <li>✓ Month navigation</li>
                  <li>✓ Clear functionality</li>
                  <li>✓ Two-step selection (from → to)</li>
                  <li>✓ Auto-swap if to before from</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SearchAnalytics</CardTitle>
              <CardDescription>
                Admin dashboard for search performance and user behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SearchAnalytics
                timeRange="week"
                onExport={(data) => console.log("Export analytics:", data)}
              />

              <div className="mt-4 rounded-lg border bg-muted p-4">
                <h4 className="mb-2 font-medium">Features:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    ✓ Overview metrics (searches, users, time, success rate)
                  </li>
                  <li>✓ Top searches with success rates</li>
                  <li>✓ Zero-result searches tracking</li>
                  <li>✓ Search trends visualization</li>
                  <li>✓ User behavior analytics</li>
                  <li>✓ Filter usage statistics</li>
                  <li>✓ Time range selector</li>
                  <li>✓ Export functionality</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="font-semibold">All Components Include:</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">TypeScript</h4>
                <p className="text-sm text-muted-foreground">
                  Full type safety with interfaces and type exports
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">Responsive</h4>
                <p className="text-sm text-muted-foreground">
                  Mobile-optimized with touch-friendly targets
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">Accessible</h4>
                <p className="text-sm text-muted-foreground">
                  WCAG 2.1 Level AA compliant with keyboard support
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">Themeable</h4>
                <p className="text-sm text-muted-foreground">
                  Tailwind CSS with CSS variable support
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">Performant</h4>
                <p className="text-sm text-muted-foreground">
                  Optimized with React.memo and code splitting
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">Documented</h4>
                <p className="text-sm text-muted-foreground">
                  Complete docs with examples and API reference
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
