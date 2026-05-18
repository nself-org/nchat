"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  ChartPie,
  Download,
  Clock,
  CheckCircle2,
  Trophy,
  Users,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePollResults } from "@/lib/polls/use-poll";
import { calculateVotePercentage } from "@/lib/polls/poll-store";

// ============================================================================
// Types
// ============================================================================

interface PollResultsProps {
  pollId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ResultOption {
  id: string;
  text: string;
  position: number;
  voteCount: number;
  percentage: number;
  voters: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>;
}

interface PollResultsData {
  id: string;
  question: string;
  settings: {
    allowMultipleVotes: boolean;
    isAnonymous: boolean;
    allowAddOptions: boolean;
    showResultsBeforeVoting: boolean;
  };
  status: string;
  endsAt: string | null;
  createdAt: string;
  closedAt: string | null;
  totalVotes: number;
  options: ResultOption[];
}

// ============================================================================
// Bar Chart Component
// ============================================================================

function ResultsBarChart({ results }: { results: PollResultsData }) {
  const sortedOptions = useMemo(() => {
    return [...results.options].sort((a, b) => b.voteCount - a.voteCount);
  }, [results.options]);

  const maxVotes = Math.max(...sortedOptions.map((o) => o.voteCount));
  const winnerIds = sortedOptions
    .filter((o) => o.voteCount === maxVotes && maxVotes > 0)
    .map((o) => o.id);

  return (
    <div className="space-y-4">
      {sortedOptions.map((option, index) => {
        const isWinner = winnerIds.includes(option.id);

        return (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isWinner && results.status === "closed" && (
                  <Trophy className="h-4 w-4 text-yellow-500" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    isWinner && results.status === "closed" && "font-medium",
                  )}
                >
                  {option.text}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {option.voteCount} votes
                </span>
                <Badge
                  variant={
                    isWinner && results.status === "closed"
                      ? "default"
                      : "secondary"
                  }
                  className="min-w-[4ch] justify-center"
                >
                  {option.percentage}%
                </Badge>
              </div>
            </div>
            <div className="relative h-8 overflow-hidden rounded-lg bg-muted">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-lg transition-all duration-500",
                  isWinner && results.status === "closed"
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                    : "from-primary/60 bg-gradient-to-r to-primary",
                )}
                style={{ width: `${option.percentage}%` }}
              />
              <div className="absolute inset-0 flex items-center px-3">
                <span
                  className={cn(
                    "text-xs font-medium",
                    option.percentage > 50 ? "text-white" : "text-foreground",
                  )}
                >
                  #{index + 1}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Pie Chart Component (Simple CSS-based)
// ============================================================================

function ResultsPieChart({ results }: { results: PollResultsData }) {
  const chartColors = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "#8b5cf6",
    "#06b6d4",
    "#f59e0b",
    "#ec4899",
    "#84cc16",
  ];

  const sortedOptions = useMemo(() => {
    return [...results.options].sort((a, b) => b.voteCount - a.voteCount);
  }, [results.options]);

  // Generate conic gradient for pie chart
  const conicGradient = useMemo(() => {
    if (results.totalVotes === 0) {
      return "conic-gradient(hsl(var(--muted)) 0deg 360deg)";
    }

    let currentAngle = 0;
    const segments: string[] = [];

    sortedOptions.forEach((option, index) => {
      const angle = (option.voteCount / results.totalVotes) * 360;
      const color = chartColors[index % chartColors.length];
      segments.push(`${color} ${currentAngle}deg ${currentAngle + angle}deg`);
      currentAngle += angle;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [sortedOptions, results.totalVotes]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pie Chart */}
      <div className="relative">
        <div
          className="h-48 w-48 rounded-full"
          style={{ background: conicGradient }}
        />
        {/* Center hole for donut effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-background">
            <span className="text-2xl font-bold">{results.totalVotes}</span>
            <span className="text-xs text-muted-foreground">votes</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid w-full grid-cols-2 gap-2">
        {sortedOptions.map((option, index) => (
          <div key={option.id} className="flex items-center gap-2">
            <div
              className="h-3 w-3 flex-shrink-0 rounded-sm"
              style={{
                backgroundColor: chartColors[index % chartColors.length],
              }}
            />
            <span className="flex-1 truncate text-sm">{option.text}</span>
            <span className="text-sm text-muted-foreground">
              {option.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Stats Component
// ============================================================================

function ResultsStats({ results }: { results: PollResultsData }) {
  const stats = useMemo(() => {
    const options = results.options;
    const maxVotes = Math.max(...options.map((o) => o.voteCount));
    const minVotes = Math.min(...options.map((o) => o.voteCount));
    const winners = options.filter(
      (o) => o.voteCount === maxVotes && maxVotes > 0,
    );
    const participation = results.totalVotes > 0;

    return {
      totalOptions: options.length,
      totalVotes: results.totalVotes,
      maxVotes,
      minVotes,
      winners,
      isTie: winners.length > 1,
      participation,
      spread: maxVotes - minVotes,
    };
  }, [results]);

  return (
    <div className="space-y-4">
      {/* Winner */}
      {stats.winners.length > 0 && results.status === "closed" && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold">
              {stats.isTie ? "Tied Winners" : "Winner"}
            </span>
          </div>
          <div className="space-y-1">
            {stats.winners.map((winner) => (
              <p key={winner.id} className="text-sm">
                {winner.text}{" "}
                <span className="text-muted-foreground">
                  ({winner.voteCount} votes, {winner.percentage}%)
                </span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs">Total Votes</span>
          </div>
          <span className="text-2xl font-bold">{stats.totalVotes}</span>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs">Options</span>
          </div>
          <span className="text-2xl font-bold">{stats.totalOptions}</span>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Highest</span>
          </div>
          <span className="text-2xl font-bold">{stats.maxVotes}</span>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 rotate-180" />
            <span className="text-xs">Lowest</span>
          </div>
          <span className="text-2xl font-bold">{stats.minVotes}</span>
        </div>
      </div>

      {/* Settings info */}
      <Separator />
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Poll Settings</h4>
        <div className="flex flex-wrap gap-2">
          {results.settings.allowMultipleVotes && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Multiple choices
            </Badge>
          )}
          {results.settings.isAnonymous && (
            <Badge variant="outline" className="text-xs">
              Anonymous voting
            </Badge>
          )}
          {results.settings.allowAddOptions && (
            <Badge variant="outline" className="text-xs">
              User-added options
            </Badge>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Created: {new Date(results.createdAt).toLocaleString()}</p>
        {results.closedAt && (
          <p>Closed: {new Date(results.closedAt).toLocaleString()}</p>
        )}
        {results.endsAt && !results.closedAt && (
          <p>Ends: {new Date(results.endsAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PollResults({ pollId, open, onOpenChange }: PollResultsProps) {
  const { results, loading, error } = usePollResults(pollId);
  const [activeTab, setActiveTab] = useState<"bar" | "pie" | "stats">("bar");

  const handleExport = () => {
    if (!results) return;

    const exportData = {
      question: results.question,
      status: results.status,
      totalVotes: results.totalVotes,
      createdAt: results.createdAt,
      closedAt: results.closedAt,
      options: results.options.map((o: ResultOption) => ({
        text: o.text,
        votes: o.voteCount,
        percentage: o.percentage,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poll-results-${pollId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChartPie className="h-5 w-5 text-primary" />
            Poll Results
          </DialogTitle>
          {results && (
            <DialogDescription className="line-clamp-2">
              {results.question}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && !results && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive">Failed to load results</p>
          </div>
        )}

        {results && (
          <>
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant={results.status === "closed" ? "secondary" : "default"}
              >
                {results.status === "closed" ? (
                  <>
                    <Clock className="mr-1 h-3 w-3" />
                    Closed
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Active
                  </>
                )}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {results.totalVotes} total vote
                {results.totalVotes !== 1 ? "s" : ""}
              </span>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="flex flex-1 flex-col"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bar" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Bar Chart
                </TabsTrigger>
                <TabsTrigger value="pie" className="gap-2">
                  <ChartPie className="h-4 w-4" />
                  Pie Chart
                </TabsTrigger>
                <TabsTrigger value="stats" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Stats
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="-mx-6 flex-1 px-6">
                <div className="py-4">
                  <TabsContent value="bar" className="mt-0">
                    <ResultsBarChart results={results} />
                  </TabsContent>

                  <TabsContent value="pie" className="mt-0">
                    <ResultsPieChart results={results} />
                  </TabsContent>

                  <TabsContent value="stats" className="mt-0">
                    <ResultsStats results={results} />
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {results && (
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PollResults;
