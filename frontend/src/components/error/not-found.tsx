"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Search,
  Home,
  ArrowLeft,
  Hash,
  User,
  FileQuestion,
  MessageSquare,
} from "lucide-react";

type NotFoundType = "channel" | "user" | "message" | "file" | "generic";

interface NotFoundProps {
  /**
   * Type of resource not found
   */
  type?: NotFoundType;
  /**
   * Name or ID of the resource
   */
  resourceName?: string;
  /**
   * Custom title
   */
  title?: string;
  /**
   * Custom description
   */
  description?: string;
  /**
   * Show search input
   */
  showSearch?: boolean;
  /**
   * Search placeholder
   */
  searchPlaceholder?: string;
  /**
   * Callback when search is submitted
   */
  onSearch?: (query: string) => void;
  /**
   * Show home button
   */
  showHomeButton?: boolean;
  /**
   * Show back button
   */
  showBackButton?: boolean;
  /**
   * Custom actions
   */
  actions?: React.ReactNode;
  /**
   * Custom className
   */
  className?: string;
}

const typeConfig: Record<
  NotFoundType,
  { icon: typeof Hash; defaultTitle: string; defaultDescription: string }
> = {
  channel: {
    icon: Hash,
    defaultTitle: "Channel Not Found",
    defaultDescription:
      "The channel you are looking for does not exist or has been deleted.",
  },
  user: {
    icon: User,
    defaultTitle: "User Not Found",
    defaultDescription:
      "The user you are looking for does not exist or has left the workspace.",
  },
  message: {
    icon: MessageSquare,
    defaultTitle: "Message Not Found",
    defaultDescription:
      "The message you are looking for does not exist or has been deleted.",
  },
  file: {
    icon: FileQuestion,
    defaultTitle: "File Not Found",
    defaultDescription:
      "The file you are looking for does not exist or has been removed.",
  },
  generic: {
    icon: FileQuestion,
    defaultTitle: "Not Found",
    defaultDescription:
      "The page or resource you are looking for could not be found.",
  },
};

/**
 * Not found component for various resource types.
 */
export function NotFound({
  type = "generic",
  resourceName,
  title,
  description,
  showSearch = false,
  searchPlaceholder = "Search...",
  onSearch,
  showHomeButton = true,
  showBackButton = true,
  actions,
  className,
}: NotFoundProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const config = typeConfig[type];
  const Icon = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displayDescription = resourceName
    ? `"${resourceName}" ${config.defaultDescription.toLowerCase()}`
    : description || config.defaultDescription;

  const handleBack = () => {
    window.history.back();
  };

  const handleHome = () => {
    window.location.href = "/";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center p-8 text-center",
        className,
      )}
    >
      {/* Icon */}
      <div className="mb-6 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
        <Icon className="h-12 w-12 text-zinc-400 dark:text-zinc-500" />
      </div>

      {/* Title */}
      <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {displayTitle}
      </h2>

      {/* Description */}
      <p className="mb-8 max-w-md text-base text-zinc-600 dark:text-zinc-400">
        {displayDescription}
      </p>

      {/* Search */}
      {showSearch && onSearch && (
        <form onSubmit={handleSearch} className="mb-8 w-full max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "w-full rounded-lg py-2 pl-10 pr-4",
                "border border-zinc-200 dark:border-zinc-700",
                "bg-white dark:bg-zinc-800",
                "text-zinc-900 dark:text-zinc-100",
                "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary",
              )}
            />
          </div>
        </form>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        {showHomeButton && (
          <Button onClick={handleHome} variant="default" className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        )}

        {showBackButton && (
          <Button onClick={handleBack} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        )}

        {actions}
      </div>
    </div>
  );
}

/**
 * Channel not found component
 */
export function ChannelNotFound({
  channelName,
  onSearch,
  ...props
}: Omit<NotFoundProps, "type"> & { channelName?: string }) {
  return (
    <NotFound
      type="channel"
      resourceName={channelName}
      showSearch={!!onSearch}
      searchPlaceholder="Search channels..."
      onSearch={onSearch}
      {...props}
    />
  );
}

/**
 * User not found component
 */
export function UserNotFound({
  userName,
  onSearch,
  ...props
}: Omit<NotFoundProps, "type"> & { userName?: string }) {
  return (
    <NotFound
      type="user"
      resourceName={userName}
      showSearch={!!onSearch}
      searchPlaceholder="Search users..."
      onSearch={onSearch}
      {...props}
    />
  );
}

/**
 * Message not found component
 */
export function MessageNotFound(props: Omit<NotFoundProps, "type">) {
  return <NotFound type="message" {...props} />;
}

/**
 * File not found component
 */
export function FileNotFound({
  fileName,
  ...props
}: Omit<NotFoundProps, "type"> & { fileName?: string }) {
  return <NotFound type="file" resourceName={fileName} {...props} />;
}

export default NotFound;
