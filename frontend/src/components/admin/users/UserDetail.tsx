"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  Shield,
  Hash,
  MessageSquare,
  Ban,
  Save,
  MoreHorizontal,
  Key,
  UserCog,
  Trash2,
  UserX,
  UserCheck,
  Copy,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserActivity } from "./UserActivity";
import { UserSessions } from "./UserSessions";
import { UserDevices } from "./UserDevices";
import { useUserManagementStore } from "@/stores/user-management-store";
import {
  getUserInitials,
  formatLastSeen,
} from "@/lib/admin/users/user-manager";
import type { AdminUser } from "@/lib/admin/users/user-types";

interface UserDetailProps {
  user: AdminUser;
  isEditing?: boolean;
  onSave?: (data: Partial<AdminUser>) => Promise<void>;
  onCancel?: () => void;
}

const roleColors: Record<string, string> = {
  owner: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  admin: "bg-red-500/10 text-red-600 border-red-500/20",
  moderator: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  member: "bg-green-500/10 text-green-600 border-green-500/20",
  guest: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500",
  inactive: "bg-gray-400",
  banned: "bg-red-500",
};

export function UserDetail({
  user,
  isEditing = false,
  onSave,
  onCancel,
}: UserDetailProps) {
  const [editMode, setEditMode] = useState(isEditing);
  const [editedData, setEditedData] = useState({
    displayName: user.displayName,
    email: user.email,
    bio: user.bio || "",
    location: user.location || "",
    website: user.website || "",
    pronouns: user.pronouns || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const {
    selectedUserActivity,
    selectedUserSessions,
    selectedUserDevices,
    openBanModal,
    openRoleChangeModal,
    openResetPasswordModal,
    openImpersonateModal,
    openDeleteConfirm,
  } = useUserManagementStore();

  const getUserStatus = (): "active" | "inactive" | "banned" => {
    if (user.isBanned) return "banned";
    if (!user.isActive) return "inactive";
    return "active";
  };

  const status = getUserStatus();
  const isOwner = user.role.name === "owner";

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(editedData);
      setEditMode(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData({
      displayName: user.displayName,
      email: user.email,
      bio: user.bio || "",
      location: user.location || "",
      website: user.website || "",
      pronouns: user.pronouns || "",
    });
    setEditMode(false);
    onCancel?.();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">User Details</h1>
          <p className="text-muted-foreground">
            View and manage user account information
          </p>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <MoreHorizontal className="mr-2 h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => openRoleChangeModal(user)}
                    disabled={isOwner}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Change Role
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openResetPasswordModal(user)}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Reset Password
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openImpersonateModal(user)}
                    disabled={isOwner}
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Impersonate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {status === "banned" ? (
                    <DropdownMenuItem
                      onClick={() => openBanModal(user)}
                      disabled={isOwner}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Unban User
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => openBanModal(user)}
                      disabled={isOwner}
                      className="text-orange-600"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Ban User
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => openDeleteConfirm(user)}
                    disabled={isOwner}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setEditMode(true)}>Edit User</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                <AvatarFallback className="text-2xl">
                  {getUserInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="mt-4">{user.displayName}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                @{user.username}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => copyToClipboard(user.username)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </CardDescription>
              <div className="mt-2 flex items-center gap-2">
                <div
                  className={cn("h-2 w-2 rounded-full", statusColors[status])}
                />
                <span className="text-sm capitalize">{status}</span>
              </div>
              <div className="mt-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    roleColors[user.role.name.toLowerCase()],
                  )}
                >
                  {user.role.name}
                </Badge>
              </div>
              {user.isVerified && (
                <Badge variant="secondary" className="mt-2">
                  Verified
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{user.email}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(user.email)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Last seen {formatLastSeen(user.lastSeenAt)}</span>
              </div>
              {user.location && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Location:</span>
                  <span>{user.location}</span>
                </div>
              )}
              {user.website && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Website:</span>
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {user.website.replace(/^https?:\/\//, "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {user.bio && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">{user.bio}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="moderation">Moderation</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {editMode ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Profile</CardTitle>
                    <CardDescription>Update user information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={editedData.displayName}
                        onChange={(e) =>
                          setEditedData((prev) => ({
                            ...prev,
                            displayName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editedData.email}
                        onChange={(e) =>
                          setEditedData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={editedData.bio}
                        onChange={(e) =>
                          setEditedData((prev) => ({
                            ...prev,
                            bio: e.target.value,
                          }))
                        }
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={editedData.location}
                          onChange={(e) =>
                            setEditedData((prev) => ({
                              ...prev,
                              location: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          value={editedData.website}
                          onChange={(e) =>
                            setEditedData((prev) => ({
                              ...prev,
                              website: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pronouns">Pronouns</Label>
                      <Input
                        id="pronouns"
                        value={editedData.pronouns}
                        onChange={(e) =>
                          setEditedData((prev) => ({
                            ...prev,
                            pronouns: e.target.value,
                          }))
                        }
                        placeholder="e.g., they/them"
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Messages Sent</CardDescription>
                      <CardTitle className="text-2xl">
                        {user.messagesCount.toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <MessageSquare className="mr-1 h-3 w-3" />
                        Total messages
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Channels</CardDescription>
                      <CardTitle className="text-2xl">
                        {user.channelsCount}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Hash className="mr-1 h-3 w-3" />
                        Joined channels
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Active Sessions</CardDescription>
                      <CardTitle className="text-2xl">
                        {
                          selectedUserSessions.filter(
                            (s) => s.status === "active",
                          ).length
                        }
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-xs text-muted-foreground">
                        Active devices
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Account Age</CardDescription>
                      <CardTitle className="text-2xl">
                        {Math.floor(
                          (Date.now() - new Date(user.createdAt).getTime()) /
                            (1000 * 60 * 60 * 24),
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        Days
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <UserActivity
                activities={selectedUserActivity}
                userId={user.id}
              />
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions">
              <UserSessions sessions={selectedUserSessions} userId={user.id} />
            </TabsContent>

            {/* Devices Tab */}
            <TabsContent value="devices">
              <UserDevices devices={selectedUserDevices} userId={user.id} />
            </TabsContent>

            {/* Moderation Tab */}
            <TabsContent value="moderation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Moderation Actions</CardTitle>
                  <CardDescription>
                    Take action on this user account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={status === "banned" ? "default" : "destructive"}
                      onClick={() => openBanModal(user)}
                      disabled={isOwner}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      {status === "banned" ? "Unban User" : "Ban User"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openResetPasswordModal(user)}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Reset Password
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openDeleteConfirm(user)}
                      disabled={isOwner}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </Button>
                  </div>
                  {isOwner && (
                    <p className="text-sm text-muted-foreground">
                      The workspace owner cannot be banned or deleted.
                    </p>
                  )}
                </CardContent>
              </Card>

              {user.isBanned && (
                <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                  <CardHeader>
                    <CardTitle className="text-red-600">
                      User is Banned
                    </CardTitle>
                    <CardDescription>
                      This user was banned{" "}
                      {user.bannedAt &&
                        `on ${new Date(user.bannedAt).toLocaleDateString()}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Reason:</strong>{" "}
                        {user.banReason || "No reason provided"}
                      </p>
                      {user.bannedUntil && (
                        <p>
                          <strong>Until:</strong>{" "}
                          {new Date(user.bannedUntil).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default UserDetail;
