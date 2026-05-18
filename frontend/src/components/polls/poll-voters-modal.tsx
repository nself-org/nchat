"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GET_OPTION_VOTERS } from "@/graphql/polls";

// ============================================================================
// Types
// ============================================================================

interface PollVotersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollId: string;
  optionId: string;
  optionText: string;
}

interface Voter {
  id: string;
  user_id: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

// ============================================================================
// Voter Item Component
// ============================================================================

function VoterItem({ voter }: { voter: Voter }) {
  const votedAt = new Date(voter.created_at);
  const formattedDate = votedAt.toLocaleDateString();
  const formattedTime = votedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="hover:bg-accent/50 flex items-center gap-3 rounded-lg p-3 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={voter.user.avatar_url || undefined} />
        <AvatarFallback>
          {voter.user.display_name?.charAt(0) ||
            voter.user.username?.charAt(0) ||
            "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {voter.user.display_name || voter.user.username}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          @{voter.user.username}
        </p>
      </div>
      <div className="flex-shrink-0 text-right text-xs text-muted-foreground">
        <p>{formattedDate}</p>
        <p>{formattedTime}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Voter Skeleton
// ============================================================================

function VoterSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PollVotersModal({
  open,
  onOpenChange,
  pollId,
  optionId,
  optionText,
}: PollVotersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, loading, error, fetchMore } = useQuery(GET_OPTION_VOTERS, {
    variables: { optionId, limit: 50, offset: 0 },
    skip: !open,
    fetchPolicy: "cache-and-network",
  });

  const voters: Voter[] = data?.nchat_poll_votes || [];
  const totalCount = data?.nchat_poll_votes_aggregate?.aggregate?.count || 0;
  const hasMore = voters.length < totalCount;

  const filteredVoters = useMemo(() => {
    if (!searchQuery.trim()) return voters;

    const query = searchQuery.toLowerCase();
    return voters.filter(
      (voter) =>
        voter.user.display_name?.toLowerCase().includes(query) ||
        voter.user.username?.toLowerCase().includes(query),
    );
  }, [voters, searchQuery]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          offset: voters.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            ...prev,
            nchat_poll_votes: [
              ...prev.nchat_poll_votes,
              ...fetchMoreResult.nchat_poll_votes,
            ],
          };
        },
      });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Voters
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="truncate">{optionText}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="flex items-center gap-4 py-2">
          <Badge variant="secondary" className="text-sm">
            <Users className="mr-1 h-3 w-3" />
            {totalCount} voter{totalCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search voters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Voters List */}
        <ScrollArea className="-mx-6 flex-1">
          <div className="px-6">
            {loading && voters.length === 0 && (
              <div className="space-y-1">
                {[...Array(5)].map((_, i) => (
                  <VoterSkeleton key={i} />
                ))}
              </div>
            )}

            {error && (
              <div className="py-8 text-center">
                <p className="text-sm text-destructive">
                  Failed to load voters
                </p>
              </div>
            )}

            {!loading && !error && filteredVoters.length === 0 && (
              <div className="py-8 text-center">
                <Users className="text-muted-foreground/50 mx-auto mb-2 h-12 w-12" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "No voters match your search"
                    : "No voters yet"}
                </p>
              </div>
            )}

            {filteredVoters.length > 0 && (
              <div className="space-y-1">
                {filteredVoters.map((voter) => (
                  <VoterItem key={voter.id} voter={voter} />
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && !searchQuery && (
              <div className="py-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? "Loading..."
                    : `Load More (${totalCount - voters.length} remaining)`}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PollVotersModal;
