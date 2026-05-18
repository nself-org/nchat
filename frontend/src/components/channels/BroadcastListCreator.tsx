/**
 * BroadcastListCreator - Create new broadcast list
 *
 * Allows creating a broadcast list with:
 * - List name and description
 * - Icon selection
 * - Add subscribers (up to 256 by default)
 * - Subscription mode (open/invite/admin)
 * - Settings (replies, sender name, tracking)
 */

"use client";

import * as React from "react";
import { useState } from "react";
import {
  Radio,
  Users,
  Search,
  X,
  Check,
  Settings,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateBroadcastListInput } from "@/types/advanced-channels";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface BroadcastListCreatorProps {
  workspaceId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreate?: (data: BroadcastListInput) => Promise<void>;
  className?: string;
}

export interface BroadcastListInput extends CreateBroadcastListInput {
  subscriberIds: string[];
}

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

// Mock users for demo
const MOCK_USERS: User[] = [
  {
    id: "1",
    username: "alice",
    displayName: "Alice Smith",
    avatarUrl: undefined,
  },
  {
    id: "2",
    username: "bob",
    displayName: "Bob Johnson",
    avatarUrl: undefined,
  },
  {
    id: "3",
    username: "charlie",
    displayName: "Charlie Brown",
    avatarUrl: undefined,
  },
  {
    id: "4",
    username: "diana",
    displayName: "Diana Prince",
    avatarUrl: undefined,
  },
  {
    id: "5",
    username: "eve",
    displayName: "Eve Wilson",
    avatarUrl: undefined,
  },
];

// ============================================================================
// Step 1: Basic Info
// ============================================================================

function BasicInfoStep({
  data,
  onChange,
}: {
  data: Partial<BroadcastListInput>;
  onChange: (updates: Partial<BroadcastListInput>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="list-name">List Name *</Label>
        <Input
          id="list-name"
          value={data.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., Weekly Updates"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What is this broadcast list for?"
          rows={3}
        />
      </div>

      {/* Icon */}
      <div className="space-y-2">
        <Label htmlFor="icon">Icon (emoji or URL)</Label>
        <Input
          id="icon"
          value={data.icon || ""}
          onChange={(e) => onChange({ icon: e.target.value })}
          placeholder="📢"
        />
      </div>

      {/* Subscription mode */}
      <div className="space-y-2">
        <Label htmlFor="subscription-mode">Subscription Mode</Label>
        <Select
          value={data.subscriptionMode || "admin"}
          onValueChange={(value: "open" | "invite" | "admin") =>
            onChange({ subscriptionMode: value })
          }
        >
          <SelectTrigger id="subscription-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open - Anyone can subscribe</SelectItem>
            <SelectItem value="invite">Invite - Requires invitation</SelectItem>
            <SelectItem value="admin">
              Admin - Only admins add subscribers
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Max subscribers */}
      <div className="space-y-2">
        <Label htmlFor="max-subscribers">Maximum Subscribers</Label>
        <Input
          id="max-subscribers"
          type="number"
          min={1}
          max={10000}
          value={data.maxSubscribers || 256}
          onChange={(e) =>
            onChange({ maxSubscribers: parseInt(e.target.value) || 256 })
          }
        />
        <p className="text-xs text-muted-foreground">
          Default: 256 (WhatsApp limit), Max: 10,000
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Step 2: Add Subscribers
// ============================================================================

function AddSubscribersStep({
  subscriberIds,
  onChange,
  maxSubscribers,
}: {
  subscriberIds: string[];
  onChange: (ids: string[]) => void;
  maxSubscribers: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = MOCK_USERS.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleUser = (userId: string) => {
    if (subscriberIds.includes(userId)) {
      onChange(subscriberIds.filter((id) => id !== userId));
    } else if (subscriberIds.length < maxSubscribers) {
      onChange([...subscriberIds, userId]);
    }
  };

  const selectedUsers = MOCK_USERS.filter((u) => subscriberIds.includes(u.id));

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="pl-10"
        />
      </div>

      {/* Selected count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {subscriberIds.length} / {maxSubscribers} subscribers selected
        </span>
        {subscriberIds.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            Clear All
          </Button>
        )}
      </div>

      {/* Selected users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="gap-2 pr-1">
              <span>{user.displayName}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full"
                onClick={() => toggleUser(user.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      <Separator />

      {/* User list */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-1">
          {filteredUsers.map((user) => {
            const isSelected = subscriberIds.includes(user.id);
            const isDisabled =
              !isSelected && subscriberIds.length >= maxSubscribers;

            return (
              <button
                key={user.id}
                onClick={() => !isDisabled && toggleUser(user.id)}
                disabled={isDisabled}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg p-3 transition-colors",
                  isSelected && "bg-muted",
                  !isDisabled && "hover:bg-muted/50",
                  isDisabled && "cursor-not-allowed opacity-50",
                )}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                  <AvatarFallback className="text-xs">
                    {user.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    @{user.username}
                  </p>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Step 3: Settings
// ============================================================================

function SettingsStep({
  data,
  onChange,
}: {
  data: Partial<BroadcastListInput>;
  onChange: (updates: Partial<BroadcastListInput>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="allow-replies">Allow replies</Label>
          <p className="text-sm text-muted-foreground">
            Let subscribers reply to your broadcasts
          </p>
        </div>
        <Switch
          id="allow-replies"
          checked={data.allowReplies ?? false}
          onCheckedChange={(checked) => onChange({ allowReplies: checked })}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="show-sender">Show sender name</Label>
          <p className="text-sm text-muted-foreground">
            Display your name with broadcasts
          </p>
        </div>
        <Switch
          id="show-sender"
          checked={data.showSenderName ?? true}
          onCheckedChange={(checked) => onChange({ showSenderName: checked })}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="track-delivery">Track delivery</Label>
          <p className="text-sm text-muted-foreground">
            See when messages are delivered
          </p>
        </div>
        <Switch
          id="track-delivery"
          checked={data.trackDelivery ?? true}
          onCheckedChange={(checked) => onChange({ trackDelivery: checked })}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="track-reads">Track read receipts</Label>
          <p className="text-sm text-muted-foreground">
            See when messages are read
          </p>
        </div>
        <Switch
          id="track-reads"
          checked={data.trackReads ?? true}
          onCheckedChange={(checked) => onChange({ trackReads: checked })}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BroadcastListCreator({
  workspaceId,
  open = false,
  onOpenChange,
  onCreate,
  className,
}: BroadcastListCreatorProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<BroadcastListInput>>({
    workspaceId,
    subscriptionMode: "admin",
    allowReplies: false,
    showSenderName: true,
    trackDelivery: true,
    trackReads: true,
    maxSubscribers: 256,
  });
  const [subscriberIds, setSubscriberIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleChange = (updates: Partial<BroadcastListInput>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleCreate = async () => {
    if (!onCreate || !data.name) return;

    setIsCreating(true);
    try {
      await onCreate({
        ...data,
        subscriberIds,
        workspaceId,
      } as BroadcastListInput);
      // Reset form
      setData({
        workspaceId,
        subscriptionMode: "admin",
        allowReplies: false,
        showSenderName: true,
        trackDelivery: true,
        trackReads: true,
        maxSubscribers: 256,
      });
      setSubscriberIds([]);
      setStep(1);
      onOpenChange?.(false);
    } catch (error) {
      logger.error("Failed to create broadcast list:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = step === 1 ? !!data.name : true;
  const canCreate = !!data.name && subscriberIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Create Broadcast List
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3:{" "}
            {step === 1
              ? "Basic Information"
              : step === 2
                ? "Add Subscribers"
                : "Settings"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[400px]">
          {step === 1 && <BasicInfoStep data={data} onChange={handleChange} />}
          {step === 2 && (
            <AddSubscribersStep
              subscriberIds={subscriberIds}
              onChange={setSubscriberIds}
              maxSubscribers={data.maxSubscribers || 256}
            />
          )}
          {step === 3 && <SettingsStep data={data} onChange={handleChange} />}
        </div>

        <DialogFooter className="gap-2">
          <div className="flex w-full items-center justify-between">
            <Button
              variant="outline"
              onClick={() =>
                step > 1 ? setStep(step - 1) : onOpenChange?.(false)
              }
              disabled={isCreating}
            >
              {step > 1 ? (
                <>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </>
              ) : (
                "Cancel"
              )}
            </Button>

            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={!canCreate || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create List
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BroadcastListCreator;
