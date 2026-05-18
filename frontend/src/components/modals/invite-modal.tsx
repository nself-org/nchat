"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import {
  Search,
  Copy,
  Check,
  Link,
  Mail,
  Users,
  RefreshCw,
  Clock,
  X,
  Loader2,
  UserPlus,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface InviteUser {
  id: string;
  displayName: string;
  username: string;
  email: string;
  avatarUrl?: string;
  alreadyMember?: boolean;
}

export interface InviteLink {
  code: string;
  url: string;
  expiresAt?: Date;
  maxUses?: number;
  usedCount?: number;
}

export type InviteLinkExpiry =
  | "never"
  | "7days"
  | "1day"
  | "12hours"
  | "6hours"
  | "1hour"
  | "30min";

export interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelName?: string;
  channelId?: string;
  inviteType: "channel" | "workspace";
  // User search
  users?: InviteUser[];
  onSearchUsers?: (query: string) => Promise<InviteUser[]>;
  onInviteUsers?: (userIds: string[]) => Promise<void>;
  // Email invites
  onInviteByEmail?: (emails: string[]) => Promise<void>;
  // Invite links
  inviteLink?: InviteLink;
  onGenerateLink?: (expiry: InviteLinkExpiry) => Promise<InviteLink>;
  onRevokeLink?: () => Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// Helper Components
// ============================================================================

interface UserSearchResultProps {
  user: InviteUser;
  selected: boolean;
  onToggle: () => void;
}

function UserSearchResult({ user, selected, onToggle }: UserSearchResultProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={user.alreadyMember}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
        selected && "bg-primary/10",
        user.alreadyMember
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-accent",
      )}
      data-testid={`user-result-${user.id}`}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback>
          {user.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">
          @{user.username}
        </p>
      </div>
      {user.alreadyMember ? (
        <Badge variant="secondary" className="text-xs">
          Already member
        </Badge>
      ) : selected ? (
        <Badge className="text-xs">Selected</Badge>
      ) : null}
    </button>
  );
}

interface SelectedUserBadgeProps {
  user: InviteUser;
  onRemove: () => void;
}

function SelectedUserBadge({ user, onRemove }: SelectedUserBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 pr-1"
      data-testid={`selected-user-${user.id}`}
    >
      {user.displayName}
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-secondary-foreground/20 rounded p-0.5 transition-colors"
        aria-label={`Remove ${user.displayName}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

// ============================================================================
// Link Expiry Options
// ============================================================================

const EXPIRY_OPTIONS: { value: InviteLinkExpiry; label: string }[] = [
  { value: "never", label: "Never expires" },
  { value: "7days", label: "7 days" },
  { value: "1day", label: "1 day" },
  { value: "12hours", label: "12 hours" },
  { value: "6hours", label: "6 hours" },
  { value: "1hour", label: "1 hour" },
  { value: "30min", label: "30 minutes" },
];

// ============================================================================
// Main Component
// ============================================================================

export function InviteModal({
  open,
  onOpenChange,
  channelName,
  channelId,
  inviteType,
  users = [],
  onSearchUsers,
  onInviteUsers,
  onInviteByEmail,
  inviteLink,
  onGenerateLink,
  onRevokeLink,
  isLoading = false,
}: InviteModalProps) {
  // State
  const [activeTab, setActiveTab] = React.useState("users");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<InviteUser[]>(users);
  const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(
    new Set(),
  );
  const [emailInput, setEmailInput] = React.useState("");
  const [emails, setEmails] = React.useState<string[]>([]);
  const [linkExpiry, setLinkExpiry] = React.useState<InviteLinkExpiry>("7days");
  const [copied, setCopied] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [inviting, setInviting] = React.useState(false);
  const [generatingLink, setGeneratingLink] = React.useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSearchResults(users);
      setSelectedUsers(new Set());
      setEmailInput("");
      setEmails([]);
      setCopied(false);
    }
  }, [open, users]);

  // Search users
  const handleSearch = React.useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!onSearchUsers) {
        // Filter local users if no search function provided
        const filtered = users.filter(
          (u) =>
            u.displayName.toLowerCase().includes(query.toLowerCase()) ||
            u.username.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase()),
        );
        setSearchResults(filtered);
        return;
      }

      if (!query.trim()) {
        setSearchResults(users);
        return;
      }

      setSearching(true);
      try {
        const results = await onSearchUsers(query);
        setSearchResults(results);
      } catch (error) {
        logger.error("Search failed:", error);
      } finally {
        setSearching(false);
      }
    },
    [onSearchUsers, users],
  );

  // Toggle user selection
  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Add email to list
  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (
      email &&
      !emails.includes(email) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setEmails([...emails, email]);
      setEmailInput("");
    }
  };

  // Remove email from list
  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  // Handle email input key press
  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail();
    }
  };

  // Invite selected users
  const handleInviteUsers = async () => {
    if (!onInviteUsers || selectedUsers.size === 0) return;

    setInviting(true);
    try {
      await onInviteUsers(Array.from(selectedUsers));
      setSelectedUsers(new Set());
      onOpenChange(false);
    } catch (error) {
      logger.error("Invite failed:", error);
    } finally {
      setInviting(false);
    }
  };

  // Invite by email
  const handleInviteByEmail = async () => {
    if (!onInviteByEmail || emails.length === 0) return;

    setInviting(true);
    try {
      await onInviteByEmail(emails);
      setEmails([]);
      onOpenChange(false);
    } catch (error) {
      logger.error("Email invite failed:", error);
    } finally {
      setInviting(false);
    }
  };

  // Generate invite link
  const handleGenerateLink = async () => {
    if (!onGenerateLink) return;

    setGeneratingLink(true);
    try {
      await onGenerateLink(linkExpiry);
    } catch (error) {
      logger.error("Generate link failed:", error);
    } finally {
      setGeneratingLink(false);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error("Copy failed:", error);
    }
  };

  const title =
    inviteType === "channel"
      ? `Invite to #${channelName}`
      : "Invite to Workspace";

  const selectedUserObjects = React.useMemo(() => {
    return users.filter((u) => selectedUsers.has(u.id));
  }, [users, selectedUsers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Invite people to join and collaborate
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="w-full">
            <TabsTrigger
              value="users"
              className="flex-1"
              data-testid="tab-users"
            >
              <Users className="mr-2 h-4 w-4" />
              Search Users
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="flex-1"
              data-testid="tab-email"
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1" data-testid="tab-link">
              <Link className="mr-2 h-4 w-4" />
              Invite Link
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent
            value="users"
            className="m-0 flex flex-1 flex-col overflow-hidden pt-4"
          >
            {/* Selected Users */}
            {selectedUserObjects.length > 0 && (
              <div className="bg-muted/30 mb-4 flex flex-wrap gap-1.5 rounded-lg border p-2">
                {selectedUserObjects.map((user) => (
                  <SelectedUserBadge
                    key={user.id}
                    user={user}
                    onRemove={() => toggleUser(user.id)}
                  />
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
                disabled={isLoading}
                data-testid="user-search-input"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
              )}
            </div>

            {/* Results */}
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {searchResults.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No users found" : "Start typing to search"}
                  </p>
                ) : (
                  searchResults.map((user) => (
                    <UserSearchResult
                      key={user.id}
                      user={user}
                      selected={selectedUsers.has(user.id)}
                      onToggle={() => toggleUser(user.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Invite Button */}
            {onInviteUsers && (
              <div className="mt-4 border-t pt-4">
                <Button
                  onClick={handleInviteUsers}
                  disabled={selectedUsers.size === 0 || inviting || isLoading}
                  className="w-full"
                  data-testid="invite-users-button"
                >
                  {inviting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Invite {selectedUsers.size}{" "}
                  {selectedUsers.size === 1 ? "User" : "Users"}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Email Tab */}
          <TabsContent
            value="email"
            className="m-0 flex flex-1 flex-col overflow-hidden pt-4"
          >
            {/* Email Input */}
            <div className="mb-4 space-y-2">
              <Label htmlFor="email-input">Email Addresses</Label>
              <div className="flex gap-2">
                <Input
                  id="email-input"
                  type="email"
                  placeholder="email@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyPress={handleEmailKeyPress}
                  disabled={isLoading}
                  data-testid="email-input"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addEmail}
                  disabled={isLoading}
                  data-testid="add-email-button"
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter or comma to add multiple emails
              </p>
            </div>

            {/* Email List */}
            {emails.length > 0 && (
              <div className="flex-1 overflow-auto">
                <div className="bg-muted/30 flex flex-wrap gap-1.5 rounded-lg border p-2">
                  {emails.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="gap-1 pr-1"
                      data-testid={`email-${email}`}
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="hover:bg-secondary-foreground/20 rounded p-0.5 transition-colors"
                        aria-label={`Remove ${email}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Send Button */}
            {onInviteByEmail && (
              <div className="mt-auto border-t pt-4">
                <Button
                  onClick={handleInviteByEmail}
                  disabled={emails.length === 0 || inviting || isLoading}
                  className="w-full"
                  data-testid="send-invites-button"
                >
                  {inviting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send {emails.length}{" "}
                  {emails.length === 1 ? "Invite" : "Invites"}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Link Tab */}
          <TabsContent
            value="link"
            className="m-0 flex flex-1 flex-col overflow-hidden pt-4"
          >
            {/* Link Generation */}
            {onGenerateLink && (
              <div className="mb-4 space-y-4">
                <div className="space-y-2">
                  <Label>Link Expiration</Label>
                  <Select
                    value={linkExpiry}
                    onValueChange={(value: InviteLinkExpiry) =>
                      setLinkExpiry(value)
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger data-testid="expiry-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerateLink}
                  disabled={generatingLink || isLoading}
                  variant={inviteLink ? "outline" : "default"}
                  className="w-full"
                  data-testid="generate-link-button"
                >
                  {generatingLink ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {inviteLink ? "Generate New Link" : "Generate Link"}
                </Button>
              </div>
            )}

            {/* Current Link */}
            {inviteLink && (
              <div className="space-y-4">
                <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={inviteLink.url}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="invite-link-input"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleCopyLink}
                      data-testid="copy-link-button"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Link Info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {inviteLink.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires{" "}
                        {new Date(inviteLink.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {inviteLink.maxUses && (
                      <span>
                        {inviteLink.usedCount || 0} / {inviteLink.maxUses} uses
                      </span>
                    )}
                  </div>
                </div>

                {onRevokeLink && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onRevokeLink}
                    disabled={isLoading}
                    className="w-full"
                    data-testid="revoke-link-button"
                  >
                    Revoke Link
                  </Button>
                )}
              </div>
            )}

            {!inviteLink && !onGenerateLink && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No invite link available
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export { UserSearchResult, SelectedUserBadge };
