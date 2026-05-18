"use client";

/**
 * SearchResults Component
 *
 * Displays search results grouped by type with highlighting
 */

import React from "react";
import {
  File,
  Hash,
  MessageSquare,
  User,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface SearchResult {
  id: string;
  type: "messages" | "files" | "users" | "channels";
  title: string;
  content?: string;
  snippet?: string;
  highlight?: string;
  channelId?: string;
  channelName?: string;
  userId?: string;
  userName?: string;
  avatarUrl?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  score?: number;
}

export interface SearchResultsProps {
  results: {
    items: SearchResult[];
    totals: {
      messages: number;
      files: number;
      users: number;
      channels: number;
      total: number;
    };
  };
  query: string;
  type: "all" | "messages" | "files" | "users" | "channels";
  onClose: () => void;
}

export function SearchResults({
  results,
  query,
  type,
  onClose,
}: SearchResultsProps) {
  const filteredResults =
    type === "all"
      ? results.items
      : results.items.filter((item) => item.type === type);

  if (filteredResults.length === 0) {
    return (
      <div className="mt-8 text-center text-muted-foreground">
        <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p className="text-lg font-medium">No results found</p>
        <p className="mt-2 text-sm">
          Try adjusting your search query or filters
        </p>
      </div>
    );
  }

  const handleResultClick = (result: SearchResult) => {
    // Navigate to the result
    if (result.type === "messages") {
      window.location.href = `/chat/${result.channelId}?message=${result.id}`;
    } else if (result.type === "files") {
      window.open(`/files/${result.id}`, "_blank");
    } else if (result.type === "users") {
      window.location.href = `/users/${result.id}`;
    } else if (result.type === "channels") {
      window.location.href = `/chat/${result.id}`;
    }
    onClose();
  };

  // Group results by type
  const groupedResults = filteredResults.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  return (
    <div className="mt-4 space-y-6">
      {Object.entries(groupedResults).map(([resultType, items]) => (
        <div key={resultType} className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold capitalize">
            {resultType === "messages" && <MessageSquare className="h-4 w-4" />}
            {resultType === "files" && <File className="h-4 w-4" />}
            {resultType === "users" && <User className="h-4 w-4" />}
            {resultType === "channels" && <Hash className="h-4 w-4" />}
            {resultType} ({items.length})
          </h3>

          <div className="space-y-2">
            {items.map((result) => (
              <div
                key={result.id}
                role="button"
                tabIndex={0}
                onClick={() => handleResultClick(result)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleResultClick(result);
                  }
                }}
                className="cursor-pointer rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-start gap-3">
                  {/* Icon/Avatar */}
                  <div className="mt-0.5 flex-shrink-0">
                    {result.type === "messages" && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={result.avatarUrl} />
                        <AvatarFallback>
                          {result.userName?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {result.type === "files" && (
                      <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded">
                        <File className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    {result.type === "users" && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={result.avatarUrl} />
                        <AvatarFallback>
                          {result.title[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {result.type === "channels" && (
                      <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded">
                        <Hash className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="truncate text-sm font-medium">
                          {result.title}
                        </h4>

                        {result.type === "messages" && (
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{result.userName}</span>
                            <span>•</span>
                            <Hash className="h-3 w-3" />
                            <span>{result.channelName}</span>
                          </div>
                        )}

                        {result.type === "files" && result.metadata && (
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {(
                                (result.metadata.size as number) / 1024
                              ).toFixed(0)}{" "}
                              KB
                            </span>
                            <span>•</span>
                            <Badge
                              variant="secondary"
                              className="h-4 px-1 text-[10px]"
                            >
                              {result.metadata.fileType as string}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(result.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>

                    {(result.highlight || result.snippet || result.content) && (
                      <div className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: (
                              result.highlight ||
                              result.snippet ||
                              result.content ||
                              ""
                            ).replace(
                              new RegExp(`(${query})`, "gi"),
                              '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>',
                            ),
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* External link icon */}
                  <ExternalLink className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SearchResults;
