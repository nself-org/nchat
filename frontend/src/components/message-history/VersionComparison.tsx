"use client";

import { useState, useMemo } from "react";
import { ArrowRight, ArrowLeftRight, Columns2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/lib/date";
import type { MessageVersion, ComparisonViewMode } from "@/lib/message-history";
import { calculateVersionDiff } from "@/lib/message-history";
import { EditDiff, SideBySideDiff, DiffStatsBar } from "./EditDiff";
import { VersionTimestamp } from "./EditTimestamp";

export interface VersionComparisonProps {
  /** All available versions */
  versions: MessageVersion[];
  /** Initial left version (older) */
  initialLeft?: MessageVersion;
  /** Initial right version (newer) */
  initialRight?: MessageVersion;
  /** View mode */
  viewMode?: ComparisonViewMode;
  /** Callback when versions change */
  onVersionsChange?: (left: MessageVersion, right: MessageVersion) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compare two versions of a message side by side or inline.
 * Allows selecting which versions to compare.
 */
export function VersionComparison({
  versions,
  initialLeft,
  initialRight,
  viewMode = "inline",
  onVersionsChange,
  className,
}: VersionComparisonProps) {
  const [leftVersion, setLeftVersion] = useState<MessageVersion>(
    initialLeft ?? versions[0],
  );
  const [rightVersion, setRightVersion] = useState<MessageVersion>(
    initialRight ?? versions[versions.length - 1],
  );
  const [mode, setMode] = useState<ComparisonViewMode>(viewMode);

  const diff = useMemo(() => {
    if (!leftVersion || !rightVersion) return null;
    return calculateVersionDiff(leftVersion, rightVersion);
  }, [leftVersion, rightVersion]);

  const handleLeftChange = (versionNumber: string) => {
    const version = versions.find(
      (v) => v.versionNumber === parseInt(versionNumber),
    );
    if (version) {
      setLeftVersion(version);
      onVersionsChange?.(version, rightVersion);
    }
  };

  const handleRightChange = (versionNumber: string) => {
    const version = versions.find(
      (v) => v.versionNumber === parseInt(versionNumber),
    );
    if (version) {
      setRightVersion(version);
      onVersionsChange?.(leftVersion, version);
    }
  };

  const swapVersions = () => {
    setLeftVersion(rightVersion);
    setRightVersion(leftVersion);
    onVersionsChange?.(rightVersion, leftVersion);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Version selectors */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <Select
            value={leftVersion.versionNumber.toString()}
            onValueChange={handleLeftChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem
                  key={v.id}
                  value={v.versionNumber.toString()}
                  disabled={v.id === rightVersion.id}
                >
                  <span className="flex items-center gap-2">
                    <span>v{v.versionNumber}</span>
                    {v.isOriginal && (
                      <Badge variant="outline" className="text-xs">
                        Original
                      </Badge>
                    )}
                    {v.isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={swapVersions}
          className="h-8 w-8"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To:</span>
          <Select
            value={rightVersion.versionNumber.toString()}
            onValueChange={handleRightChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem
                  key={v.id}
                  value={v.versionNumber.toString()}
                  disabled={v.id === leftVersion.id}
                >
                  <span className="flex items-center gap-2">
                    <span>v{v.versionNumber}</span>
                    {v.isOriginal && (
                      <Badge variant="outline" className="text-xs">
                        Original
                      </Badge>
                    )}
                    {v.isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={mode === "inline" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("inline")}
            className="h-7 px-2"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={mode === "side-by-side" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("side-by-side")}
            className="h-7 px-2"
          >
            <Columns2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Version info */}
      <div className="flex items-center gap-4 text-sm">
        <div>
          <VersionTimestamp
            versionNumber={leftVersion.versionNumber}
            createdAt={leftVersion.createdAt}
            isOriginal={leftVersion.isOriginal}
          />
          <p className="text-xs text-muted-foreground">
            by {leftVersion.editedBy.displayName}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div>
          <VersionTimestamp
            versionNumber={rightVersion.versionNumber}
            createdAt={rightVersion.createdAt}
            isCurrent={rightVersion.isCurrent}
          />
          <p className="text-xs text-muted-foreground">
            by {rightVersion.editedBy.displayName}
          </p>
        </div>
      </div>

      {/* Diff stats */}
      {diff && (
        <DiffStatsBar
          charsAdded={diff.charsAdded}
          charsRemoved={diff.charsRemoved}
        />
      )}

      {/* Comparison view */}
      {diff && mode === "inline" && <EditDiff diff={diff} showStats={false} />}

      {mode === "side-by-side" && (
        <SideBySideDiff
          oldText={leftVersion.content}
          newText={rightVersion.content}
          oldLabel={`Version ${leftVersion.versionNumber}`}
          newLabel={`Version ${rightVersion.versionNumber}`}
        />
      )}
    </div>
  );
}

/**
 * Quick comparison between current and original.
 */
export interface QuickComparisonProps {
  /** Original content */
  originalContent: string;
  /** Current content */
  currentContent: string;
  /** Original timestamp */
  originalAt: Date;
  /** Current timestamp */
  currentAt: Date;
  /** Additional CSS classes */
  className?: string;
}

export function QuickComparison({
  originalContent,
  currentContent,
  originalAt,
  currentAt,
  className,
}: QuickComparisonProps) {
  const [showDiff, setShowDiff] = useState(false);

  // Create mock versions for diff calculation
  const diff = useMemo(() => {
    const from: MessageVersion = {
      id: "original",
      messageId: "",
      versionNumber: 1,
      content: originalContent,
      createdAt: originalAt,
      editedBy: { id: "", username: "", displayName: "" },
      isOriginal: true,
      isCurrent: false,
    };
    const to: MessageVersion = {
      id: "current",
      messageId: "",
      versionNumber: 2,
      content: currentContent,
      createdAt: currentAt,
      editedBy: { id: "", username: "", displayName: "" },
      isOriginal: false,
      isCurrent: true,
    };
    return calculateVersionDiff(from, to);
  }, [originalContent, currentContent, originalAt, currentAt]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Changes</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDiff(!showDiff)}
          className="text-xs"
        >
          {showDiff ? "Hide diff" : "Show diff"}
        </Button>
      </div>

      <DiffStatsBar
        charsAdded={diff.charsAdded}
        charsRemoved={diff.charsRemoved}
      />

      {showDiff && <EditDiff diff={diff} showStats={false} />}
    </div>
  );
}

/**
 * Tabbed comparison view for multiple versions.
 */
export interface TabbedVersionViewProps {
  /** All versions */
  versions: MessageVersion[];
  /** Additional CSS classes */
  className?: string;
}

export function TabbedVersionView({
  versions,
  className,
}: TabbedVersionViewProps) {
  const sortedVersions = [...versions].sort(
    (a, b) => b.versionNumber - a.versionNumber,
  );

  return (
    <Tabs
      defaultValue={sortedVersions[0]?.versionNumber.toString()}
      className={className}
    >
      <TabsList className="w-full justify-start overflow-x-auto">
        {sortedVersions.map((version) => (
          <TabsTrigger
            key={version.id}
            value={version.versionNumber.toString()}
            className="flex items-center gap-2"
          >
            <span>v{version.versionNumber}</span>
            {version.isOriginal && (
              <Badge variant="outline" className="text-xs">
                Original
              </Badge>
            )}
            {version.isCurrent && (
              <Badge variant="default" className="text-xs">
                Current
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {sortedVersions.map((version) => (
        <TabsContent
          key={version.id}
          value={version.versionNumber.toString()}
          className="mt-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{version.editedBy.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMessageTime(version.createdAt)}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {version.content.length} characters
              </div>
            </div>
            <div className="bg-muted/30 rounded-md border p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {version.content}
              </pre>
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
