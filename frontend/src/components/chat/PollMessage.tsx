"use client";

/**
 * Poll Message Component
 *
 * Displays an interactive poll within a message with real-time voting,
 * results visualization, and comprehensive poll management.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  TrendingUp,
  Users,
  X,
  Plus,
  Download,
  BarChart3,
  AlertCircle,
  Trash2,
  RotateCcw,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Poll, PollOption } from "@/types/poll";
import {
  isPollOpen,
  canVoteInPoll,
  formatPollClosingTime,
  getWinningOptions,
  calculatePollPercentages,
} from "@/types/poll";

interface PollMessageProps {
  poll: Poll;
  currentUserId: string;
  currentUserRole?: "owner" | "admin" | "moderator" | "member" | "guest";
  onVote?: (pollId: string, optionIds: string[]) => Promise<void>;
  onRemoveVote?: (pollId: string) => Promise<void>;
  onClosePoll?: (pollId: string) => Promise<void>;
  onReopenPoll?: (pollId: string) => Promise<void>;
  onDeletePoll?: (pollId: string) => Promise<void>;
  onAddOption?: (pollId: string, optionText: string) => Promise<void>;
  onExportResults?: (pollId: string) => Promise<void>;
  className?: string;
}

export function PollMessage({
  poll,
  currentUserId,
  currentUserRole = "member",
  onVote,
  onRemoveVote,
  onClosePoll,
  onReopenPoll,
  onDeletePoll,
  onAddOption,
  onExportResults,
  className,
}: PollMessageProps) {
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set(),
  );
  const [isVoting, setIsVoting] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOptionText, setNewOptionText] = useState("");
  const [timeRemaining, setTimeRemaining] = useState("");

  // Check if poll is open and user can vote
  const isOpen = isPollOpen(poll);
  const hasVoted = poll.hasVoted || false;
  const canVote = canVoteInPoll(poll, hasVoted);
  const isCreator = poll.createdBy === currentUserId;
  const canManage =
    isCreator || currentUserRole === "owner" || currentUserRole === "admin";

  // Calculate winning options
  const winningOptions = useMemo(() => getWinningOptions(poll), [poll]);
  const hasMultipleWinners = winningOptions.length > 1;

  // Update time remaining
  useEffect(() => {
    if (!poll.closesAt || poll.status !== "active") return;

    const updateTime = () => {
      setTimeRemaining(formatPollClosingTime(poll.closesAt!));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [poll.closesAt, poll.status]);

  // Initialize selected options with current user's vote
  useEffect(() => {
    if (poll.currentUserVote) {
      setSelectedOptions(new Set(poll.currentUserVote.optionIds));
    }
  }, [poll.currentUserVote]);

  // Handle option toggle
  const handleToggleOption = useCallback(
    (optionId: string) => {
      if (!canVote) return;

      setSelectedOptions((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(optionId)) {
          newSet.delete(optionId);
        } else {
          // Single choice - clear others
          if (!poll.settings.allowMultiple) {
            newSet.clear();
          }
          // Check max selections
          if (
            poll.settings.maxSelections &&
            newSet.size >= poll.settings.maxSelections
          ) {
            return prev;
          }
          newSet.add(optionId);
        }
        return newSet;
      });
    },
    [canVote, poll.settings],
  );

  // Handle vote submission
  const handleVote = useCallback(async () => {
    if (!onVote || selectedOptions.size === 0) return;

    setIsVoting(true);
    try {
      await onVote(poll.id, Array.from(selectedOptions));
      toast({
        title: "Vote recorded",
        description: poll.settings.allowVoteChange
          ? "You can change your vote anytime"
          : "Your vote has been locked in",
      });
    } catch (error) {
      toast({
        title: "Failed to vote",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  }, [onVote, poll, selectedOptions, toast]);

  // Handle remove vote
  const handleRemoveVote = useCallback(async () => {
    if (!onRemoveVote) return;

    setIsVoting(true);
    try {
      await onRemoveVote(poll.id);
      setSelectedOptions(new Set());
      toast({
        title: "Vote removed",
        description: "Your vote has been removed from this poll",
      });
    } catch (error) {
      toast({
        title: "Failed to remove vote",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  }, [onRemoveVote, poll.id, toast]);

  // Handle close poll
  const handleClosePoll = useCallback(async () => {
    if (!onClosePoll) return;

    setIsManaging(true);
    try {
      await onClosePoll(poll.id);
      toast({
        title: "Poll closed",
        description: "No more votes can be cast",
      });
    } catch (error) {
      toast({
        title: "Failed to close poll",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsManaging(false);
    }
  }, [onClosePoll, poll.id, toast]);

  // Handle reopen poll
  const handleReopenPoll = useCallback(async () => {
    if (!onReopenPoll) return;

    setIsManaging(true);
    try {
      await onReopenPoll(poll.id);
      toast({
        title: "Poll reopened",
        description: "Voting is now active again",
      });
    } catch (error) {
      toast({
        title: "Failed to reopen poll",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsManaging(false);
    }
  }, [onReopenPoll, poll.id, toast]);

  // Handle delete poll
  const handleDeletePoll = useCallback(async () => {
    if (!onDeletePoll) return;
    if (
      !confirm(
        "Are you sure you want to delete this poll? This action cannot be undone.",
      )
    )
      return;

    setIsManaging(true);
    try {
      await onDeletePoll(poll.id);
      toast({
        title: "Poll deleted",
        description: "The poll has been permanently deleted",
      });
    } catch (error) {
      toast({
        title: "Failed to delete poll",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsManaging(false);
    }
  }, [onDeletePoll, poll.id, toast]);

  // Handle add option
  const handleAddOption = useCallback(async () => {
    if (!onAddOption || !newOptionText.trim()) return;

    const trimmedText = newOptionText.trim();
    if (
      poll.options.some(
        (opt) => opt.text.toLowerCase() === trimmedText.toLowerCase(),
      )
    ) {
      toast({
        title: "Duplicate option",
        description: "This option already exists",
        variant: "destructive",
      });
      return;
    }

    setIsManaging(true);
    try {
      await onAddOption(poll.id, trimmedText);
      setNewOptionText("");
      setShowAddOption(false);
      toast({
        title: "Option added",
        description: "The new option has been added to the poll",
      });
    } catch (error) {
      toast({
        title: "Failed to add option",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsManaging(false);
    }
  }, [onAddOption, poll, newOptionText, toast]);

  // Handle export results
  const handleExportResults = useCallback(async () => {
    if (!onExportResults) return;

    try {
      await onExportResults(poll.id);
      toast({
        title: "Results exported",
        description: "Poll results have been downloaded",
      });
    } catch (error) {
      toast({
        title: "Failed to export results",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  }, [onExportResults, poll.id, toast]);

  // Check if vote has changed
  const hasVoteChanged = useMemo(() => {
    if (!poll.currentUserVote) return selectedOptions.size > 0;
    const currentVotes = new Set(poll.currentUserVote.optionIds);
    if (currentVotes.size !== selectedOptions.size) return true;
    return Array.from(selectedOptions).some((id) => !currentVotes.has(id));
  }, [poll.currentUserVote, selectedOptions]);

  // Get status badge
  const getStatusBadge = () => {
    if (poll.status === "closed") {
      return <Badge variant="secondary">Closed</Badge>;
    }
    if (poll.status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (poll.closesAt && new Date(poll.closesAt) < new Date()) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      {/* Header */}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <h4 className="text-base font-semibold leading-tight">
              {poll.question}
            </h4>
            {poll.description && (
              <p className="text-sm text-muted-foreground">
                {poll.description}
              </p>
            )}
          </div>
          {getStatusBadge()}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>
              {poll.totalVoters} {poll.totalVoters === 1 ? "voter" : "voters"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            <span>
              {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
            </span>
          </div>
          {poll.closesAt && poll.status === "active" && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{timeRemaining}</span>
            </div>
          )}
          {poll.settings.isAnonymous && (
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>Anonymous</span>
            </div>
          )}
          {poll.closedAt && (
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Closed {new Date(poll.closedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Options */}
      <div className="space-y-2 p-4">
        <AnimatePresence mode="popLayout">
          {poll.options.map((option, index) => {
            const isSelected = selectedOptions.has(option.id);
            const isWinning = winningOptions.some((w) => w.id === option.id);
            const userVoted =
              poll.currentUserVote?.optionIds.includes(option.id) || false;
            const percentage =
              poll.totalVotes > 0
                ? Math.round((option.voteCount / poll.totalVotes) * 100)
                : 0;

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
                  disabled={!canVote || isVoting}
                  className={cn(
                    "group relative w-full overflow-hidden rounded-md border p-3 text-left transition-all",
                    "focus:ring-primary/50 focus:outline-none focus:ring-2",
                    isSelected && "bg-primary/5 border-primary",
                    userVoted && !isOpen && "bg-primary/10 border-primary/50",
                    canVote && "hover:border-primary/50 cursor-pointer",
                    !canVote && "cursor-default",
                  )}
                >
                  {/* Progress bar background */}
                  <div
                    className={cn(
                      "from-primary/10 absolute inset-0 bg-gradient-to-r to-transparent transition-all duration-500",
                      isWinning && poll.totalVotes > 0 && "from-primary/20",
                    )}
                    style={{ width: `${percentage}%` }}
                  />

                  {/* Content */}
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* Checkbox/Radio */}
                      {canVote ? (
                        poll.settings.allowMultiple ? (
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {option.emoji && (
                            <span className="text-lg">{option.emoji}</span>
                          )}
                          <span className="truncate font-medium">
                            {option.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex shrink-0 items-center gap-2">
                      {isWinning && poll.totalVotes > 0 && (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                      <span className="min-w-[3ch] text-right text-sm font-semibold">
                        {percentage}%
                      </span>
                      {!poll.settings.isAnonymous && option.voteCount > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="text-xs">
                                {option.voteCount}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {option.voteCount}{" "}
                                {option.voteCount === 1 ? "vote" : "votes"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Voters (non-anonymous) */}
                  {!poll.settings.isAnonymous &&
                    option.voters &&
                    option.voters.length > 0 && (
                      <div className="relative mt-2 flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {option.voters.slice(0, 5).map((voter) => (
                            <TooltipProvider key={voter.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Avatar className="h-6 w-6 border-2 border-background">
                                    {voter.avatarUrl && (
                                      <AvatarImage src={voter.avatarUrl} />
                                    )}
                                    <AvatarFallback className="text-xs">
                                      {voter.username.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{voter.username}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                        {option.voters.length > 5 && (
                          <span className="text-xs text-muted-foreground">
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
        {poll.settings.allowAddOptions && isOpen && (
          <div className="pt-2">
            {showAddOption ? (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Add an option..."
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
                  disabled={isManaging}
                  maxLength={100}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleAddOption}
                  disabled={!newOptionText.trim() || isManaging}
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
                  disabled={isManaging}
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
                <Plus className="mr-2 h-4 w-4" />
                Add an option
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {(canVote || hasVoted || canManage) && (
        <>
          <Separator />
          <div className="space-y-2 p-4">
            {/* Voting Actions */}
            {canVote && (
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {poll.settings.allowMultiple
                    ? poll.settings.maxSelections
                      ? `Select up to ${poll.settings.maxSelections} option${poll.settings.maxSelections !== 1 ? "s" : ""}`
                      : "Select multiple options"
                    : "Select one option"}
                </div>
                <div className="flex gap-2">
                  {hasVoted && poll.settings.allowVoteChange && (
                    <Button
                      onClick={handleRemoveVote}
                      disabled={isVoting}
                      size="sm"
                      variant="outline"
                    >
                      Remove Vote
                    </Button>
                  )}
                  <Button
                    onClick={handleVote}
                    disabled={
                      !hasVoteChanged || selectedOptions.size === 0 || isVoting
                    }
                    size="sm"
                  >
                    {isVoting ? "Voting..." : hasVoted ? "Change Vote" : "Vote"}
                  </Button>
                </div>
              </div>
            )}

            {/* Management Actions */}
            {canManage && (
              <div className="flex flex-wrap gap-2">
                {poll.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClosePoll}
                    disabled={isManaging}
                  >
                    Close Poll
                  </Button>
                )}
                {poll.status === "closed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReopenPoll}
                    disabled={isManaging}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reopen Poll
                  </Button>
                )}
                {onExportResults && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportResults}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Results
                  </Button>
                )}
                {onDeletePoll && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeletePoll}
                    disabled={isManaging}
                    className="hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Poll
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Results Summary */}
      {poll.status === "closed" && poll.totalVotes > 0 && (
        <>
          <Separator />
          <div className="bg-muted/50 p-4">
            <div className="text-sm">
              {hasMultipleWinners ? (
                <p>
                  <span className="font-semibold">Tie:</span>{" "}
                  {winningOptions.map((o) => o.text).join(", ")} are tied with{" "}
                  {winningOptions[0]?.voteCount} vote
                  {winningOptions[0]?.voteCount !== 1 ? "s" : ""} each
                </p>
              ) : winningOptions[0] ? (
                <p>
                  <span className="font-semibold">Winner:</span>{" "}
                  {winningOptions[0].text} with {winningOptions[0].voteCount}{" "}
                  vote{winningOptions[0].voteCount !== 1 ? "s" : ""} (
                  {winningOptions[0].percentage}%)
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
