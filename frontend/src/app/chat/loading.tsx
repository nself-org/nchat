import { SidebarSkeleton } from "@/components/loading/sidebar-skeleton";
import { ChatSkeleton } from "@/components/loading/chat-skeleton";

/**
 * Chat page loading skeleton
 * Shows sidebar and chat area skeletons
 */
export default function ChatLoading() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <SidebarSkeleton />

      {/* Main chat area skeleton */}
      <div className="flex-1">
        <ChatSkeleton
          showHeader
          showInput
          showMemberPanel={false}
          messageCount={8}
        />
      </div>
    </div>
  );
}
