"use client";

import * as React from "react";
import { Bookmark, Star, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SavedEmptyProps {
  /** Type of empty state */
  type?: "all" | "starred" | "collection";
  /** Collection name (when type is collection) */
  collectionName?: string;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Additional className */
  className?: string;
}

/**
 * Empty state for when there are no saved messages.
 */
export function SavedEmpty({
  type = "all",
  collectionName,
  title,
  description,
  className,
}: SavedEmptyProps) {
  const getContent = () => {
    switch (type) {
      case "starred":
        return {
          icon: Star,
          title: title ?? "No starred messages",
          description:
            description ??
            "Star your most important saved messages for quick access.",
        };
      case "collection":
        return {
          icon: FolderOpen,
          title:
            title ?? `No messages in ${collectionName ?? "this collection"}`,
          description:
            description ??
            "Add saved messages to this collection to organize them.",
        };
      default:
        return {
          icon: Bookmark,
          title: title ?? "No saved messages",
          description:
            description ??
            "Save messages to access them later. Your saved messages are private and only visible to you.",
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-medium">{content.title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {content.description}
      </p>
    </div>
  );
}
