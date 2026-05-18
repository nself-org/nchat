/**
 * Redaction Editor Component
 *
 * Interactive editor for managing recording redactions:
 * - Timeline-based segment selection
 * - Audio/video redaction types
 * - Region selection for video blur
 * - Preview redacted output
 */

"use client";

import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Scissors,
  Plus,
  Trash,
  Play,
  Square,
  Save,
  AlertTriangle,
  Eye,
} from "lucide-react";
import type {
  Recording,
  RedactionSegment,
  RedactionType,
  RedactionRegion,
} from "@/services/recordings/types";

// ============================================================================
// Types
// ============================================================================

interface RedactionEditorProps {
  recording: Recording;
  segments: RedactionSegment[];
  onAddSegment: (
    segment: Omit<
      RedactionSegment,
      "id" | "recordingId" | "applied" | "appliedAt" | "createdAt" | "createdBy"
    >,
  ) => Promise<void>;
  onRemoveSegment: (segmentId: string) => Promise<void>;
  onApplyRedactions: (preserveOriginal: boolean) => Promise<void>;
  onPreview?: (
    segment: Omit<
      RedactionSegment,
      "id" | "recordingId" | "applied" | "appliedAt" | "createdAt" | "createdBy"
    >,
  ) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

interface NewSegment {
  type: RedactionType;
  startSeconds: number;
  endSeconds: number;
  reason: string;
  region?: RedactionRegion;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

function parseTime(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    const [mins, secs] = parts.map(parseFloat);
    return mins * 60 + secs;
  }
  return parseFloat(timeStr) || 0;
}

function getRedactionTypeIcon(type: RedactionType) {
  switch (type) {
    case "audio":
    case "silence":
    case "beep":
      return VolumeX;
    case "video":
    case "blur":
      return VideoOff;
    case "both":
      return Scissors;
    default:
      return AlertTriangle;
  }
}

function getRedactionTypeLabel(type: RedactionType): string {
  switch (type) {
    case "audio":
      return "Mute Audio";
    case "video":
      return "Black Video";
    case "both":
      return "Mute Audio + Black Video";
    case "blur":
      return "Blur Region";
    case "silence":
      return "Silence";
    case "beep":
      return "Beep";
    default:
      return type;
  }
}

// ============================================================================
// Component
// ============================================================================

export function RedactionEditor({
  recording,
  segments,
  onAddSegment,
  onRemoveSegment,
  onApplyRedactions,
  onPreview,
  isLoading,
  className,
}: RedactionEditorProps) {
  const duration = recording.durationSeconds || 0;
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [preserveOriginal, setPreserveOriginal] = useState(true);
  const [newSegment, setNewSegment] = useState<NewSegment>({
    type: "both",
    startSeconds: 0,
    endSeconds: 10,
    reason: "",
  });

  // Separate applied and pending segments
  const appliedSegments = segments.filter((s) => s.applied);
  const pendingSegments = segments.filter((s) => !s.applied);

  // Handle timeline click to set start time
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const clickTime = percent * duration;

      setNewSegment((prev) => ({
        ...prev,
        startSeconds: Math.max(0, clickTime),
        endSeconds: Math.min(duration, clickTime + 10),
      }));
    },
    [duration],
  );

  // Handle add segment
  const handleAddSegment = useCallback(async () => {
    if (!newSegment.reason.trim()) return;

    try {
      await onAddSegment({
        type: newSegment.type,
        startSeconds: newSegment.startSeconds,
        endSeconds: newSegment.endSeconds,
        reason: newSegment.reason,
        region: newSegment.region,
      });

      setNewSegment({
        type: "both",
        startSeconds: 0,
        endSeconds: 10,
        reason: "",
      });
      setIsAddingSegment(false);
    } catch (error) {
      console.error("Failed to add segment:", error);
    }
  }, [newSegment, onAddSegment]);

  // Handle apply redactions
  const handleApply = useCallback(async () => {
    try {
      await onApplyRedactions(preserveOriginal);
      setShowApplyDialog(false);
    } catch (error) {
      console.error("Failed to apply redactions:", error);
    }
  }, [onApplyRedactions, preserveOriginal]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Redaction Editor</h3>
          <p className="text-sm text-muted-foreground">
            Select portions of the recording to redact
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAddingSegment(true)}
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Redaction
          </Button>
          {pendingSegments.length > 0 && (
            <Button
              onClick={() => setShowApplyDialog(true)}
              disabled={isLoading}
            >
              <Save className="w-4 h-4 mr-2" />
              Apply ({pendingSegments.length})
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <Label>Timeline</Label>
        <div
          ref={timelineRef}
          className="relative h-12 bg-muted rounded-lg cursor-crosshair overflow-hidden"
          onClick={handleTimelineClick}
        >
          {/* Time markers */}
          <div className="absolute inset-0 flex justify-between px-2 text-xs text-muted-foreground">
            <span>0:00</span>
            <span>{formatTime(duration / 4)}</span>
            <span>{formatTime(duration / 2)}</span>
            <span>{formatTime((duration * 3) / 4)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Applied redactions (red) */}
          {appliedSegments.map((segment) => (
            <div
              key={segment.id}
              className="absolute top-2 bottom-2 bg-red-500/50 border border-red-500 rounded"
              style={{
                left: `${(segment.startSeconds / duration) * 100}%`,
                width: `${((segment.endSeconds - segment.startSeconds) / duration) * 100}%`,
              }}
              title={`Applied: ${segment.reason}`}
            />
          ))}

          {/* Pending redactions (yellow) */}
          {pendingSegments.map((segment) => (
            <div
              key={segment.id}
              className="absolute top-2 bottom-2 bg-yellow-500/50 border border-yellow-500 rounded cursor-pointer hover:bg-yellow-500/70"
              style={{
                left: `${(segment.startSeconds / duration) * 100}%`,
                width: `${((segment.endSeconds - segment.startSeconds) / duration) * 100}%`,
              }}
              title={`Pending: ${segment.reason}`}
              onClick={(e) => {
                e.stopPropagation();
                // Select this segment for editing
              }}
            />
          ))}

          {/* New segment preview */}
          {isAddingSegment && (
            <div
              className="absolute top-2 bottom-2 bg-primary/30 border-2 border-primary border-dashed rounded"
              style={{
                left: `${(newSegment.startSeconds / duration) * 100}%`,
                width: `${((newSegment.endSeconds - newSegment.startSeconds) / duration) * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Segments List */}
      <div className="space-y-2">
        <Label>Redaction Segments</Label>
        {segments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <Scissors className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No redaction segments</p>
            <p className="text-sm">Click "Add Redaction" to create one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {segments.map((segment) => {
              const Icon = getRedactionTypeIcon(segment.type);

              return (
                <div
                  key={segment.id}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border",
                    segment.applied
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                      : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900",
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getRedactionTypeLabel(segment.type)}
                      </span>
                      {segment.applied ? (
                        <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded dark:bg-red-900 dark:text-red-100">
                          Applied
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded dark:bg-yellow-900 dark:text-yellow-100">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(segment.startSeconds)} -{" "}
                      {formatTime(segment.endSeconds)}
                      <span className="mx-2">|</span>
                      {segment.reason}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {onPreview && !segment.applied && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPreview(segment)}
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {!segment.applied && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveSegment(segment.id)}
                        title="Remove"
                      >
                        <Trash className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Segment Dialog */}
      <Dialog open={isAddingSegment} onOpenChange={setIsAddingSegment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Redaction Segment</DialogTitle>
            <DialogDescription>
              Define a portion of the recording to redact
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Redaction Type */}
            <div className="space-y-2">
              <Label>Redaction Type</Label>
              <Select
                value={newSegment.type}
                onValueChange={(value) =>
                  setNewSegment((prev) => ({
                    ...prev,
                    type: value as RedactionType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4" />
                      Mute Audio + Black Video
                    </div>
                  </SelectItem>
                  <SelectItem value="audio">
                    <div className="flex items-center gap-2">
                      <VolumeX className="w-4 h-4" />
                      Mute Audio Only
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <VideoOff className="w-4 h-4" />
                      Black Video Only
                    </div>
                  </SelectItem>
                  <SelectItem value="blur">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Blur Region
                    </div>
                  </SelectItem>
                  <SelectItem value="silence">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Silence (fade out)
                    </div>
                  </SelectItem>
                  <SelectItem value="beep">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Beep (censor tone)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  value={formatTime(newSegment.startSeconds)}
                  onChange={(e) =>
                    setNewSegment((prev) => ({
                      ...prev,
                      startSeconds: parseTime(e.target.value),
                    }))
                  }
                  placeholder="0:00.00"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  value={formatTime(newSegment.endSeconds)}
                  onChange={(e) =>
                    setNewSegment((prev) => ({
                      ...prev,
                      endSeconds: parseTime(e.target.value),
                    }))
                  }
                  placeholder="0:10.00"
                />
              </div>
            </div>

            {/* Duration Preview */}
            <div className="text-sm text-muted-foreground">
              Duration:{" "}
              {formatTime(newSegment.endSeconds - newSegment.startSeconds)}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason for Redaction</Label>
              <Textarea
                value={newSegment.reason}
                onChange={(e) =>
                  setNewSegment((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Describe why this content is being redacted..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingSegment(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSegment}
              disabled={!newSegment.reason.trim()}
            >
              Add Segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Redactions Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Redactions</DialogTitle>
            <DialogDescription>
              This will permanently modify the recording. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    {pendingSegments.length} segment(s) will be redacted
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Redacted content cannot be recovered once applied.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="preserveOriginal"
                checked={preserveOriginal}
                onChange={(e) => setPreserveOriginal(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="preserveOriginal">
                Keep a copy of the original recording
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleApply}
              disabled={isLoading}
            >
              {isLoading ? "Applying..." : "Apply Redactions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RedactionEditor;
