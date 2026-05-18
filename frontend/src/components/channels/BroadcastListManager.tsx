/**
 * BroadcastListManager - Manage broadcast lists
 *
 * View and manage all broadcast lists with:
 * - List of all lists with stats
 * - Quick actions (send, edit, delete)
 * - Subscriber management
 * - Delivery statistics
 * - Filter and search
 */

"use client";

import * as React from "react";
import { useState } from "react";
import {
  Radio,
  Users,
  Send,
  Settings,
  Trash2,
  Search,
  Plus,
  TrendingUp,
  MessageSquare,
  Eye,
  MoreVertical,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BroadcastList } from "@/types/advanced-channels";

// ============================================================================
// Types
// ============================================================================

export interface BroadcastListManagerProps {
  workspaceId: string;
  broadcastLists: BroadcastList[];
  onCreateList?: () => void;
  onSendBroadcast?: (listId: string) => void;
  onEditList?: (list: BroadcastList) => void;
  onDeleteList?: (listId: string) => void;
  onManageSubscribers?: (listId: string) => void;
  className?: string;
}

// ============================================================================
// List Item Component
// ============================================================================

function BroadcastListItem({
  list,
  onSend,
  onEdit,
  onDelete,
  onManageSubscribers,
}: {
  list: BroadcastList;
  onSend?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onManageSubscribers?: () => void;
}) {
  const formatDate = (date?: string) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-xl">
                {list.icon || "📢"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{list.name}</CardTitle>
              {list.description && (
                <CardDescription>{list.description}</CardDescription>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onSend && (
                <DropdownMenuItem onClick={onSend}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Broadcast
                </DropdownMenuItem>
              )}
              {onManageSubscribers && (
                <DropdownMenuItem onClick={onManageSubscribers}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Subscribers
                </DropdownMenuItem>
              )}
              {onEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onEdit}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Settings
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete List
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Subscribers</span>
              </div>
              <p className="text-2xl font-bold">
                {list.subscriberCount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Max: {list.maxSubscribers}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <span>Messages</span>
              </div>
              <p className="text-2xl font-bold">
                {list.totalMessagesSent.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total sent</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Last Broadcast</span>
              </div>
              <p className="text-sm font-medium">
                {formatDate(list.lastBroadcastAt)}
              </p>
            </div>
          </div>

          {/* Settings badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3 w-3" />
              {list.subscriptionMode === "open"
                ? "Open"
                : list.subscriptionMode === "invite"
                  ? "Invite"
                  : "Admin-only"}
            </Badge>
            {list.allowReplies && (
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                Replies allowed
              </Badge>
            )}
            {list.trackDelivery && (
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Track delivery
              </Badge>
            )}
            {list.trackReads && (
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                Track reads
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {onSend && (
              <Button size="sm" onClick={onSend}>
                <Send className="mr-2 h-4 w-4" />
                Send Broadcast
              </Button>
            )}
            {onManageSubscribers && (
              <Button variant="outline" size="sm" onClick={onManageSubscribers}>
                <Users className="mr-2 h-4 w-4" />
                Manage
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BroadcastListManager({
  workspaceId,
  broadcastLists,
  onCreateList,
  onSendBroadcast,
  onEditList,
  onDeleteList,
  onManageSubscribers,
  className,
}: BroadcastListManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLists = broadcastLists.filter(
    (list) =>
      list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalSubscribers = broadcastLists.reduce(
    (sum, list) => sum + list.subscriberCount,
    0,
  );
  const totalMessages = broadcastLists.reduce(
    (sum, list) => sum + list.totalMessagesSent,
    0,
  );

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <div className="space-y-4 border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Broadcast Lists</h2>
            <p className="text-sm text-muted-foreground">
              Manage your broadcast lists and send messages
            </p>
          </div>
          {onCreateList && (
            <Button onClick={onCreateList}>
              <Plus className="mr-2 h-4 w-4" />
              Create List
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Lists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{broadcastLists.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {totalSubscribers.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Messages Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {totalMessages.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search broadcast lists..."
            className="pl-10"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-6">
          {filteredLists.length > 0 ? (
            filteredLists.map((list) => (
              <BroadcastListItem
                key={list.id}
                list={list}
                onSend={
                  onSendBroadcast ? () => onSendBroadcast(list.id) : undefined
                }
                onEdit={onEditList ? () => onEditList(list) : undefined}
                onDelete={
                  onDeleteList ? () => onDeleteList(list.id) : undefined
                }
                onManageSubscribers={
                  onManageSubscribers
                    ? () => onManageSubscribers(list.id)
                    : undefined
                }
              />
            ))
          ) : searchQuery ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No lists found</h3>
              <p className="text-sm text-muted-foreground">
                Try a different search query
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Radio className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                No broadcast lists yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Create your first broadcast list to send messages to multiple
                subscribers
              </p>
              {onCreateList && (
                <Button className="mt-4" onClick={onCreateList}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First List
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default BroadcastListManager;
