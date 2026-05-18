"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PollOptionData,
  PollUser,
  PollSettings,
} from "@/lib/polls/poll-store";
import { calculateVotePercentage } from "@/lib/polls/poll-store";

// ============================================================================
// Types
// ============================================================================

interface PollOptionProps {
  option: PollOptionData;
  totalVotes: number;
  isSelected: boolean;
  isWinner: boolean;
  canVote: boolean;
  isVoting: boolean;
  settings: PollSettings;
  onVote: () => void;
  onUnvote: () => void;
  onShowVoters?: () => void;
  pollStatus: "active" | "closed";
}

// ============================================================================
// Component
// ============================================================================

export function PollOption({
  option,
  totalVotes,
  isSelected,
  isWinner,
  canVote,
  isVoting,
  settings,
  onVote,
  onUnvote,
  onShowVoters,
  pollStatus,
}: PollOptionProps) {
  const percentage = useMemo(
    () => calculateVotePercentage(option.vote_count, totalVotes),
    [option.vote_count, totalVotes],
  );

  const handleClick = () => {
    if (isVoting) return;

    if (isSelected) {
      // Allow unvoting if multiple votes allowed
      if (settings.allowMultipleVotes) {
        onUnvote();
      }
    } else if (canVote) {
      onVote();
    }
  };

  // Get first 3 voters to display
  const displayVoters = useMemo(() => {
    if (settings.isAnonymous) return [];
    return option.votes.slice(0, 3);
  }, [option.votes, settings.isAnonymous]);

  const remainingVoters = option.vote_count - displayVoters.length;

  const isClickable =
    pollStatus === "active" &&
    (canVote || (isSelected && settings.allowMultipleVotes));

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-lg border p-3 transition-all",
        isClickable && "cursor-pointer",
        isSelected
          ? "bg-primary/5 ring-primary/20 border-primary ring-1"
          : "hover:border-primary/50 border-border",
        isWinner &&
          pollStatus === "closed" &&
          "border-green-500 bg-green-500/5",
        isVoting && "pointer-events-none opacity-70",
        !isClickable && pollStatus === "closed" && "cursor-default",
      )}
    >
      {/* Progress bar background */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 transition-all duration-500 ease-out",
          isSelected ? "bg-primary/10" : "bg-muted/50",
          isWinner && pollStatus === "closed" && "bg-green-500/10",
        )}
        style={{ width: `${percentage}%` }}
      />

      {/* Content */}
      <div className="relative flex items-center gap-3">
        {/* Selection indicator */}
        {isSelected && (
          <div className="flex-shrink-0">
            <CheckCircle2
              className={cn(
                "h-5 w-5",
                isWinner && pollStatus === "closed"
                  ? "text-green-500"
                  : "text-primary",
              )}
            />
          </div>
        )}

        {/* Option text */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm",
              isSelected && "font-medium",
              isWinner &&
                pollStatus === "closed" &&
                "text-green-700 dark:text-green-400",
            )}
          >
            {option.text}
          </p>

          {/* Voter avatars (if not anonymous) */}
          {!settings.isAnonymous && displayVoters.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              <div className="flex -space-x-1.5">
                {displayVoters.map((vote) => (
                  <Avatar
                    key={vote.id}
                    className="h-5 w-5 border-2 border-background"
                  >
                    <AvatarImage src={vote.user.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {vote.user.display_name?.charAt(0) ||
                        vote.user.username?.charAt(0) ||
                        "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {remainingVoters > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowVoters?.();
                  }}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  +{remainingVoters} more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Vote count and percentage */}
        <div className="flex flex-shrink-0 items-center gap-2 text-sm">
          {!settings.isAnonymous && option.vote_count > 0 && onShowVoters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onShowVoters();
              }}
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              <Users className="mr-1 h-3 w-3" />
              {option.vote_count}
            </Button>
          )}
          {settings.isAnonymous && option.vote_count > 0 && (
            <span className="text-muted-foreground">{option.vote_count}</span>
          )}
          <span
            className={cn(
              "min-w-[3ch] text-right font-medium tabular-nums",
              isWinner &&
                pollStatus === "closed" &&
                "text-green-600 dark:text-green-400",
            )}
          >
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact variant for use in message previews
// ============================================================================

interface PollOptionCompactProps {
  option: PollOptionData;
  totalVotes: number;
  isSelected: boolean;
  isWinner: boolean;
}

export function PollOptionCompact({
  option,
  totalVotes,
  isSelected,
  isWinner,
}: PollOptionCompactProps) {
  const percentage = useMemo(
    () => calculateVotePercentage(option.vote_count, totalVotes),
    [option.vote_count, totalVotes],
  );

  return (
    <div className="bg-muted/50 relative h-6 overflow-hidden rounded">
      <div
        className={cn(
          "absolute inset-y-0 left-0 transition-all",
          isSelected ? "bg-primary/20" : "bg-muted",
          isWinner && "bg-green-500/20",
        )}
        style={{ width: `${percentage}%` }}
      />
      <div className="relative flex h-full items-center justify-between px-2 text-xs">
        <span className={cn("flex-1 truncate", isSelected && "font-medium")}>
          {option.text}
        </span>
        <span className="ml-2 font-medium">{percentage}%</span>
      </div>
    </div>
  );
}

export default PollOption;
