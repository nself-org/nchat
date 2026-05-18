"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  UserProfile,
  type Channel,
  type SharedFile,
  type ActivityItem,
} from "@/components/users/UserProfile";
import { type ExtendedUserProfile } from "@/components/users/UserCard";
import { useUserDirectoryStore } from "@/stores/user-directory-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import { logger } from "@/lib/logger";

// ============================================================================
// Mock Data for Development
// ============================================================================

const MOCK_USER: ExtendedUserProfile = {
  id: "1",
  email: "owner@nself.org",
  username: "owner",
  displayName: "Sarah Owner",
  avatarUrl: undefined,
  coverUrl: undefined,
  bio: "Founder and CEO of nself. Passionate about building great teams and products. Previously founded two startups and worked at Google. I love hiking, photography, and spending time with my family.",
  location: "San Francisco, CA",
  website: "https://sarahowner.com",
  pronouns: "she/her",
  role: "owner",
  presence: "online",
  createdAt: new Date("2024-01-01"),
  title: "CEO & Founder",
  department: "Executive",
  team: "Leadership",
  timezone: "America/Los_Angeles",
  phone: "+1 (415) 555-0123",
  badges: [
    {
      id: "1",
      name: "Founder",
      description: "Original founder of the workspace",
      color: "#F59E0B",
    },
    {
      id: "2",
      name: "Verified",
      description: "Verified account",
      color: "#3B82F6",
    },
    {
      id: "3",
      name: "Top Contributor",
      description: "Most active member this month",
      color: "#22C55E",
    },
  ],
  socialLinks: [
    { platform: "Twitter", url: "https://twitter.com/sarahowner" },
    { platform: "LinkedIn", url: "https://linkedin.com/in/sarahowner" },
    { platform: "GitHub", url: "https://github.com/sarahowner" },
  ],
};

const MOCK_SHARED_CHANNELS: Channel[] = [
  {
    id: "1",
    name: "general",
    description: "General discussion",
    memberCount: 150,
  },
  {
    id: "2",
    name: "announcements",
    description: "Important updates",
    memberCount: 150,
  },
  {
    id: "3",
    name: "engineering",
    description: "Engineering team chat",
    memberCount: 45,
    isPrivate: true,
  },
  {
    id: "4",
    name: "design",
    description: "Design discussions",
    memberCount: 20,
  },
];

const MOCK_SHARED_FILES: SharedFile[] = [
  {
    id: "1",
    name: "Q4-roadmap.pdf",
    type: "application/pdf",
    size: 2500000,
    uploadedAt: new Date("2024-03-01"),
    url: "#",
  },
  {
    id: "2",
    name: "team-photo.jpg",
    type: "image/jpeg",
    size: 1500000,
    uploadedAt: new Date("2024-02-28"),
    url: "https://via.placeholder.com/400x300",
  },
  {
    id: "3",
    name: "meeting-notes.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 50000,
    uploadedAt: new Date("2024-02-25"),
    url: "#",
  },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    type: "message",
    description: "Posted a message in",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    channelName: "general",
    channelId: "1",
  },
  {
    id: "2",
    type: "reaction",
    description: "Reacted to a message",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    channelName: "engineering",
    channelId: "3",
  },
  {
    id: "3",
    type: "file",
    description: "Shared a file",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    channelName: "announcements",
    channelId: "2",
  },
  {
    id: "4",
    type: "status_change",
    description: 'Changed status to "In a meeting"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
];

// ============================================================================
// Page Component
// ============================================================================

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState<ExtendedUserProfile | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [sharedChannels, setSharedChannels] = useState<Channel[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const {
    setLoadingProfile,
    viewProfile,
    addBlockedUser,
    removeBlockedUser,
    isUserBlocked,
    addContact,
    removeContact,
    isUserContact,
  } = useUserDirectoryStore();

  const isOwnProfile = currentUser?.id === userId;

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setLoadingProfile(true);
      viewProfile(userId);

      try {
        // In development, use mock data
        // In production, this would fetch from the API
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate loading

        // Use mock data - in production, fetch based on userId
        setProfileUser({ ...MOCK_USER, id: userId });
        setSharedChannels(MOCK_SHARED_CHANNELS);
        setSharedFiles(MOCK_SHARED_FILES);
        setRecentActivity(MOCK_ACTIVITY);
      } catch (err) {
        logger.error("Failed to load profile:", err);
        setProfileUser(null);
      } finally {
        setIsLoading(false);
        setLoadingProfile(false);
      }
    };

    loadProfile();

    return () => {
      viewProfile(null);
    };
  }, [userId, setLoadingProfile, viewProfile]);

  // Handle message
  const handleMessage = () => {};

  // Handle call
  const handleCall = () => {};

  // Handle block
  const handleBlock = () => {
    if (!profileUser) return;

    if (isUserBlocked(profileUser.id)) {
      removeBlockedUser(profileUser.id);
    } else {
      addBlockedUser({
        userId: profileUser.id,
        blockedAt: new Date(),
      });
    }
  };

  // Handle report
  const handleReport = () => {};

  // Handle edit profile
  const handleEditProfile = () => {
    router.push("/profile/edit");
  };

  // Handle channel click
  const handleChannelClick = (channel: Channel) => {
    router.push(`/chat/channel/${channel.name}`);
  };

  // Handle file click
  const handleFileClick = (file: SharedFile) => {};

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header with back button */}
      <header className="flex-shrink-0 border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {isOwnProfile ? "Your Profile" : "Profile"}
            </h1>
          </div>
        </div>
      </header>

      {/* Profile content */}
      <UserProfile
        user={profileUser}
        isLoading={isLoading}
        isOwnProfile={isOwnProfile}
        sharedChannels={isOwnProfile ? [] : sharedChannels}
        sharedFiles={isOwnProfile ? [] : sharedFiles}
        recentActivity={recentActivity}
        onMessage={handleMessage}
        onCall={handleCall}
        onBlock={handleBlock}
        onReport={handleReport}
        onEditProfile={handleEditProfile}
        onChannelClick={handleChannelClick}
        onFileClick={handleFileClick}
      />
    </div>
  );
}
