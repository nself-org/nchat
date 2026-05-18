"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  EyeOff,
  Users,
  MoreHorizontal,
  XCircle,
  RefreshCw,
  Plus,
  ChartPie,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePoll, usePollActions } from "@/lib/polls/use-poll";
import {
  getPollTimeRemaining,
  findWinningOptions,
  formatPollSettings,
} from "@/lib/polls/poll-store";
import { PollOption, PollOptionCompact } from "./poll-option";
import { PollVotersModal } from "./poll-voters-modal";
import { PollResults } from "./poll-results";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface PollDisplayProps {
  pollId: string;
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function PollSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ============================================================================
// Poll Timer Component
// ============================================================================

function PollTimer({ pollId }: { pollId: string }) {
  const { poll } = usePoll(pollId);
  const [timeRemaining, setTimeRemaining] = useState(
    poll ? getPollTimeRemaining(poll) : null,
  );

  useEffect(() => {
    if (!poll?.ends_at || poll.status === "closed") {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      setTimeRemaining(getPollTimeRemaining(poll));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [poll]);

  if (!timeRemaining || timeRemaining.ended) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{timeRemaining.text}</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PollDisplay({
  pollId,
  compact = false,
  showActions = true,
  className,
}: PollDisplayProps) {
  const {
    poll,
    loading,
    error,
    refetch,
    hasVoted,
    votedOptions,
    canVote,
    canManage,
    vote,
    unvote,
    isEnded,
    isVoting,
  } = usePoll(pollId);

  const { closePoll, reopenPoll, closing, reopening } = usePollActions(pollId);

  const [showVotersModal, setShowVotersModal] = useState<{
    optionId: string;
    optionText: string;
  } | null>(null);

  const [showResultsModal, setShowResultsModal] = useState(false);

  const winningOptions = useMemo(
    () => (poll ? findWinningOptions(poll) : []),
    [poll],
  );

  const settingsBadges = useMemo(
    () => (poll ? formatPollSettings(poll.settings) : []),
    [poll?.settings],
  );

  const handleVote = useCallback(
    async (optionId: string) => {
      try {
        await vote(optionId);
      } catch (err) {
        logger.error("Failed to vote:", err);
      }
    },
    [vote],
  );

  const handleUnvote = useCallback(
    async (optionId: string) => {
      try {
        await unvote(optionId);
      } catch (err) {
        logger.error("Failed to unvote:", err);
      }
    },
    [unvote],
  );

  const handleClosePoll = useCallback(async () => {
    try {
      await closePoll();
    } catch (err) {
      logger.error("Failed to close poll:", err);
    }
  }, [closePoll]);

  const handleReopenPoll = useCallback(async () => {
    try {
      await reopenPoll();
    } catch (err) {
      logger.error("Failed to reopen poll:", err);
    }
  }, [reopenPoll]);

  if (loading && !poll) {
    return <PollSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-destructive/5 border-destructive/20 rounded-xl border p-4">
        <p className="text-sm text-destructive">Failed to load poll</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="mt-2"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  // Compact variant for message previews
  if (compact) {
    return (
      <div className={cn("bg-muted/30 rounded-lg border p-3", className)}>
        <div className="mb-2 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="truncate text-sm font-medium">{poll.question}</span>
        </div>
        <div className="space-y-1">
          {poll.options.slice(0, 3).map((option) => (
            <PollOptionCompact
              key={option.id}
              option={option}
              totalVotes={poll.total_votes}
              isSelected={votedOptions.includes(option.id)}
              isWinner={
                winningOptions.some((w) => w.id === option.id) && isEnded
              }
            />
          ))}
          {poll.options.length > 3 && (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              +{poll.options.length - 3} more options
            </p>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{poll.total_votes} votes</span>
          {isEnded ? (
            <span className="text-orange-500">Poll ended</span>
          ) : (
            <PollTimer pollId={pollId} />
          )}
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          isEnded && "bg-muted/30",
          className,
        )}
      >
        {/* Header */}
        <div className="bg-muted/30 border-b p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "rounded-lg p-2",
                isEnded ? "bg-muted" : "bg-primary/10",
              )}
            >
              <BarChart3
                className={cn(
                  "h-5 w-5",
                  isEnded ? "text-muted-foreground" : "text-primary",
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">{poll.question}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {poll.total_votes} vote{poll.total_votes !== 1 ? "s" : ""}
                </span>
                {isEnded ? (
                  <Badge variant="secondary" className="text-xs">
                    <XCircle className="mr-1 h-3 w-3" />
                    Closed
                  </Badge>
                ) : (
                  <PollTimer pollId={pollId} />
                )}
                {hasVoted && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Voted
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions menu */}
            {showActions && canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowResultsModal(true)}>
                    <ChartPie className="mr-2 h-4 w-4" />
                    View Results
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isEnded ? (
                    <DropdownMenuItem
                      onClick={handleReopenPoll}
                      disabled={reopening}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reopen Poll
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={handleClosePoll}
                      disabled={closing}
                      className="text-destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Close Poll
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Settings badges */}
          {settingsBadges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {poll.settings.isAnonymous && (
                <Badge variant="outline" className="text-xs">
                  <EyeOff className="mr-1 h-3 w-3" />
                  Anonymous
                </Badge>
              )}
              {poll.settings.allowMultipleVotes && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Multiple choices
                </Badge>
              )}
              {poll.settings.allowAddOptions && (
                <Badge variant="outline" className="text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  Add options
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2 p-4">
          {poll.options.map((option) => (
            <PollOption
              key={option.id}
              option={option}
              totalVotes={poll.total_votes}
              isSelected={votedOptions.includes(option.id)}
              isWinner={winningOptions.some((w) => w.id === option.id)}
              canVote={canVote}
              isVoting={isVoting}
              settings={poll.settings}
              onVote={() => handleVote(option.id)}
              onUnvote={() => handleUnvote(option.id)}
              onShowVoters={
                !poll.settings.isAnonymous
                  ? () =>
                      setShowVotersModal({
                        optionId: option.id,
                        optionText: option.text,
                      })
                  : undefined
              }
              pollStatus={poll.status}
            />
          ))}

          {/* Add option button (if allowed) */}
          {poll.settings.allowAddOptions && !isEnded && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => {}}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          )}
        </div>

        {/* Footer */}
        {!isEnded && !hasVoted && !canVote && (
          <div className="px-4 pb-4">
            <p className="text-center text-xs text-muted-foreground">
              {poll.settings.allowMultipleVotes
                ? "Select one or more options"
                : "Select an option to vote"}
            </p>
          </div>
        )}

        {isEnded && winningOptions.length > 0 && (
          <div className="bg-muted/20 border-t px-4 pb-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Winner:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {winningOptions.map((o) => o.text).join(", ")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Voters Modal */}
      {showVotersModal && (
        <PollVotersModal
          open={!!showVotersModal}
          onOpenChange={() => setShowVotersModal(null)}
          pollId={pollId}
          optionId={showVotersModal.optionId}
          optionText={showVotersModal.optionText}
        />
      )}

      {/* Results Modal */}
      {showResultsModal && (
        <PollResults
          pollId={pollId}
          open={showResultsModal}
          onOpenChange={setShowResultsModal}
        />
      )}
    </>
  );
}

export default PollDisplay;
