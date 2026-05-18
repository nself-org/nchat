"use client";

/**
 * Drafts Page - View and manage all drafts
 *
 * Full-page view for draft management
 */

import * as React from "react";
import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DraftList, DraftBadge, AutoSaveIndicator } from "@/components/drafts";
import { useDrafts, useDraftCount } from "@/hooks/useDrafts";
import { useDraftsStore } from "@/stores/drafts-store";
import type { Draft, DraftContextType } from "@/lib/drafts/draft-types";

// ============================================================================
// Context Name Resolver
// ============================================================================

/**
 * Resolve context name from type and ID
 * In a real app, this would look up channel/user names
 */
function resolveContextName(type: DraftContextType, id: string): string {
  switch (type) {
    case "channel":
      return `#${id}`;
    case "thread":
      return `Thread in ${id.slice(0, 8)}...`;
    case "dm":
      return `DM with ${id.slice(0, 8)}...`;
    default:
      return id;
  }
}

// ============================================================================
// Page Component
// ============================================================================

export default function DraftsPage() {
  const router = useRouter();
  const draftCount = useDraftCount();
  const { initialize, isInitialized } = useDrafts();
  const autoSaveEnabled = useDraftsStore((state) => state.autoSaveEnabled);
  const setAutoSaveEnabled = useDraftsStore(
    (state) => state.setAutoSaveEnabled,
  );

  // Initialize drafts store on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Handle draft selection (navigate to context)
  const handleSelect = useCallback(
    (draft: Draft) => {
      // Navigate to the appropriate context
      switch (draft.contextType) {
        case "channel":
          router.push(`/chat/${draft.contextId}`);
          break;
        case "thread":
          router.push(`/chat/thread/${draft.contextId}`);
          break;
        case "dm":
          router.push(`/chat/dm/${draft.contextId}`);
          break;
      }
    },
    [router],
  );

  // Handle draft restore (navigate and restore)
  const handleRestore = useCallback(
    (draft: Draft) => {
      handleSelect(draft);
    },
    [handleSelect],
  );

  // Handle draft send (would need to integrate with message sending)
  const handleSend = useCallback(
    async (draft: Draft) => {
      // In a real implementation, this would:
      // 1. Navigate to the context
      // 2. Populate the composer
      // 3. Trigger send
      // For now, just navigate
      handleSelect(draft);
    },
    [handleSelect],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Drafts</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your unsent messages
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <AutoSaveIndicator showLabel={true} />
            <DraftBadge count={draftCount} showZero />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="container px-4 py-6">
          {/* Settings panel */}
          <div className="bg-muted/30 mb-6 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Draft settings</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-save"
                    checked={autoSaveEnabled}
                    onCheckedChange={setAutoSaveEnabled}
                  />
                  <Label htmlFor="auto-save" className="text-sm">
                    Auto-save drafts
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Draft list */}
          <DraftList
            contextNameResolver={resolveContextName}
            showSearch
            showFilters
            showSort
            showClearAll
            onSelect={handleSelect}
            onRestore={handleRestore}
            onSend={handleSend}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container flex items-center justify-between px-4 text-sm text-muted-foreground">
          <p>
            Drafts are automatically saved as you type and persist across
            sessions.
          </p>
          <p>
            {draftCount === 0
              ? "No drafts"
              : `${draftCount} draft${draftCount !== 1 ? "s" : ""}`}
          </p>
        </div>
      </footer>
    </div>
  );
}
