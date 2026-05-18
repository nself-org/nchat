"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { UserDirectory } from "@/components/users";
import { type ExtendedUserProfile } from "@/components/users/UserCard";
import { useUserDirectoryStore } from "@/stores/user-directory-store";
import { useUserStore } from "@/stores/user-store";
import {
  extractDepartments,
  extractTeams,
  extractLocations,
} from "@/lib/users/user-directory";

// ============================================================================
// Mock Data for Development
// ============================================================================

const MOCK_USERS: ExtendedUserProfile[] = [
  {
    id: "1",
    email: "owner@nself.org",
    username: "owner",
    displayName: "Sarah Owner",
    avatarUrl: undefined,
    coverUrl: undefined,
    bio: "Founder and CEO. Passionate about building great teams and products.",
    location: "San Francisco, CA",
    website: "https://example.com",
    pronouns: "she/her",
    role: "owner",
    presence: "online",
    createdAt: new Date("2024-01-01"),
    title: "CEO & Founder",
    department: "Executive",
    team: "Leadership",
    timezone: "America/Los_Angeles",
  },
  {
    id: "2",
    email: "admin@nself.org",
    username: "admin",
    displayName: "Mike Admin",
    avatarUrl: undefined,
    coverUrl: undefined,
    bio: "System administrator keeping things running smoothly.",
    location: "New York, NY",
    pronouns: "he/him",
    role: "admin",
    presence: "online",
    createdAt: new Date("2024-01-15"),
    title: "System Administrator",
    department: "IT",
    team: "Infrastructure",
    timezone: "America/New_York",
  },
  {
    id: "3",
    email: "moderator@nself.org",
    username: "moderator",
    displayName: "Alex Moderator",
    avatarUrl: undefined,
    bio: "Community manager and moderator.",
    role: "moderator",
    presence: "away",
    createdAt: new Date("2024-02-01"),
    title: "Community Manager",
    department: "Support",
    team: "Community",
    location: "Austin, TX",
    timezone: "America/Chicago",
  },
  {
    id: "4",
    email: "member@nself.org",
    username: "member",
    displayName: "Jordan Member",
    avatarUrl: undefined,
    role: "member",
    presence: "dnd",
    createdAt: new Date("2024-02-15"),
    customStatus: {
      emoji: "🎧",
      text: "In a meeting",
    },
    title: "Software Engineer",
    department: "Engineering",
    team: "Platform",
    location: "Seattle, WA",
    timezone: "America/Los_Angeles",
  },
  {
    id: "5",
    email: "guest@nself.org",
    username: "guest",
    displayName: "Guest User",
    avatarUrl: undefined,
    role: "guest",
    presence: "offline",
    createdAt: new Date("2024-03-01"),
    lastSeenAt: new Date("2024-03-10"),
  },
  {
    id: "6",
    email: "alice@nself.org",
    username: "alice",
    displayName: "Alice Johnson",
    avatarUrl: undefined,
    bio: "Product designer with a passion for user experience.",
    role: "member",
    presence: "online",
    createdAt: new Date("2024-02-20"),
    title: "Senior Product Designer",
    department: "Design",
    team: "UX",
    location: "Los Angeles, CA",
    timezone: "America/Los_Angeles",
    pronouns: "she/her",
  },
  {
    id: "7",
    email: "bob@nself.org",
    username: "bob",
    displayName: "Bob Smith",
    avatarUrl: undefined,
    bio: "Backend developer specializing in distributed systems.",
    role: "member",
    presence: "online",
    createdAt: new Date("2024-02-25"),
    title: "Senior Backend Engineer",
    department: "Engineering",
    team: "Backend",
    location: "Denver, CO",
    timezone: "America/Denver",
    pronouns: "he/him",
  },
  {
    id: "8",
    email: "charlie@nself.org",
    username: "charlie",
    displayName: "Charlie Brown",
    avatarUrl: undefined,
    bio: "DevOps engineer and cloud infrastructure specialist.",
    role: "member",
    presence: "away",
    createdAt: new Date("2024-03-05"),
    title: "DevOps Engineer",
    department: "IT",
    team: "Infrastructure",
    location: "Chicago, IL",
    timezone: "America/Chicago",
  },
];

// ============================================================================
// Page Component
// ============================================================================

export default function PeoplePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<ExtendedUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setLoadingDirectory, setDirectoryError } = useUserDirectoryStore();

  // Load users on mount
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      setLoadingDirectory(true);
      setError(null);
      setDirectoryError(null);

      try {
        // In development, use mock data
        // In production, this would fetch from the API
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate loading
        setUsers(MOCK_USERS);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load users";
        setError(message);
        setDirectoryError(message);
      } finally {
        setIsLoading(false);
        setLoadingDirectory(false);
      }
    };

    loadUsers();
  }, [setLoadingDirectory, setDirectoryError]);

  // Extract filter options from users
  const departments = useMemo(() => extractDepartments(users), [users]);
  const teams = useMemo(() => extractTeams(users), [users]);
  const locations = useMemo(() => extractLocations(users), [users]);

  // Handle user click - navigate to profile
  const handleUserClick = (clickedUser: ExtendedUserProfile) => {
    router.push(`/people/${clickedUser.id}`);
  };

  // Handle message - would open DM
  const handleMessage = (targetUser: ExtendedUserProfile) => {};

  // Handle call - placeholder
  const handleCall = (targetUser: ExtendedUserProfile) => {};

  // Handle refresh
  const handleRefresh = () => {
    // Reload users
    setUsers([...MOCK_USERS]);
  };

  // Handle invite
  const handleInvite = () => {};

  return (
    <div className="flex h-screen flex-col bg-background">
      <UserDirectory
        users={users}
        departments={departments}
        teams={teams}
        locations={locations}
        isLoading={isLoading}
        error={error}
        onUserClick={handleUserClick}
        onMessage={handleMessage}
        onCall={handleCall}
        onRefresh={handleRefresh}
        onInvite={
          user?.role === "owner" || user?.role === "admin"
            ? handleInvite
            : undefined
        }
        title="People"
        description="Browse and connect with team members"
      />
    </div>
  );
}
