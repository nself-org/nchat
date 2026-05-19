"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { DevModeBanner } from "@/components/dev-mode-banner";
import { ChatLayoutProvider } from "@/components/layout/chat-layout";
import { CallInvitation } from "@/components/calls/CallInvitation";
import { VideoCallModal } from "@/components/calls/VideoCallModal";
import {
  useCallStore,
  selectHasIncomingCall,
  selectIsInCall,
  selectIncomingCalls,
} from "@/stores/call-store";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CallInvitation as CallInvitationType } from "@/lib/calls/call-invitation";

// ============================================================================
// Resize Handle Component
// ============================================================================

function ResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle
      className={cn(
        "relative flex w-1 items-center justify-center bg-transparent",
        "hover:bg-primary/20 active:bg-primary/30",
        "transition-colors duration-150",
        "group",
        className,
      )}
    >
      <div className="h-8 w-0.5 rounded-full bg-border opacity-0 transition-opacity group-hover:opacity-100" />
    </PanelResizeHandle>
  );
}

// ============================================================================
// Mobile Sidebar Overlay
// ============================================================================

function MobileSidebarOverlay({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        role="button"
        tabIndex={0}
        aria-label="Close sidebar"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 duration-200 animate-in slide-in-from-left lg:hidden">
        {children}
      </div>
    </>
  );
}

// ============================================================================
// Chat Layout Component
// ============================================================================

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Call state
  const hasIncomingCall = useCallStore(selectHasIncomingCall);
  const isInCall = useCallStore(selectIsInCall);
  const incomingCalls = useCallStore(selectIncomingCalls);
  const acceptCall = useCallStore((s) => s.acceptCall);
  const declineCall = useCallStore((s) => s.declineCall);

  // Convert the first IncomingCall (store type) to the CallInvitation type
  // expected by the CallInvitation component. The store uses ISO strings for
  // dates; the component expects Date objects.
  const activeInvitation = useMemo<CallInvitationType | null>(() => {
    const first = incomingCalls[0];
    if (!first) return null;

    const receivedAt = new Date(first.receivedAt);
    // Timeout after 30 seconds from when the invite was received
    const expiresAt = new Date(receivedAt.getTime() + 30_000);

    return {
      id: first.id,
      callerId: first.callerId,
      callerName: first.callerName,
      callerAvatarUrl: first.callerAvatarUrl,
      type: first.type,
      channelId: first.channelId,
      receivedAt,
      expiresAt,
      status: "pending",
    };
  }, [incomingCalls]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [children]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ChatLayoutProvider>
      <div className="flex h-screen flex-col bg-background">
        {/* Dev Mode Banner */}
        <DevModeBanner />

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Mobile: Sidebar as overlay */}
          {isMobile ? (
            <>
              {/* Mobile Header with Menu Button */}
              <div className="flex h-14 items-center border-b px-4 lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  className="mr-2"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
                <h1 className="text-lg font-semibold">nchat</h1>
              </div>

              {/* Mobile Sidebar Overlay */}
              <MobileSidebarOverlay
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
              >
                <div className="relative h-full">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                    className="absolute right-2 top-4 z-10"
                    aria-label="Close sidebar"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Button>
                  <Sidebar />
                </div>
              </MobileSidebarOverlay>

              {/* Mobile Main Content */}
              <main className="flex flex-1 flex-col overflow-hidden">
                {children}
              </main>
            </>
          ) : (
            /* Desktop: Resizable panels */
            <PanelGroup
              direction="horizontal"
              autoSaveId="nchat-layout"
              className="h-full"
            >
              {/* Sidebar Panel */}
              <Panel
                id="sidebar"
                defaultSize={18}
                minSize={15}
                maxSize={25}
                order={1}
              >
                <Sidebar />
              </Panel>

              {/* Resize Handle */}
              <ResizeHandle />

              {/* Main Content Panel */}
              <Panel id="main" defaultSize={82} minSize={50} order={2}>
                <main className="flex h-full flex-col overflow-hidden">
                  {children}
                </main>
              </Panel>
            </PanelGroup>
          )}
        </div>

        {/* Call Invitation Overlay — shown when there is an incoming call */}
        {hasIncomingCall && activeInvitation && (
          <CallInvitation
            invitation={activeInvitation}
            onAccept={() => acceptCall(activeInvitation.id)}
            onDecline={() => declineCall(activeInvitation.id)}
          />
        )}

        {/* Video Call Modal */}
        {isInCall && (
          <VideoCallModal
            userId={user.id}
            userName={user.displayName || user.username || "User"}
            userAvatarUrl={user.avatarUrl}
          />
        )}
      </div>
    </ChatLayoutProvider>
  );
}
