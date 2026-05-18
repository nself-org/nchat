"use client";

/**
 * Poll Display Component
 *
 * Displays poll results, vote buttons, and real-time updates.
 */

import { useState, useCallback, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  isPollActive,
  canVote,
  canClosePoll,
  canAddOption,
  getTimeRemaining,
  getPollStatusText,
  getWinningOptions,
  hasTie,
  hasUserVoted,
  getUserVotedOptions,
  formatPollSettings,
  type Poll,
  type PollOption,
} from "@/lib/messages/polls";

interface PollDisplayProps {
  poll: Poll;
  currentUserId: string;
  onVote?: (pollId: string, optionIds: string[]) => Promise<void>;
  onClosePoll?: (pollId: string) => Promise<void>;
  onAddOption?: (pollId: string, optionText: string) => Promise<void>;
  className?: string;
}

export function PollDisplay({
  poll,
  currentUserId,
  onVote,
  onClosePoll,
  onAddOption,
  className,
}: PollDisplayProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(poll));
  const [newOptionText, setNewOptionText] = useState("");
  const [showAddOption, setShowAddOption] = useState(false);

  const isActive = isPollActive(poll);
  const userVotedOptions = getUserVotedOptions(poll, currentUserId);
  const hasVoted = hasUserVoted(poll, currentUserId);
  const canUserVote = canVote(poll, currentUserId, userVotedOptions);
  const canUserClose = canClosePoll(poll, currentUserId);
  const canUserAddOption = canAddOption(poll);
  const winningOptions = getWinningOptions(poll);

  // Update time remaining every second
  useEffect(() => {
    if (!poll.expiresAt || poll.status !== "active") return;

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(poll));
    }, 1000);

    return () => clearInterval(interval);
  }, [poll]);

  // Initialize selected options with user's votes
  useEffect(() => {
    if (userVotedOptions.length > 0) {
      setSelectedOptions(userVotedOptions);
    }
  }, [userVotedOptions]);

  const handleToggleOption = useCallback(
    (optionId: string) => {
      if (!isActive || !canUserVote) return;

      setSelectedOptions((prev) => {
        if (prev.includes(optionId)) {
          return prev.filter((id) => id !== optionId);
        }

        if (!poll.allowMultiple) {
          return [optionId];
        }

        if (poll.maxChoices && prev.length >= poll.maxChoices) {
          return prev;
        }

        return [...prev, optionId];
      });
    },
    [isActive, canUserVote, poll.allowMultiple, poll.maxChoices],
  );

  const handleVote = useCallback(async () => {
    if (!onVote || selectedOptions.length === 0) return;

    setIsVoting(true);
    try {
      await onVote(poll.id, selectedOptions);
    } finally {
      setIsVoting(false);
    }
  }, [onVote, poll.id, selectedOptions]);

  const handleClose = useCallback(async () => {
    if (!onClosePoll) return;

    setIsClosing(true);
    try {
      await onClosePoll(poll.id);
    } finally {
      setIsClosing(false);
    }
  }, [onClosePoll, poll.id]);

  const handleAddOption = useCallback(async () => {
    if (!onAddOption || !newOptionText.trim()) return;

    try {
      await onAddOption(poll.id, newOptionText.trim());
      setNewOptionText("");
      setShowAddOption(false);
    } catch (_error) {
      // Error handling
    }
  }, [onAddOption, poll.id, newOptionText]);

  const hasVoteChanged =
    JSON.stringify(selectedOptions.sort()) !==
    JSON.stringify(userVotedOptions.sort());

  return (
    <div className={cn("space-y-4 rounded-lg border bg-card p-4", className)}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="text-base font-semibold leading-tight">
              {poll.question}
            </h4>
          </div>
          <Badge
            variant={isActive ? "default" : "secondary"}
            className="shrink-0"
          >
            {getPollStatusText(poll)}
          </Badge>
        </div>

        {/* Poll metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>
              {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
            </span>
          </div>
          {poll.expiresAt && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{timeRemaining.text}</span>
            </div>
          )}
          {poll.isAnonymous && (
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>Anonymous</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Poll Options */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {poll.options.map((option, index) => {
            const isSelected = selectedOptions.includes(option.id);
            const isWinning = winningOptions.some((w) => w.id === option.id);
            const userVoted = userVotedOptions.includes(option.id);

            return (
              <motion.div
                key={option.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <button
                  onClick={() => handleToggleOption(option.id)}
                  disabled={!isActive || !canUserVote || isVoting}
                  className={cn(
                    "relative w-full overflow-hidden rounded-md border p-3 text-left transition-all",
                    "hover:border-primary/50 focus:ring-primary/50 focus:outline-none focus:ring-2",
                    isSelected && "bg-primary/5 border-primary",
                    userVoted && !isActive && "bg-primary/10",
                    (!isActive || !canUserVote) && "cursor-default",
                    "group",
                  )}
                >
                  {/* _Progress bar background */}
                  <div
                    className={cn(
                      "from-primary/10 absolute inset-0 bg-gradient-to-r to-transparent transition-all duration-500",
                      isWinning && poll.totalVotes > 0 && "from-primary/20",
                    )}
                    style={{ width: `${option.percentage}%` }}
                  />

                  {/* Content */}
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* Checkbox/Radio */}
                      {isActive && canUserVote ? (
                        poll.allowMultiple ? (
                          isSelected ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                          ) : (
                            <Circle className="group-hover:text-primary/50 h-5 w-5 shrink-0 text-muted-foreground" />
                          )
                        ) : (
                          <div
                            className={cn(
                              "h-5 w-5 shrink-0 rounded-full border-2 transition-colors",
                              isSelected
                                ? "border-primary bg-primary"
                                : "group-hover:border-primary/50 border-muted-foreground",
                            )}
                          >
                            {isSelected && (
                              <div className="h-full w-full scale-50 rounded-full bg-background" />
                            )}
                          </div>
                        )
                      ) : (
                        userVoted && (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                        )
                      )}

                      {/* Option text */}
                      <span className="truncate font-medium">
                        {option.text}
                      </span>
                    </div>

                    {/* Vote count and percentage */}
                    <div className="flex shrink-0 items-center gap-2">
                      {isWinning && poll.totalVotes > 0 && (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-sm font-semibold">
                        {option.percentage}%
                      </span>
                      {!poll.isAnonymous && option.votes > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="text-xs">
                                {option.votes}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {option.votes}{" "}
                              {option.votes === 1 ? "vote" : "votes"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Voter avatars (non-anonymous) */}
                  {!poll.isAnonymous &&
                    option.voters &&
                    option.voters.length > 0 && (
                      <div className="relative mt-2 flex items-center gap-1">
                        <div className="flex -space-x-2">
                          {option.voters.slice(0, 5).map((voterId, _idx) => (
                            <Avatar
                              key={voterId}
                              className="h-6 w-6 border-2 border-background"
                            >
                              <AvatarFallback className="text-xs">
                                {voterId.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {option.voters.length > 5 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            +{option.voters.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add Option */}
        {canUserAddOption && isActive && (
          <div className="pt-2">
            {showAddOption ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add an option..."
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  maxLength={100}
                />
                <Button
                  size="sm"
                  onClick={handleAddOption}
                  disabled={!newOptionText.trim()}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddOption(false);
                    setNewOptionText("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddOption(true)}
                className="w-full"
              >
                Add an option
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {isActive && canUserVote && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="text-xs text-muted-foreground">
            {poll.allowMultiple
              ? `Select up to ${poll.maxChoices} option${poll.maxChoices !== 1 ? "s" : ""}`
              : "Select one option"}
          </div>
          <Button
            onClick={handleVote}
            disabled={
              !hasVoteChanged || selectedOptions.length === 0 || isVoting
            }
            size="sm"
          >
            {isVoting ? "Voting..." : hasVoted ? "Change Vote" : "Vote"}
          </Button>
        </div>
      )}

      {/* Close Poll */}
      {canUserClose && isActive && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClose}
          disabled={isClosing}
          className="w-full"
        >
          {isClosing ? "Closing..." : "Close Poll"}
        </Button>
      )}

      {/* Results Summary */}
      {!isActive && poll.totalVotes > 0 && (
        <div className="space-y-1 pt-2 text-xs text-muted-foreground">
          {hasTie(poll) ? (
            <p>Multiple options are tied for first place</p>
          ) : (
            <p>
              <span className="font-semibold text-foreground">
                {winningOptions[0]?.text}
              </span>{" "}
              is winning with {winningOptions[0]?.votes} vote
              {winningOptions[0]?.votes !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Settings */}
      {formatPollSettings(poll).length > 0 && (
        <div className="border-t pt-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-2">
            {formatPollSettings(poll).map((setting, idx) => (
              <span key={idx} className="rounded bg-muted px-2 py-1">
                {setting}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
