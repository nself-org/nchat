"use client";

/**
 * MeetingParticipants - Participant selection and management for meetings
 */

import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Plus, Users, UserPlus, Mail } from "lucide-react";
import {
  ParticipantRole,
  MeetingParticipant,
} from "@/lib/meetings/meeting-types";
import { ROLE_LABELS } from "@/lib/meetings/meeting-invites";

// ============================================================================
// Types
// ============================================================================

interface MeetingParticipantsProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  existingParticipants?: MeetingParticipant[];
  maxParticipants?: number;
  allowRoleAssignment?: boolean;
  defaultRole?: ParticipantRole;
}

// Mock user data - in real app, this would come from a query
interface User {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

const MOCK_USERS: User[] = [
  {
    id: "user-1",
    displayName: "Alice Johnson",
    email: "alice@nself.org",
    avatarUrl: null,
  },
  {
    id: "user-2",
    displayName: "Bob Smith",
    email: "bob@nself.org",
    avatarUrl: null,
  },
  {
    id: "user-3",
    displayName: "Charlie Brown",
    email: "charlie@nself.org",
    avatarUrl: null,
  },
  {
    id: "user-4",
    displayName: "Diana Ross",
    email: "diana@nself.org",
    avatarUrl: null,
  },
  {
    id: "user-5",
    displayName: "Edward King",
    email: "edward@nself.org",
    avatarUrl: null,
  },
  {
    id: "user-6",
    displayName: "Fiona Green",
    email: "fiona@nself.org",
    avatarUrl: null,
  },
];

// ============================================================================
// Component
// ============================================================================

export function MeetingParticipants({
  selectedIds,
  onChange,
  existingParticipants = [],
  maxParticipants = 100,
  allowRoleAssignment = false,
  defaultRole = "participant",
}: MeetingParticipantsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [participantRoles, setParticipantRoles] = useState<
    Record<string, ParticipantRole>
  >({});
  const [isInviteByEmail, setIsInviteByEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  // Filter users based on search
  const filteredUsers = MOCK_USERS.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  // Get selected users
  const selectedUsers = MOCK_USERS.filter((u) => selectedIds.includes(u.id));

  // Check if user is already selected
  const isSelected = (userId: string) => selectedIds.includes(userId);

  // Add participant
  const addParticipant = useCallback(
    (userId: string) => {
      if (!isSelected(userId) && selectedIds.length < maxParticipants) {
        onChange([...selectedIds, userId]);
        setParticipantRoles((prev) => ({ ...prev, [userId]: defaultRole }));
      }
    },
    [selectedIds, onChange, maxParticipants, defaultRole, isSelected],
  );

  // Remove participant
  const removeParticipant = useCallback(
    (userId: string) => {
      onChange(selectedIds.filter((id) => id !== userId));
      setParticipantRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    },
    [selectedIds, onChange],
  );

  // Update participant role
  const updateRole = useCallback((userId: string, role: ParticipantRole) => {
    setParticipantRoles((prev) => ({ ...prev, [userId]: role }));
  }, []);

  // Handle email invite
  const handleEmailInvite = useCallback(() => {
    if (emailInput && emailInput.includes("@")) {
      // In real app, would validate and add to invited list
      setEmailInput("");
      setIsInviteByEmail(false);
    }
  }, [emailInput]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">
          Participants
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedIds.length}
            </Badge>
          )}
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsInviteByEmail(!isInviteByEmail)}
          className="text-xs"
        >
          <Mail className="mr-1 h-3 w-3" />
          Invite by email
        </Button>
      </div>

      {/* Email Invite Input */}
      {isInviteByEmail && (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email address"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmailInvite()}
          />
          <Button onClick={handleEmailInvite} disabled={!emailInput}>
            Invite
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search people..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Selected Participants */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Selected</Label>
          <ScrollArea className="max-h-40">
            <div className="space-y-1">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-accent/50 flex items-center justify-between rounded-lg p-2"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {user.displayName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {allowRoleAssignment && (
                      <Select
                        value={participantRoles[user.id] || defaultRole}
                        onValueChange={(value: ParticipantRole) =>
                          updateRole(user.id, value)
                        }
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(
                            ([value, label]) =>
                              value !== "host" && (
                                <SelectItem
                                  key={value}
                                  value={value}
                                  className="text-xs"
                                >
                                  {label}
                                </SelectItem>
                              ),
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParticipant(user.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Available Users */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          {searchQuery ? "Search Results" : "Suggestions"}
        </Label>
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {filteredUsers
              .filter((u) => !isSelected(u.id))
              .slice(0, 10)
              .map((user) => (
                <button
                  key={user.id}
                  onClick={() => addParticipant(user.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg p-2",
                    "text-left transition-colors hover:bg-accent",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {user.displayName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}

            {filteredUsers.filter((u) => !isSelected(u.id)).length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {searchQuery
                  ? "No users found matching your search"
                  : "All available users have been added"}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Capacity Warning */}
      {selectedIds.length >= maxParticipants && (
        <p className="text-sm text-amber-600">
          Maximum of {maxParticipants} participants reached
        </p>
      )}
    </div>
  );
}
