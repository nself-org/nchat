"use client";

/**
 * TwitterPreview - Twitter/X post embed preview
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { TwitterPostData } from "@/lib/link-preview";

export interface TwitterPreviewProps {
  /** Twitter post data */
  data: TwitterPostData;
  /** Show embed iframe */
  showEmbed?: boolean;
  /** Additional class name */
  className?: string;
  /** Children (for action buttons) */
  children?: React.ReactNode;
}

export function TwitterPreview({
  data,
  showEmbed = false,
  className,
  children,
}: TwitterPreviewProps) {
  const handleClick = () => {
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-all duration-200 hover:border-[#1DA1F2]/50 hover:shadow-md",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-3">
        {/* Twitter/X logo */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black">
          <svg
            className="h-4 w-4 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold">
              {data.authorDisplayName || data.authorUsername}
            </span>
            {data.authorVerified && (
              <svg
                className="h-4 w-4 flex-shrink-0 text-[#1DA1F2]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
              </svg>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            @{data.authorUsername}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className="cursor-pointer p-3"
        onClick={handleClick}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {data.content && (
          <p className="whitespace-pre-wrap break-words text-sm">
            {data.content}
          </p>
        )}

        {/* Media */}
        {data.mediaUrls && data.mediaUrls.length > 0 && (
          <div
            className={cn(
              "mt-3 grid gap-1 overflow-hidden rounded-lg",
              data.mediaUrls.length === 1 && "grid-cols-1",
              data.mediaUrls.length === 2 && "grid-cols-2",
              data.mediaUrls.length >= 3 && "grid-cols-2",
            )}
          >
            {data.mediaUrls.slice(0, 4).map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className={cn(
                  "w-full object-cover",
                  data.mediaUrls!.length === 1 && "max-h-80",
                  data.mediaUrls!.length > 1 && "aspect-square",
                )}
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Quoted tweet */}
        {data.quotedTweet && (
          <div className="bg-muted/50 mt-3 rounded-lg border p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-medium">
                {data.quotedTweet.authorDisplayName}
              </span>
              <span className="text-xs text-muted-foreground">
                @{data.quotedTweet.authorUsername}
              </span>
            </div>
            <p className="line-clamp-2 text-xs">{data.quotedTweet.content}</p>
          </div>
        )}
      </div>

      {/* Engagement stats */}
      {(data.replyCount || data.retweetCount || data.likeCount) && (
        <div className="flex items-center gap-4 px-3 pb-3 text-xs text-muted-foreground">
          {data.replyCount !== undefined && (
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {data.replyCount.toLocaleString()}
            </span>
          )}
          {data.retweetCount !== undefined && (
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {data.retweetCount.toLocaleString()}
            </span>
          )}
          {data.likeCount !== undefined && (
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {data.likeCount.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Posted date */}
      {data.postedAt && (
        <div className="px-3 pb-3 text-xs text-muted-foreground">
          {new Date(data.postedAt).toLocaleString()}
        </div>
      )}

      {/* Children (remove button, etc.) */}
      {children && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          {children}
        </div>
      )}
    </div>
  );
}

export default TwitterPreview;
