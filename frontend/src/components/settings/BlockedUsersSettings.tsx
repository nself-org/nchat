"use client";

import { useState } from "react";
import { SettingsSection } from "./settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSettingsStore } from "@/stores/settings-store";
import { UserX, Search, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BlockedUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  blockedAt: Date;
}

interface BlockedUsersSettingsProps {
  className?: string;
}

// Mock blocked users
const mockBlockedUsers: BlockedUser[] = [
  {
    id: "1",
    name: "John Doe",
    username: "johndoe",
    blockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
  },
  {
    id: "2",
    name: "Jane Smith",
    username: "janesmith",
    avatar: "/avatars/jane.jpg",
    blockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
  },
];

/**
 * BlockedUsersSettings - Manage blocked users
 */
export function BlockedUsersSettings({ className }: BlockedUsersSettingsProps) {
  const { unblockUser } = useSettingsStore();
  const [blockedUsers, setBlockedUsers] =
    useState<BlockedUser[]>(mockBlockedUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [unblockId, setUnblockId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredUsers = blockedUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleUnblock = async () => {
    if (!unblockId) return;

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      unblockUser(unblockId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== unblockId));
    } finally {
      setLoading(false);
      setUnblockId(null);
    }
  };

  const userToUnblock = blockedUsers.find((u) => u.id === unblockId);

  return (
    <SettingsSection
      title="Blocked Users"
      description="Manage users you have blocked"
      className={className}
    >
      <div className="space-y-4">
        {/* Search */}
        {blockedUsers.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search blocked users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Empty state */}
        {blockedUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <UserX className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              You have not blocked any users
            </p>
          </div>
        )}

        {/* No search results */}
        {blockedUsers.length > 0 &&
          filteredUsers.length === 0 &&
          searchQuery && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No blocked users match &quot;{searchQuery}&quot;
              </p>
            </div>
          )}

        {/* Blocked users list */}
        {filteredUsers.length > 0 && (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnblockId(user.id)}
                >
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        {blockedUsers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Blocked users cannot send you messages, see your online status, or
            view your profile.
          </p>
        )}
      </div>

      {/* Unblock confirmation dialog */}
      <AlertDialog open={!!unblockId} onOpenChange={() => setUnblockId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {userToUnblock?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will be able to send you messages and view your profile
              again. You can always block them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock} disabled={loading}>
              {loading ? "Unblocking..." : "Unblock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
