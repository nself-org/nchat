/**
 * Recordings List Component
 *
 * Displays a list of recordings with:
 * - Filtering and sorting
 * - Pagination
 * - Quick actions
 * - Status indicators
 */

"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Video,
  Mic,
  Monitor,
  Phone,
  Play,
  Download,
  Share,
  Trash,
  MoreVertical,
  Search,
  Filter,
  Clock,
  HardDrive,
  Shield,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  Recording,
  RecordingStatus,
  RecordingSource,
} from "@/services/recordings/types";

// ============================================================================
// Types
// ============================================================================

interface RecordingsListProps {
  recordings: Recording[];
  total: number;
  isLoading?: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPlay: (recording: Recording) => void;
  onDownload: (recording: Recording) => void;
  onShare: (recording: Recording) => void;
  onDelete: (recording: Recording) => void;
  onFilterChange?: (filters: RecordingFilters) => void;
  className?: string;
}

interface RecordingFilters {
  search?: string;
  status?: RecordingStatus[];
  source?: RecordingSource[];
  sortBy?: "createdAt" | "duration" | "fileSize";
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(seconds?: number): string {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSourceIcon(source: RecordingSource) {
  switch (source) {
    case "call":
      return Phone;
    case "livestream":
      return Video;
    case "screen_share":
      return Monitor;
    case "voice_chat":
      return Mic;
    default:
      return Video;
  }
}

function getStatusBadge(status: RecordingStatus) {
  switch (status) {
    case "recording":
      return (
        <Badge variant="default" className="bg-red-500">
          Recording
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="default" className="bg-green-500">
          Completed
        </Badge>
      );
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "archived":
      return <Badge variant="outline">Archived</Badge>;
    case "legal_hold":
      return (
        <Badge variant="default" className="bg-yellow-500">
          <Shield className="w-3 h-3 mr-1" />
          Legal Hold
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ============================================================================
// Component
// ============================================================================

export function RecordingsList({
  recordings,
  total,
  isLoading,
  page,
  pageSize,
  onPageChange,
  onPlay,
  onDownload,
  onShare,
  onDelete,
  onFilterChange,
  className,
}: RecordingsListProps) {
  const [filters, setFilters] = useState<RecordingFilters>({
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchQuery, setSearchQuery] = useState("");

  const totalPages = Math.ceil(total / pageSize);

  const handleFilterChange = useCallback(
    (updates: Partial<RecordingFilters>) => {
      const newFilters = { ...filters, ...updates };
      setFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [filters, onFilterChange],
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleFilterChange({ search: searchQuery });
    },
    [searchQuery, handleFilterChange],
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </form>

        {/* Status Filter */}
        <Select
          value={filters.status?.[0] || "all"}
          onValueChange={(value) =>
            handleFilterChange({
              status: value === "all" ? undefined : [value as RecordingStatus],
            })
          }
        >
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="recording">Recording</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {/* Source Filter */}
        <Select
          value={filters.source?.[0] || "all"}
          onValueChange={(value) =>
            handleFilterChange({
              source: value === "all" ? undefined : [value as RecordingSource],
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="call">Calls</SelectItem>
            <SelectItem value="livestream">Livestreams</SelectItem>
            <SelectItem value="screen_share">Screen Shares</SelectItem>
            <SelectItem value="voice_chat">Voice Chats</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split("-") as [
              RecordingFilters["sortBy"],
              RecordingFilters["sortOrder"],
            ];
            handleFilterChange({ sortBy, sortOrder });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt-desc">Newest First</SelectItem>
            <SelectItem value="createdAt-asc">Oldest First</SelectItem>
            <SelectItem value="duration-desc">Longest First</SelectItem>
            <SelectItem value="duration-asc">Shortest First</SelectItem>
            <SelectItem value="fileSize-desc">Largest First</SelectItem>
            <SelectItem value="fileSize-asc">Smallest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recordings List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : recordings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No recordings found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recordings.map((recording) => {
            const SourceIcon = getSourceIcon(recording.source);

            return (
              <div
                key={recording.id}
                className="flex items-center gap-4 p-4 bg-card rounded-lg border hover:border-primary/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative w-32 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
                  {recording.thumbnailUrl ? (
                    <img
                      src={recording.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <SourceIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Duration Overlay */}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white">
                    {formatDuration(recording.durationSeconds)}
                  </div>

                  {/* Redaction Indicator */}
                  {recording.hasRedactions && (
                    <div className="absolute top-1 left-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <SourceIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium truncate">
                      {recording.source === "call" ? "Call" : recording.source}{" "}
                      Recording
                    </span>
                    {getStatusBadge(recording.status)}
                    {recording.legalHold && (
                      <Badge
                        variant="outline"
                        className="text-yellow-600 border-yellow-600"
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        Legal Hold
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(recording.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {formatFileSize(recording.fileSize)}
                    </span>
                    <span>{recording.quality}</span>
                    {recording.metadata.totalParticipants > 0 && (
                      <span>
                        {recording.metadata.totalParticipants} participants
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {recording.status === "completed" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPlay(recording)}
                        title="Play"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDownload(recording)}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onShare(recording)}
                        title="Share"
                      >
                        <Share className="w-4 h-4" />
                      </Button>
                    </>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {recording.status === "completed" && (
                        <>
                          <DropdownMenuItem onClick={() => onPlay(recording)}>
                            <Play className="w-4 h-4 mr-2" />
                            Play
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDownload(recording)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onShare(recording)}>
                            <Share className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => onDelete(recording)}
                        className="text-destructive"
                        disabled={recording.legalHold}
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordingsList;
