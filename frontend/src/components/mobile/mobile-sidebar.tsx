"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import {
  Hash,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  Users,
  Bell,
  Moon,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMobileStore } from "@/lib/mobile/mobile-store";
import { useSafeArea } from "@/lib/mobile/use-viewport";
import { useSwipe } from "@/lib/mobile/use-swipe";

// ============================================================================
// Types
// ============================================================================

export interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "dm";
  unreadCount?: number;
  isActive?: boolean;
  avatar?: string;
}

export interface ChannelSection {
  id: string;
  title: string;
  channels: Channel[];
  isCollapsed?: boolean;
}

export interface MobileSidebarProps {
  sections?: ChannelSection[];
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: "online" | "away" | "busy" | "offline";
  };
  onChannelSelect?: (channel: Channel) => void;
  onCreateChannel?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SIDEBAR_WIDTH = 280;
const SWIPE_THRESHOLD = 100;

// ============================================================================
// Component
// ============================================================================

/**
 * Mobile slide-out sidebar with channels and user info
 * Supports swipe to close gesture
 */
export const MobileSidebar = memo(function MobileSidebar({
  sections = [],
  user,
  onChannelSelect,
  onCreateChannel,
  onSettings,
  onLogout,
  className,
}: MobileSidebarProps) {
  const { sidebarOpen, closeSidebar } = useMobileStore();
  const safeArea = useSafeArea();
  const controls = useAnimation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle swipe gesture
  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < 0) {
        controls.set({ x: info.offset.x });
      }
    },
    [controls],
  );

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) {
        closeSidebar();
      } else {
        controls.start({ x: 0 });
      }
    },
    [controls, closeSidebar],
  );

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) {
        closeSidebar();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen, closeSidebar]);

  // Prevent body scroll when open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Sidebar */}
          <motion.div
            ref={sidebarRef}
            initial={{ x: -SIDEBAR_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: -SIDEBAR_WIDTH }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="x"
            dragConstraints={{ left: -SIDEBAR_WIDTH, right: 0 }}
            dragElastic={0.1}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 top-0 z-50",
              "flex flex-col",
              "bg-background",
              "shadow-2xl",
              className,
            )}
            style={{
              width: SIDEBAR_WIDTH,
              paddingTop: safeArea.top,
              paddingBottom: safeArea.bottom,
            }}
          >
            {/* Header with user info */}
            <SidebarHeader user={user} onClose={closeSidebar} />

            {/* Channel list */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {sections.map((section) => (
                  <SidebarSection
                    key={section.id}
                    section={section}
                    onChannelSelect={(channel) => {
                      onChannelSelect?.(channel);
                      closeSidebar();
                    }}
                    onCreateChannel={onCreateChannel}
                  />
                ))}

                {sections.length === 0 && (
                  <EmptySidebar onCreateChannel={onCreateChannel} />
                )}
              </div>
            </ScrollArea>

            {/* Footer with settings */}
            <SidebarFooter onSettings={onSettings} onLogout={onLogout} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// Sub-components
// ============================================================================

interface SidebarHeaderProps {
  user?: MobileSidebarProps["user"];
  onClose: () => void;
}

const SidebarHeader = memo(function SidebarHeader({
  user,
  onClose,
}: SidebarHeaderProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      default:
        return "bg-muted-foreground";
    }
  };

  return (
    <div className="flex items-center justify-between border-b p-4">
      {user ? (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "absolute bottom-0 right-0",
                "h-3 w-3 rounded-full border-2 border-background",
                getStatusColor(user.status),
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
      ) : (
        <span className="font-semibold">Channels</span>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-8 w-8 shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
});

interface SidebarSectionProps {
  section: ChannelSection;
  onChannelSelect: (channel: Channel) => void;
  onCreateChannel?: () => void;
}

const SidebarSection = memo(function SidebarSection({
  section,
  onChannelSelect,
  onCreateChannel,
}: SidebarSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(section.isCollapsed ?? false);

  return (
    <div className="mb-2">
      {/* Section header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <div className="flex items-center gap-1">
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <span>{section.title}</span>
        </div>
        {onCreateChannel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onCreateChannel();
            }}
            className="h-5 w-5 opacity-0 group-hover:opacity-100"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </button>

      {/* Channel list */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {section.channels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                onClick={() => onChannelSelect(channel)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface ChannelItemProps {
  channel: Channel;
  onClick: () => void;
}

const ChannelItem = memo(function ChannelItem({
  channel,
  onClick,
}: ChannelItemProps) {
  const Icon = channel.type === "private" ? Lock : Hash;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2",
        "text-sm transition-colors",
        "touch-manipulation",
        channel.isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {channel.type === "dm" ? (
        <Avatar className="h-5 w-5">
          <AvatarImage src={channel.avatar} />
          <AvatarFallback className="text-[10px]">
            {channel.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1 truncate text-left">{channel.name}</span>
      {channel.unreadCount && channel.unreadCount > 0 && (
        <span className="text-primary-foreground flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold">
          {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
        </span>
      )}
    </button>
  );
});

interface SidebarFooterProps {
  onSettings?: () => void;
  onLogout?: () => void;
}

const SidebarFooter = memo(function SidebarFooter({
  onSettings,
  onLogout,
}: SidebarFooterProps) {
  return (
    <div className="border-t p-2">
      <div className="flex items-center justify-around">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettings}
          className="h-10 w-10"
        >
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Moon className="h-5 w-5" />
        </Button>
        {onLogout && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="h-10 w-10 text-destructive hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
});

interface EmptySidebarProps {
  onCreateChannel?: () => void;
}

const EmptySidebar = memo(function EmptySidebar({
  onCreateChannel,
}: EmptySidebarProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Hash className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 font-semibold">No channels yet</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Create a channel to get started
      </p>
      {onCreateChannel && (
        <Button onClick={onCreateChannel} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Create Channel
        </Button>
      )}
    </div>
  );
});

export default MobileSidebar;
