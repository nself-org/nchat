/**
 * UnreadMentions Component
 *
 * Panel/dropdown showing unread mentions with filtering and actions.
 */

"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MentionNotification,
  MentionNotificationHeader,
  MentionNotificationEmpty,
} from "./MentionNotification";
import { MentionBadge } from "./MentionHighlight";
import type { MentionNotification as MentionNotificationType } from "@/lib/mentions/mention-types";

// ============================================================================
// Types
// ============================================================================

export interface UnreadMentionsProps {
  /** List of all mentions */
  mentions: MentionNotificationType[];
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when a mention is clicked */
  onMentionClick?: (mention: MentionNotificationType) => void;
  /** Callback to mark a mention as read */
  onMarkAsRead?: (mentionId: string) => void;
  /** Callback to mark all as read */
  onMarkAllAsRead?: () => void;
  /** Maximum height */
  maxHeight?: number | string;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function UnreadMentions({
  mentions,
  isLoading = false,
  error = null,
  onMentionClick,
  onMarkAsRead,
  onMarkAllAsRead,
  maxHeight = 400,
  className,
}: UnreadMentionsProps) {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("unread");

  const unreadMentions = mentions.filter((m) => !m.isRead);
  const unreadCount = unreadMentions.length;

  const displayedMentions = activeTab === "unread" ? unreadMentions : mentions;

  const handleMentionClick = useCallback(
    (mention: MentionNotificationType) => {
      onMentionClick?.(mention);
      if (!mention.isRead) {
        onMarkAsRead?.(mention.id);
      }
    },
    [onMentionClick, onMarkAsRead],
  );

  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <MentionNotificationHeader unreadCount={0} />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full", className)}>
        <MentionNotificationHeader unreadCount={0} />
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <div className="bg-destructive/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h4 className="font-medium text-destructive">
            Error loading mentions
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <MentionNotificationHeader
        unreadCount={unreadCount}
        onMarkAllAsRead={unreadCount > 0 ? onMarkAllAsRead : undefined}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "all" | "unread")}
        className="w-full"
      >
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="unread"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
          >
            Unread
            {unreadCount > 0 && (
              <MentionBadge count={unreadCount} size="sm" className="ml-2" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
          >
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="m-0">
          <MentionList
            mentions={unreadMentions}
            onMentionClick={handleMentionClick}
            onMarkAsRead={onMarkAsRead}
            maxHeight={maxHeight}
            emptyFilter="unread"
          />
        </TabsContent>

        <TabsContent value="all" className="m-0">
          <MentionList
            mentions={mentions}
            onMentionClick={handleMentionClick}
            onMarkAsRead={onMarkAsRead}
            maxHeight={maxHeight}
            emptyFilter="all"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Mention List
// ============================================================================

interface MentionListProps {
  mentions: MentionNotificationType[];
  onMentionClick?: (mention: MentionNotificationType) => void;
  onMarkAsRead?: (mentionId: string) => void;
  maxHeight?: number | string;
  emptyFilter: "all" | "unread";
}

function MentionList({
  mentions,
  onMentionClick,
  onMarkAsRead,
  maxHeight = 400,
  emptyFilter,
}: MentionListProps) {
  if (mentions.length === 0) {
    return <MentionNotificationEmpty filter={emptyFilter} />;
  }

  return (
    <ScrollArea
      style={{
        maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
      }}
    >
      <div className="divide-y">
        {mentions.map((mention) => (
          <MentionNotification
            key={mention.id}
            notification={mention}
            onClick={() => onMentionClick?.(mention)}
            onMarkAsRead={() => onMarkAsRead?.(mention.id)}
            showMarkAsRead={!mention.isRead}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// Unread Mentions Button (for header/toolbar)
// ============================================================================

export interface UnreadMentionsButtonProps {
  unreadCount: number;
  onClick?: () => void;
  className?: string;
}

export function UnreadMentionsButton({
  unreadCount,
  onClick,
  className,
}: UnreadMentionsButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      onClick={onClick}
      aria-label={`${unreadCount} unread mentions`}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
        />
      </svg>
      {unreadCount > 0 && (
        <span className="text-primary-foreground absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
}

// ============================================================================
// Sidebar Mentions Badge
// ============================================================================

export interface SidebarMentionsBadgeProps {
  channelId: string;
  unreadCount: number;
  className?: string;
}

export function SidebarMentionsBadge({
  channelId,
  unreadCount,
  className,
}: SidebarMentionsBadgeProps) {
  if (unreadCount === 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium",
        className,
      )}
      data-channel-id={channelId}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}

// ============================================================================
// Loading Spinner
// ============================================================================

function LoadingSpinner() {
  return (
    <svg
      className="h-6 w-6 animate-spin text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// Mentions Panel (Full Panel Component)
// ============================================================================

export interface MentionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mentions: MentionNotificationType[];
  isLoading?: boolean;
  error?: string | null;
  onMentionClick?: (mention: MentionNotificationType) => void;
  onMarkAsRead?: (mentionId: string) => void;
  onMarkAllAsRead?: () => void;
  className?: string;
}

export function MentionsPanel({
  isOpen,
  onClose,
  mentions,
  isLoading,
  error,
  onMentionClick,
  onMarkAsRead,
  onMarkAllAsRead,
  className,
}: MentionsPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-background shadow-lg",
        "transform transition-transform duration-200",
        isOpen ? "translate-x-0" : "translate-x-full",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-lg font-semibold">Mentions</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Content */}
      <UnreadMentions
        mentions={mentions}
        isLoading={isLoading}
        error={error}
        onMentionClick={(mention) => {
          onMentionClick?.(mention);
          onClose();
        }}
        onMarkAsRead={onMarkAsRead}
        onMarkAllAsRead={onMarkAllAsRead}
        maxHeight="calc(100vh - 120px)"
      />
    </div>
  );
}

export default UnreadMentions;
