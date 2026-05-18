"use client";

/**
 * GitHub Embed Component
 *
 * Displays GitHub content with:
 * - Repository card (name, description, stars, forks)
 * - Issue/PR card
 * - Gist preview with code
 * - User profile card
 *
 * @example
 * ```tsx
 * <GitHubEmbed url="https://github.com/vercel/next.js" />
 * <GitHubEmbed url="https://github.com/vercel/next.js/issues/123" />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  parseGitHubUrl,
  type ParsedGitHubUrl,
} from "@/lib/embeds/embed-patterns";

// ============================================================================
// TYPES
// ============================================================================

export interface GitHubRepoData {
  name: string;
  fullName: string;
  description?: string;
  stars: number;
  forks: number;
  language?: string;
  languageColor?: string;
  topics?: string[];
  isPrivate?: boolean;
  updatedAt?: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
}

export interface GitHubIssueData {
  number: number;
  title: string;
  state: "open" | "closed";
  author: string;
  authorAvatar?: string;
  createdAt: string;
  comments: number;
  labels?: Array<{
    name: string;
    color: string;
  }>;
  isPR?: boolean;
  merged?: boolean;
}

export interface GitHubUserData {
  login: string;
  name?: string;
  avatarUrl: string;
  bio?: string;
  followers: number;
  following: number;
  publicRepos: number;
}

export interface GitHubGistData {
  id: string;
  description?: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
  files: Array<{
    name: string;
    language?: string;
    content?: string;
  }>;
  createdAt: string;
}

export interface GitHubCommitData {
  sha: string;
  message: string;
  author: {
    name: string;
    avatarUrl?: string;
  };
  committedAt: string;
  additions?: number;
  deletions?: number;
}

export interface GitHubFileData {
  path: string;
  content?: string;
  language?: string;
  lineStart?: number;
  lineEnd?: number;
}

export type GitHubEmbedData =
  | { type: "repo"; data: GitHubRepoData }
  | { type: "issue" | "pr"; data: GitHubIssueData }
  | { type: "user"; data: GitHubUserData }
  | { type: "gist"; data: GitHubGistData }
  | { type: "commit"; data: GitHubCommitData }
  | { type: "file"; data: GitHubFileData };

export interface GitHubEmbedProps {
  /**
   * The GitHub URL
   */
  url: string;

  /**
   * Parsed URL data
   */
  parsed?: ParsedGitHubUrl;

  /**
   * Pre-fetched data (optional)
   */
  data?: GitHubEmbedData;

  /**
   * Whether to show the close button
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * Callback when close button is clicked
   */
  onClose?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GitHubEmbed({
  url,
  parsed: parsedProp,
  data,
  showCloseButton = true,
  onClose,
  className,
}: GitHubEmbedProps) {
  // Parse URL if not provided
  const parsed = parsedProp || parseGitHubUrl(url);

  if (!parsed) {
    return (
      <GitHubEmbedFallback
        url={url}
        showCloseButton={showCloseButton}
        onClose={onClose}
        className={className}
      />
    );
  }

  // Render based on content type
  switch (parsed.contentType) {
    case "repo":
      return (
        <GitHubRepoCard
          url={url}
          parsed={parsed}
          data={data?.type === "repo" ? data.data : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
          className={className}
        />
      );

    case "issue":
    case "pr":
      return (
        <GitHubIssueCard
          url={url}
          parsed={parsed}
          data={
            data?.type === "issue" || data?.type === "pr"
              ? data.data
              : undefined
          }
          showCloseButton={showCloseButton}
          onClose={onClose}
          className={className}
        />
      );

    case "user":
      return (
        <GitHubUserCard
          url={url}
          parsed={parsed}
          data={data?.type === "user" ? data.data : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
          className={className}
        />
      );

    case "gist":
      return (
        <GitHubGistCard
          url={url}
          parsed={parsed}
          data={data?.type === "gist" ? data.data : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
          className={className}
        />
      );

    case "commit":
      return (
        <GitHubCommitCard
          url={url}
          parsed={parsed}
          data={data?.type === "commit" ? data.data : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
          className={className}
        />
      );

    case "file":
      return (
        <GitHubFileCard
          url={url}
          parsed={parsed}
          data={data?.type === "file" ? data.data : undefined}
          showCloseButton={showCloseButton}
          onClose={onClose}
          className={className}
        />
      );

    default:
      return (
        <GitHubEmbedFallback
          url={url}
          showCloseButton={showCloseButton}
          onClose={onClose}
          className={className}
        />
      );
  }
}

// ============================================================================
// REPO CARD
// ============================================================================

interface GitHubRepoCardProps {
  url: string;
  parsed: ParsedGitHubUrl;
  data?: GitHubRepoData;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function GitHubRepoCard({
  url,
  parsed,
  data,
  showCloseButton,
  onClose,
  className,
}: GitHubRepoCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const fullName = data?.fullName || `${parsed.owner}/${parsed.repo}`;
  const description = data?.description;
  const stars = data?.stars;
  const forks = data?.forks;
  const language = data?.language;
  const languageColor = data?.languageColor || getLanguageColor(language);

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card p-4",
        "hover:border-border/80 cursor-pointer transition-colors",
        "max-w-md",
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
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      {/* Header */}
      <div className="flex items-start gap-3">
        {data?.owner?.avatarUrl && (
          <img
            src={data.owner.avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <RepoIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="truncate font-semibold text-[#0969da] dark:text-[#58a6ff]">
              {fullName}
            </span>
          </div>
          {data?.isPrivate && (
            <span className="mt-1 inline-block rounded-full border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
              Private
            </span>
          )}
        </div>
        <GitHubIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
      </div>

      {/* Description */}
      {description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {/* Topics */}
      {data?.topics && data.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.topics.slice(0, 5).map((topic) => (
            <span
              key={topic}
              className="inline-block rounded-full bg-[#ddf4ff] px-2 py-0.5 text-xs text-[#0969da] dark:bg-[#388bfd26] dark:text-[#58a6ff]"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        {language && (
          <div className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: languageColor }}
            />
            <span>{language}</span>
          </div>
        )}
        {stars !== undefined && (
          <div className="flex items-center gap-1">
            <StarIcon className="h-3.5 w-3.5" />
            <span>{formatNumber(stars)}</span>
          </div>
        )}
        {forks !== undefined && (
          <div className="flex items-center gap-1">
            <ForkIcon className="h-3.5 w-3.5" />
            <span>{formatNumber(forks)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ISSUE/PR CARD
// ============================================================================

interface GitHubIssueCardProps {
  url: string;
  parsed: ParsedGitHubUrl;
  data?: GitHubIssueData;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function GitHubIssueCard({
  url,
  parsed,
  data,
  showCloseButton,
  onClose,
  className,
}: GitHubIssueCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isPR = parsed.contentType === "pr" || data?.isPR;
  const number = data?.number || parsed.number;
  const title = data?.title || `#${number}`;
  const state = data?.state || "open";
  const isMerged = data?.merged;

  // Determine state color
  const getStateColor = () => {
    if (isMerged) return "text-[#8250df] bg-[#8250df]/10";
    if (state === "open") return "text-[#1a7f37] bg-[#1a7f37]/10";
    return "text-[#cf222e] bg-[#cf222e]/10";
  };

  const getStateIcon = () => {
    if (isMerged) return <MergedIcon className="h-4 w-4" />;
    if (isPR)
      return state === "open" ? (
        <PROpenIcon className="h-4 w-4" />
      ) : (
        <PRClosedIcon className="h-4 w-4" />
      );
    return state === "open" ? (
      <IssueOpenIcon className="h-4 w-4" />
    ) : (
      <IssueClosedIcon className="h-4 w-4" />
    );
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card p-4",
        "hover:border-border/80 cursor-pointer transition-colors",
        "max-w-md",
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
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn("rounded-full p-1.5", getStateColor())}>
          {getStateIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {parsed.owner}/{parsed.repo} #{number}
          </p>
        </div>
        <GitHubIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
      </div>

      {/* Labels */}
      {data?.labels && data.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.labels.slice(0, 4).map((label) => (
            <span
              key={label.name}
              className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
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

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {data?.author && (
          <div className="flex items-center gap-1">
            {data.authorAvatar && (
              <img
                src={data.authorAvatar}
                alt=""
                className="h-4 w-4 rounded-full"
              />
            )}
            <span>{data.author}</span>
          </div>
        )}
        {data?.createdAt && <span>{formatDate(data.createdAt)}</span>}
        {data?.comments !== undefined && data.comments > 0 && (
          <div className="flex items-center gap-1">
            <CommentIcon className="h-3.5 w-3.5" />
            <span>{data.comments}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// USER CARD
// ============================================================================

interface GitHubUserCardProps {
  url: string;
  parsed: ParsedGitHubUrl;
  data?: GitHubUserData;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function GitHubUserCard({
  url,
  parsed,
  data,
  showCloseButton,
  onClose,
  className,
}: GitHubUserCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const username = data?.login || parsed.owner;
  const displayName = data?.name;
  const avatarUrl = data?.avatarUrl || `https://github.com/${username}.png`;

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card p-4",
        "hover:border-border/80 cursor-pointer transition-colors",
        "max-w-xs",
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
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      <div className="flex items-center gap-3">
        <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full" />
        <div className="min-w-0 flex-1">
          {displayName && (
            <p className="truncate font-semibold text-foreground">
              {displayName}
            </p>
          )}
          <p className="truncate text-sm text-muted-foreground">@{username}</p>
        </div>
        <GitHubIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
      </div>

      {data?.bio && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {data.bio}
        </p>
      )}

      {data && (
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" />
            <span>
              <strong className="text-foreground">
                {formatNumber(data.followers)}
              </strong>{" "}
              followers
            </span>
          </div>
          <span>
            <strong className="text-foreground">
              {formatNumber(data.publicRepos)}
            </strong>{" "}
            repos
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GIST CARD
// ============================================================================

interface GitHubGistCardProps {
  url: string;
  parsed: ParsedGitHubUrl;
  data?: GitHubGistData;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function GitHubGistCard({
  url,
  parsed,
  data,
  showCloseButton,
  onClose,
  className,
}: GitHubGistCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const gistId = data?.id || parsed.gistId;
  const owner = data?.owner?.login || parsed.owner;
  const description = data?.description;
  const files = data?.files || [];
  const firstFile = files[0];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card",
        "hover:border-border/80 cursor-pointer transition-colors",
        "max-w-lg",
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
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <GistIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-[#0969da] dark:text-[#58a6ff]">
            {owner} / {gistId?.slice(0, 8)}...
          </span>
          <GitHubIcon className="ml-auto h-4 w-4 text-muted-foreground" />
        </div>
        {description && (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {files.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <FileIcon className="h-3.5 w-3.5" />
            <span>{files.map((f) => f.name).join(", ")}</span>
          </div>
        )}
      </div>

      {/* Code preview */}
      {firstFile?.content && (
        <div className="bg-muted/30 border-t border-border p-3">
          <pre className="max-h-32 overflow-hidden text-xs">
            <code className="text-muted-foreground">
              {firstFile.content.slice(0, 500)}
              {firstFile.content.length > 500 && "..."}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMMIT CARD
// ============================================================================

interface GitHubCommitCardProps {
  url: string;
  parsed: ParsedGitHubUrl;
  data?: GitHubCommitData;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function GitHubCommitCard({
  url,
  parsed,
  data,
  showCloseButton,
  onClose,
  className,
}: GitHubCommitCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const sha = data?.sha || parsed.commitSha || "";
  const shortSha = sha.slice(0, 7);
  const message = data?.message || "Commit";
  const [title] = message.split("\n");

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card p-4",
        "hover:border-border/80 cursor-pointer transition-colors",
        "max-w-md",
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
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      <div className="flex items-start gap-3">
        <CommitIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium text-foreground">{title}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {data?.author && (
              <div className="flex items-center gap-1">
                {data.author.avatarUrl && (
                  <img
                    src={data.author.avatarUrl}
                    alt=""
                    className="h-4 w-4 rounded-full"
                  />
                )}
                <span>{data.author.name}</span>
              </div>
            )}
            <span className="font-mono">{shortSha}</span>
            {data?.committedAt && <span>{formatDate(data.committedAt)}</span>}
          </div>
        </div>
        <GitHubIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
      </div>

      {/* Diff stats */}
      {(data?.additions !== undefined || data?.deletions !== undefined) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {data.additions !== undefined && (
            <span className="text-[#1a7f37]">+{data.additions}</span>
          )}
          {data.deletions !== undefined && (
            <span className="text-[#cf222e]">-{data.deletions}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FILE CARD
// ============================================================================

interface GitHubFileCardProps {
  url: string;
  parsed: ParsedGitHubUrl;
  data?: GitHubFileData;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function GitHubFileCard({
  url,
  parsed,
  data,
  showCloseButton,
  onClose,
  className,
}: GitHubFileCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const filePath = data?.path || parsed.filePath || "";
  const fileName = filePath.split("/").pop() || filePath;
  const lineRange = parsed.lineStart
    ? parsed.lineEnd
      ? `L${parsed.lineStart}-L${parsed.lineEnd}`
      : `L${parsed.lineStart}`
    : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card",
        "hover:border-border/80 cursor-pointer transition-colors",
        "max-w-lg",
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
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <FileIcon className="h-4 w-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{fileName}</span>
        {lineRange && (
          <span className="text-xs text-muted-foreground">{lineRange}</span>
        )}
        <GitHubIcon className="ml-auto h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </div>

      {/* Path */}
      <div className="px-3 pb-2">
        <p className="truncate text-xs text-muted-foreground">
          {parsed.owner}/{parsed.repo}/{filePath}
        </p>
      </div>

      {/* Code preview */}
      {data?.content && (
        <div className="bg-muted/30 border-t border-border p-3">
          <pre className="max-h-40 overflow-hidden text-xs">
            <code className="text-muted-foreground">
              {data.content.slice(0, 800)}
              {data.content.length > 800 && "..."}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FALLBACK
// ============================================================================

interface GitHubEmbedFallbackProps {
  url: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function GitHubEmbedFallback({
  url,
  showCloseButton,
  onClose,
  className,
}: GitHubEmbedFallbackProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card p-4",
        "hover:border-border/80 cursor-pointer transition-colors",
        "max-w-md",
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
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#24292f] dark:bg-[#f0f6fc]">
          <GitHubIcon className="h-6 w-6 text-white dark:text-[#24292f]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">View on GitHub</p>
          <p className="truncate text-sm text-muted-foreground">{url}</p>
        </div>
        <ExternalLinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      className={cn(
        "absolute right-2 top-2 z-10",
        "bg-background/80 rounded-full p-1 backdrop-blur-sm",
        "opacity-0 transition-opacity group-hover:opacity-100",
        "hover:bg-background",
      )}
      aria-label="Remove embed"
    >
      <CloseIcon className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return dateString;
  }
}

function getLanguageColor(language?: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Java: "#b07219",
    Go: "#00ADD8",
    Rust: "#dea584",
    Ruby: "#701516",
    PHP: "#4F5D95",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    Vue: "#41b883",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Shell: "#89e051",
  };

  return colors[language || ""] || "#8b8b8b";
}

// ============================================================================
// ICONS
// ============================================================================

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function RepoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
    </svg>
  );
}

function ForkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
    </svg>
  );
}

function IssueOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
    </svg>
  );
}

function IssueClosedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.28 6.78a.75.75 0 00-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l3.5-3.5z" />
      <path d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-1.5 0a6.5 6.5 0 10-13 0 6.5 6.5 0 0013 0z" />
    </svg>
  );
}

function PROpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
    </svg>
  );
}

function PRClosedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.25 1A2.25 2.25 0 011 3.25v9.5A2.25 2.25 0 003.25 15h9.5A2.25 2.25 0 0015 12.75v-9.5A2.25 2.25 0 0012.75 1h-9.5zM2.5 3.25a.75.75 0 01.75-.75h9.5a.75.75 0 01.75.75v9.5a.75.75 0 01-.75.75h-9.5a.75.75 0 01-.75-.75v-9.5z" />
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L6.94 8l-1.72 1.72a.75.75 0 101.06 1.06L8 9.06l1.72 1.72a.75.75 0 101.06-1.06L9.06 8l1.72-1.72a.75.75 0 00-1.06-1.06L8 6.94 6.28 5.22z" />
    </svg>
  );
}

function MergedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M5.45 5.154A4.25 4.25 0 009.25 7.5h1.378a2.251 2.251 0 110 1.5H9.25A5.734 5.734 0 015 7.123v3.505a2.25 2.25 0 11-1.5 0V5.372a2.25 2.25 0 111.95-.218zM4.25 13.5a.75.75 0 100-1.5.75.75 0 000 1.5zm8.5-4.5a.75.75 0 100-1.5.75.75 0 000 1.5zM5 3.25a.75.75 0 100 .005V3.25z" />
    </svg>
  );
}

function GistIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8.75 1.75a.75.75 0 00-1.5 0V5H4a.75.75 0 000 1.5h3.25v3.25a.75.75 0 001.5 0V6.5H12A.75.75 0 0012 5H8.75V1.75z" />
    </svg>
  );
}

function CommitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zm-1.43-.75a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V4.664a.25.25 0 00-.073-.177l-2.914-2.914a.25.25 0 00-.177-.073H3.75z" />
    </svg>
  );
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.458 1.458 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h4.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.507 5.507 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5zM11 4a3.001 3.001 0 012.22 5.018 5.01 5.01 0 012.56 3.012.75.75 0 11-1.443.422 3.507 3.507 0 00-2.745-2.483.75.75 0 01-.29-1.39A1.5 1.5 0 1011 4zm-5.5-.5a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

export default GitHubEmbed;
