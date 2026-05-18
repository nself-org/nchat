/**
 * Conflict Dialog Component
 *
 * Shows conflicts to users and allows manual resolution.
 * Displays side-by-side diff and resolution options.
 *
 * @module components/sync/ConflictDialog
 * @version 1.0.0
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Check, X, GitMerge } from "lucide-react";
import type {
  ConflictDetectionResult,
  ConflictSeverity,
  ResolutionStrategy,
} from "@/services/realtime/conflict-resolution.service";

// ============================================================================
// Types
// ============================================================================

export interface ConflictDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Conflict detection result */
  conflict: ConflictDetectionResult;
  /** Resolution handler */
  onResolve: (strategy: ResolutionStrategy, customData?: unknown) => void;
  /** Show custom resolution option */
  allowCustomResolution?: boolean;
}

// ============================================================================
// Severity Colors
// ============================================================================

const SEVERITY_COLORS: Record<ConflictSeverity, string> = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const SEVERITY_LABELS: Record<ConflictSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

// ============================================================================
// Component
// ============================================================================

export function ConflictDialog({
  open,
  onClose,
  conflict,
  onResolve,
  allowCustomResolution = false,
}: ConflictDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy>(
    conflict.suggestedStrategy,
  );
  const [customData, setCustomData] = useState<unknown>(null);

  /**
   * Handle resolution
   */
  const handleResolve = () => {
    onResolve(selectedStrategy, customData);
    onClose();
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    onClose();
  };

  /**
   * Get conflict type label
   */
  const getTypeLabel = () => {
    switch (conflict.conflictType) {
      case "message:edit":
        return "Message Edit";
      case "message:delete":
        return "Message Deletion";
      case "channel:settings":
        return "Channel Settings";
      case "user:settings":
        return "User Settings";
      case "file:upload":
        return "File Upload";
      case "thread:reply":
        return "Thread Reply";
      default:
        return "Unknown";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Sync Conflict Detected
          </DialogTitle>
          <DialogDescription>
            Changes were made on multiple devices. Please choose how to resolve
            this conflict.
          </DialogDescription>
        </DialogHeader>

        {/* Conflict Info */}
        <div className="space-y-4">
          {/* Type and Severity */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{getTypeLabel()}</Badge>
            <Badge className={SEVERITY_COLORS[conflict.severity]}>
              {SEVERITY_LABELS[conflict.severity]}
            </Badge>
          </div>

          {/* Reason */}
          {conflict.reason && (
            <Alert>
              <AlertDescription>{conflict.reason}</AlertDescription>
            </Alert>
          )}

          {/* Data Comparison */}
          <Tabs defaultValue="local" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="local">Your Changes (Local)</TabsTrigger>
              <TabsTrigger value="remote">Server Version (Remote)</TabsTrigger>
            </TabsList>

            <TabsContent value="local">
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <pre className="text-sm">
                  {JSON.stringify(conflict.entity.localData, null, 2)}
                </pre>
              </ScrollArea>
              <div className="mt-2 text-sm text-muted-foreground">
                Last modified:{" "}
                {new Date(conflict.entity.localTimestamp).toLocaleString()}
                {conflict.entity.localVersion &&
                  ` • Version: ${conflict.entity.localVersion}`}
              </div>
            </TabsContent>

            <TabsContent value="remote">
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <pre className="text-sm">
                  {JSON.stringify(conflict.entity.remoteData, null, 2)}
                </pre>
              </ScrollArea>
              <div className="mt-2 text-sm text-muted-foreground">
                Last modified:{" "}
                {new Date(conflict.entity.remoteTimestamp).toLocaleString()}
                {conflict.entity.remoteVersion &&
                  ` • Version: ${conflict.entity.remoteVersion}`}
              </div>
            </TabsContent>
          </Tabs>

          {/* Resolution Strategy Selection */}
          <div className="space-y-3">
            <span className="text-sm font-medium">Resolution Strategy:</span>

            <div className="grid gap-2">
              {/* Server Wins */}
              <Button
                variant={
                  selectedStrategy === "server-wins" ? "default" : "outline"
                }
                className="justify-start"
                onClick={() => setSelectedStrategy("server-wins")}
              >
                <Check className="mr-2 h-4 w-4" />
                Use Server Version
                <span className="ml-auto text-xs text-muted-foreground">
                  {conflict.suggestedStrategy === "server-wins" &&
                    "(Recommended)"}
                </span>
              </Button>

              {/* Client Wins */}
              <Button
                variant={
                  selectedStrategy === "client-wins" ? "default" : "outline"
                }
                className="justify-start"
                onClick={() => setSelectedStrategy("client-wins")}
              >
                <Check className="mr-2 h-4 w-4" />
                Use Your Changes (Local)
                <span className="ml-auto text-xs text-muted-foreground">
                  {conflict.suggestedStrategy === "client-wins" &&
                    "(Recommended)"}
                </span>
              </Button>

              {/* Last Write Wins */}
              <Button
                variant={
                  selectedStrategy === "last-write-wins" ? "default" : "outline"
                }
                className="justify-start"
                onClick={() => setSelectedStrategy("last-write-wins")}
              >
                <Check className="mr-2 h-4 w-4" />
                Use Most Recent
                <span className="ml-auto text-xs text-muted-foreground">
                  {conflict.suggestedStrategy === "last-write-wins" &&
                    "(Recommended)"}
                </span>
              </Button>

              {/* Merge */}
              {conflict.conflictType === "user:settings" && (
                <Button
                  variant={selectedStrategy === "merge" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedStrategy("merge")}
                >
                  <GitMerge className="mr-2 h-4 w-4" />
                  Merge Both Versions
                  <span className="ml-auto text-xs text-muted-foreground">
                    {conflict.suggestedStrategy === "merge" && "(Recommended)"}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Warning for critical conflicts */}
          {conflict.severity === "critical" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is a critical conflict. Please review carefully before
                resolving.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleResolve}>
            <Check className="mr-2 h-4 w-4" />
            Resolve Conflict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictDialog;
