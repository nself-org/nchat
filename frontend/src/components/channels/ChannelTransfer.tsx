"use client";

import * as React from "react";
import { useState } from "react";
import {
  ArrowRightLeft,
  Crown,
  AlertTriangle,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Channel, ChannelMember } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelTransferProps {
  channel: Channel;
  currentUserId: string;
  isOwner?: boolean;
  onTransfer?: (newOwnerId: string) => Promise<void>;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelTransfer({
  channel,
  currentUserId,
  isOwner = false,
  onTransfer,
  className,
}: ChannelTransferProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Get eligible members (admins who are not the current owner)
  const eligibleMembers = (channel.members || []).filter(
    (m) =>
      m.userId !== currentUserId && (m.role === "admin" || m.role === "member"),
  );

  const filteredMembers = eligibleMembers.filter((m) =>
    m.userId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedMember = selectedUserId
    ? eligibleMembers.find((m) => m.userId === selectedUserId)
    : null;

  const handleTransfer = async () => {
    if (!selectedUserId) return;

    try {
      setIsLoading(true);
      await onTransfer?.(selectedUserId);
      setShowDialog(false);
      setSelectedUserId(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Card className={cn("border-yellow-500/50", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-600">
          <ArrowRightLeft className="h-5 w-5" />
          Transfer Ownership
        </CardTitle>
        <CardDescription>
          Transfer channel ownership to another member
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg bg-yellow-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Important information
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>- You will lose owner permissions</li>
            <li>- The new owner will have full control</li>
            <li>- You will become an admin of the channel</li>
            <li>- This action can only be reversed by the new owner</li>
          </ul>
        </div>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer Ownership
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Transfer Ownership
              </AlertDialogTitle>
              <AlertDialogDescription>
                Select a member to transfer ownership of #{channel.name} to
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => setSelectedUserId(member.userId)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg p-3 text-left",
                        "transition-colors hover:bg-accent",
                        selectedUserId === member.userId && "bg-accent",
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {member.userId.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{member.userId}</p>
                        <p className="text-xs text-muted-foreground">
                          Current role: {member.role}
                        </p>
                      </div>
                      {selectedUserId === member.userId && (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      )}
                    </button>
                  ))}

                  {filteredMembers.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No eligible members found
                    </p>
                  )}
                </div>
              </ScrollArea>

              {selectedMember && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm">
                    <strong>{selectedMember.userId}</strong> will become the new
                    owner of #{channel.name}
                  </p>
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUserId(null)}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="default"
                onClick={handleTransfer}
                disabled={!selectedUserId || isLoading}
                className="bg-yellow-500 text-black hover:bg-yellow-600"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Crown className="mr-2 h-4 w-4" />
                Transfer Ownership
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

ChannelTransfer.displayName = "ChannelTransfer";
