"use client";

import * as React from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

// ============================================================================
// Types
// ============================================================================

interface ChatLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  thread?: React.ReactNode;
  memberList?: React.ReactNode;
  showThread?: boolean;
  showMemberList?: boolean;
  className?: string;
}

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
        "before:absolute before:inset-y-0 before:-left-1 before:-right-1",
        className,
      )}
    >
      <div className="h-8 w-0.5 rounded-full bg-border opacity-0 transition-opacity group-hover:opacity-100" />
    </PanelResizeHandle>
  );
}

// ============================================================================
// Chat Layout Component
// ============================================================================

export function ChatLayout({
  sidebar,
  main,
  thread,
  memberList,
  showThread = false,
  showMemberList = false,
  className,
}: ChatLayoutProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  // Mobile layout - single panel at a time
  if (isMobile) {
    return <div className={cn("flex h-full w-full", className)}>{main}</div>;
  }

  // Tablet layout - sidebar + main, no thread/member list
  if (isTablet) {
    return (
      <div className={cn("flex h-full w-full", className)}>
        <PanelGroup direction="horizontal" autoSaveId="nchat-layout-tablet">
          <Panel
            defaultSize={25}
            minSize={20}
            maxSize={35}
            className="hidden md:block"
          >
            {sidebar}
          </Panel>
          <ResizeHandle />
          <Panel defaultSize={75} minSize={50}>
            {main}
          </Panel>
        </PanelGroup>
      </div>
    );
  }

  // Desktop layout - all panels
  return (
    <div className={cn("flex h-full w-full", className)}>
      <PanelGroup direction="horizontal" autoSaveId="nchat-layout-desktop">
        {/* Sidebar Panel */}
        <Panel
          defaultSize={18}
          minSize={15}
          maxSize={25}
          className="hidden lg:block"
        >
          {sidebar}
        </Panel>
        <ResizeHandle />

        {/* Main Content Panel */}
        <Panel
          defaultSize={showThread || showMemberList ? 50 : 82}
          minSize={40}
        >
          {main}
        </Panel>

        {/* Thread Panel */}
        {showThread && thread && (
          <>
            <ResizeHandle />
            <Panel defaultSize={32} minSize={25} maxSize={45}>
              {thread}
            </Panel>
          </>
        )}

        {/* Member List Panel */}
        {showMemberList && memberList && !showThread && (
          <>
            <ResizeHandle />
            <Panel defaultSize={20} minSize={15} maxSize={30}>
              {memberList}
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}

// ============================================================================
// Chat Layout Context - For managing panel visibility
// ============================================================================

interface ChatLayoutContextType {
  showThread: boolean;
  setShowThread: (show: boolean) => void;
  showMemberList: boolean;
  setShowMemberList: (show: boolean) => void;
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  activeThreadMessageId: string | null;
  setActiveThreadMessageId: (id: string | null) => void;
}

const ChatLayoutContext = React.createContext<
  ChatLayoutContextType | undefined
>(undefined);

export function ChatLayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showThread, setShowThread] = React.useState(false);
  const [showMemberList, setShowMemberList] = React.useState(false);
  const [showSidebar, setShowSidebar] = React.useState(true);
  const [activeThreadMessageId, setActiveThreadMessageId] = React.useState<
    string | null
  >(null);

  const value = React.useMemo(
    () => ({
      showThread,
      setShowThread,
      showMemberList,
      setShowMemberList,
      showSidebar,
      setShowSidebar,
      activeThreadMessageId,
      setActiveThreadMessageId,
    }),
    [showThread, showMemberList, showSidebar, activeThreadMessageId],
  );

  return (
    <ChatLayoutContext.Provider value={value}>
      {children}
    </ChatLayoutContext.Provider>
  );
}

export function useChatLayout() {
  const context = React.useContext(ChatLayoutContext);
  if (context === undefined) {
    throw new Error("useChatLayout must be used within a ChatLayoutProvider");
  }
  return context;
}

// ============================================================================
// Exported Sub-components
// ============================================================================

export { ResizeHandle };
