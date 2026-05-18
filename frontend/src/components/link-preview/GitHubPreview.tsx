"use client";

/**
 * GitHubPreview - GitHub repository/issue/PR preview
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { isGitHubRepoPreview, isGitHubIssuePreview } from "@/lib/link-preview";
import type {
  GitHubRepoData,
  GitHubIssueData,
  LinkPreviewData,
} from "@/lib/link-preview";

export interface GitHubPreviewProps {
  /** GitHub preview data */
  data: GitHubRepoData | GitHubIssueData | LinkPreviewData;
  /** Additional class name */
  className?: string;
  /** Children (for action buttons) */
  children?: React.ReactNode;
}

export function GitHubPreview({
  data,
  className,
  children,
}: GitHubPreviewProps) {
  const handleClick = () => {
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  // Render repository preview
  if (isGitHubRepoPreview(data)) {
    return (
      <GitHubRepoPreview
        data={data}
        className={className}
        onClick={handleClick}
      >
        {children}
      </GitHubRepoPreview>
    );
  }

  // Render issue/PR preview
  if (isGitHubIssuePreview(data)) {
    return (
      <GitHubIssuePreview
        data={data}
        className={className}
        onClick={handleClick}
      >
        {children}
      </GitHubIssuePreview>
    );
  }

  // Fallback to generic GitHub card
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-all duration-200 hover:border-[#238636]/50 hover:shadow-md",
        "cursor-pointer",
        className,
      )}
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
      <div className="flex items-center gap-3 p-3">
        <GitHubIcon className="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">
            {data.title || data.url}
          </h3>
          {data.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {children && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          {children}
        </div>
      )}
    </div>
  );
}

// Repository preview component
function GitHubRepoPreview({
  data,
  className,
  onClick,
  children,
}: {
  data: GitHubRepoData;
  className?: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-all duration-200 hover:border-[#238636]/50 hover:shadow-md",
        "cursor-pointer",
        className,
      )}
      onClick={onClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-3 pb-0">
        <GitHubIcon className="mt-0.5 h-6 w-6 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[#58a6ff] hover:underline">
              {data.fullName}
            </h3>
            {data.isPrivate && (
              <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Private
              </span>
            )}
            {data.isArchived && (
              <span className="rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[10px] text-yellow-600">
                Archived
              </span>
            )}
            {data.isFork && (
              <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Fork
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <p className="line-clamp-2 px-3 py-2 text-sm text-muted-foreground">
          {data.description}
        </p>
      )}

      {/* Topics */}
      {data.topics && data.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {data.topics.slice(0, 5).map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-[#388bfd]/20 px-2 py-0.5 text-xs text-[#58a6ff]"
            >
              {topic}
            </span>
          ))}
          {data.topics.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{data.topics.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 px-3 pb-3 text-xs text-muted-foreground">
        {data.language && (
          <span className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: data.languageColor || "#8b949e" }}
            />
            {data.language}
          </span>
        )}
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
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          {data.starCount.toLocaleString()}
        </span>
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
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          {data.forkCount.toLocaleString()}
        </span>
        {data.license && (
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
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
            {data.license}
          </span>
        )}
      </div>

      {children && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          {children}
        </div>
      )}
    </div>
  );
}

// Issue/PR preview component
function GitHubIssuePreview({
  data,
  className,
  onClick,
  children,
}: {
  data: GitHubIssueData;
  className?: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  const stateColors = {
    open: "text-[#238636] bg-[#238636]/20",
    closed: "text-[#8957e5] bg-[#8957e5]/20",
    merged: "text-[#8957e5] bg-[#8957e5]/20",
  };

  const StateIcon = data.isPullRequest
    ? data.state === "merged"
      ? MergedIcon
      : data.state === "closed"
        ? ClosedPRIcon
        : OpenPRIcon
    : data.state === "closed"
      ? ClosedIssueIcon
      : OpenIssueIcon;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-all duration-200 hover:border-[#238636]/50 hover:shadow-md",
        "cursor-pointer",
        className,
      )}
      onClick={onClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <StateIcon
            className={cn(
              "mt-0.5 h-5 w-5 flex-shrink-0",
              stateColors[data.state],
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <GitHubIcon className="h-4 w-4" />
              <span>
                {data.owner}/{data.repo}
              </span>
              <span>#{data.number}</span>
            </div>
            <h3 className="mt-1 line-clamp-2 text-sm font-semibold">
              {data.title}
            </h3>
          </div>
        </div>

        {/* Labels */}
        {data.labels && data.labels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.labels.slice(0, 4).map((label) => (
              <span
                key={label.name}
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: `#${label.color}20`,
                  color: `#${label.color}`,
                  border: `1px solid #${label.color}40`,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              stateColors[data.state],
            )}
          >
            {data.state.charAt(0).toUpperCase() + data.state.slice(1)}
          </span>
          {data.author && (
            <span className="flex items-center gap-1">
              {data.authorAvatar && (
                <img
                  src={data.authorAvatar}
                  alt={data.author}
                  className="h-4 w-4 rounded-full"
                  loading="lazy"
                />
              )}
              {data.author}
            </span>
          )}
          {data.commentCount !== undefined && (
            <span className="flex items-center gap-1">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {data.commentCount}
            </span>
          )}
        </div>
      </div>

      {children && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          {children}
        </div>
      )}
    </div>
  );
}

// Icon components
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
      />
    </svg>
  );
}

function OpenIssueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      <path
        fillRule="evenodd"
        d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"
      />
    </svg>
  );
}

function ClosedIssueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.28 6.78a.75.75 0 00-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l3.5-3.5z" />
      <path
        fillRule="evenodd"
        d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-1.5 0a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
      />
    </svg>
  );
}

function OpenPRIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"
      />
    </svg>
  );
}

function ClosedPRIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10.72 1.227a.75.75 0 011.06 0l.97.97.97-.97a.75.75 0 111.06 1.061l-.97.97.97.97a.75.75 0 01-1.06 1.06l-.97-.97-.97.97a.75.75 0 11-1.06-1.06l.97-.97-.97-.97a.75.75 0 010-1.06zM12.75 6.5a.75.75 0 00-.75.75v3.378a2.251 2.251 0 101.5 0V7.25a.75.75 0 00-.75-.75zm0 5.5a.75.75 0 100 1.5.75.75 0 000-1.5zM2.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.25 1a2.25 2.25 0 00-.75 4.372v5.256a2.251 2.251 0 101.5 0V5.372A2.25 2.25 0 003.25 1zm0 11a.75.75 0 100 1.5.75.75 0 000-1.5z"
      />
    </svg>
  );
}

function MergedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
      />
    </svg>
  );
}

export default GitHubPreview;
