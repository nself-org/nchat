"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type ExtendedUserProfile } from "./UserCard";
import { UserProfileHeader } from "./UserProfileHeader";
import { UserProfileAbout } from "./UserProfileAbout";
import { UserProfileActivity } from "./UserProfileActivity";
import { UserProfileChannels } from "./UserProfileChannels";
import { UserProfileFiles } from "./UserProfileFiles";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Activity, Hash, FileText } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface Channel {
  id: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
  memberCount?: number;
}

export interface SharedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  url: string;
}

export interface ActivityItem {
  id: string;
  type: "message" | "reaction" | "file" | "channel_join" | "status_change";
  description: string;
  timestamp: Date;
  channelName?: string;
  channelId?: string;
}

export interface UserProfileProps extends React.HTMLAttributes<HTMLDivElement> {
  user: ExtendedUserProfile | null;
  isLoading?: boolean;
  isOwnProfile?: boolean;
  sharedChannels?: Channel[];
  sharedFiles?: SharedFile[];
  recentActivity?: ActivityItem[];
  onMessage?: () => void;
  onCall?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
  onEditProfile?: () => void;
  onChannelClick?: (channel: Channel) => void;
  onFileClick?: (file: SharedFile) => void;
}

// ============================================================================
// Component
// ============================================================================

const UserProfile = React.forwardRef<HTMLDivElement, UserProfileProps>(
  (
    {
      className,
      user,
      isLoading = false,
      isOwnProfile = false,
      sharedChannels = [],
      sharedFiles = [],
      recentActivity = [],
      onMessage,
      onCall,
      onBlock,
      onReport,
      onEditProfile,
      onChannelClick,
      onFileClick,
      ...props
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = React.useState("about");

    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn("flex h-full flex-col", className)}
          {...props}
        >
          {/* Header skeleton */}
          <div className="relative">
            <Skeleton className="h-32 w-full" />
            <div className="-mt-12 px-6 pb-4">
              <div className="flex items-end gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="flex-1 pb-2">
                  <Skeleton className="mb-2 h-6 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="flex-1 space-y-4 p-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex h-full flex-col items-center justify-center p-6 text-center",
            className,
          )}
          {...props}
        >
          <User className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">User not found</h3>
          <p className="text-sm text-muted-foreground">
            The user you are looking for does not exist or has been removed.
          </p>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("flex h-full flex-col", className)}
        {...props}
      >
        {/* Profile header */}
        <UserProfileHeader
          user={user}
          isOwnProfile={isOwnProfile}
          onMessage={onMessage}
          onCall={onCall}
          onBlock={onBlock}
          onReport={onReport}
          onEditProfile={onEditProfile}
        />

        {/* Tabbed content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-1 flex-col"
        >
          <div className="border-b px-6">
            <TabsList className="h-auto w-full justify-start bg-transparent p-0">
              <TabsTrigger
                value="about"
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <User className="mr-2 h-4 w-4" />
                About
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Activity className="mr-2 h-4 w-4" />
                Activity
              </TabsTrigger>
              {!isOwnProfile && sharedChannels.length > 0 && (
                <TabsTrigger
                  value="channels"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Hash className="mr-2 h-4 w-4" />
                  Channels ({sharedChannels.length})
                </TabsTrigger>
              )}
              {!isOwnProfile && sharedFiles.length > 0 && (
                <TabsTrigger
                  value="files"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Files ({sharedFiles.length})
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <TabsContent value="about" className="m-0">
              <UserProfileAbout user={user} />
            </TabsContent>

            <TabsContent value="activity" className="m-0">
              <UserProfileActivity
                activities={recentActivity}
                onChannelClick={onChannelClick}
              />
            </TabsContent>

            {!isOwnProfile && (
              <TabsContent value="channels" className="m-0">
                <UserProfileChannels
                  channels={sharedChannels}
                  onChannelClick={onChannelClick}
                />
              </TabsContent>
            )}

            {!isOwnProfile && (
              <TabsContent value="files" className="m-0">
                <UserProfileFiles
                  files={sharedFiles}
                  onFileClick={onFileClick}
                />
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>
      </div>
    );
  },
);
UserProfile.displayName = "UserProfile";

export { UserProfile };
