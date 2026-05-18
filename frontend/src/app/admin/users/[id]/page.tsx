"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  Shield,
  Hash,
  MessageSquare,
  Ban,
  AlertTriangle,
  Save,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import {
  RoleSelect,
  UserRole,
  RoleBadge,
} from "@/components/admin/role-select";
import { BanDialog, BanDialogUser } from "@/components/admin/ban-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Mock user data
const mockUserData: {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive" | "banned";
  avatarUrl: string;
  bio: string;
  createdAt: string;
  lastSeenAt: string;
  channelMemberships: { id: string; name: string; role: "admin" | "member" }[];
  activityHistory: { id: string; action: string; timestamp: string }[];
  stats: {
    messagesSent: number;
    channelsJoined: number;
    reactionsGiven: number;
    daysActive: number;
  };
  warnings: { id: string; reason: string; date: string; issuedBy: string }[];
} = {
  id: "4",
  username: "alice",
  displayName: "Alice Johnson",
  email: "alice@nself.org",
  role: "member",
  status: "active",
  avatarUrl: "",
  bio: "Software engineer and coffee enthusiast",
  createdAt: "2024-01-15T00:00:00Z",
  lastSeenAt: "2024-01-22T09:15:00Z",
  channelMemberships: [
    { id: "1", name: "general", role: "member" },
    { id: "2", name: "random", role: "member" },
    { id: "3", name: "engineering", role: "admin" },
  ],
  activityHistory: [
    {
      id: "1",
      action: "Sent message in #general",
      timestamp: "2024-01-22T09:15:00Z",
    },
    {
      id: "2",
      action: "Joined #engineering",
      timestamp: "2024-01-21T14:30:00Z",
    },
    { id: "3", action: "Updated profile", timestamp: "2024-01-20T11:00:00Z" },
    {
      id: "4",
      action: "Sent message in #random",
      timestamp: "2024-01-19T16:45:00Z",
    },
    { id: "5", action: "Created account", timestamp: "2024-01-15T00:00:00Z" },
  ],
  stats: {
    messagesSent: 234,
    channelsJoined: 3,
    reactionsGiven: 56,
    daysActive: 7,
  },
  warnings: [] as {
    id: string;
    reason: string;
    date: string;
    issuedBy: string;
  }[],
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState(mockUserData);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    displayName: userData.displayName,
    email: userData.email,
    bio: userData.bio || "",
    role: userData.role,
  });
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [warningText, setWarningText] = useState("");

  useEffect(() => {
    if (
      !loading &&
      (!currentUser || !["owner", "admin"].includes(currentUser.role))
    ) {
      router.push("/chat");
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    // In production, fetch user data based on id
  }, [id]);

  const handleSave = async () => {
    // In production, this would call an API
    setUserData((prev) => ({
      ...prev,
      displayName: editedData.displayName,
      email: editedData.email,
      bio: editedData.bio,
      role: editedData.role,
    }));
    setIsEditing(false);
  };

  const handleBanConfirm = async (data: {
    userId: string;
    reason: string;
    duration: string;
    notifyUser: boolean;
  }) => {
    setUserData((prev) => ({
      ...prev,
      status: prev.status === "banned" ? "active" : "banned",
    }));
  };

  const handleAddWarning = async () => {
    if (!warningText.trim()) return;
    const newWarning = {
      id: Date.now().toString(),
      reason: warningText,
      date: new Date().toISOString(),
      issuedBy: currentUser?.displayName || "Admin",
    };
    setUserData((prev) => ({
      ...prev,
      warnings: [...prev.warnings, newWarning],
    }));
    setWarningText("");
  };

  if (
    loading ||
    !currentUser ||
    !["owner", "admin"].includes(currentUser.role)
  ) {
    return null;
  }

  const banDialogUser: BanDialogUser = {
    id: userData.id,
    username: userData.username,
    displayName: userData.displayName,
    email: userData.email,
    avatarUrl: userData.avatarUrl,
    status: userData.status,
  };

  const statusColors = {
    active: "bg-green-500",
    inactive: "bg-gray-400",
    banned: "bg-red-500",
  };

  return (
    <AdminLayout>
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
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setBanDialogOpen(true)}
                  disabled={userData.role === "owner"}
                  className={
                    userData.status === "banned" ? "" : "text-orange-600"
                  }
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {userData.status === "banned" ? "Unban" : "Ban User"}
                </Button>
                <Button onClick={() => setIsEditing(true)}>Edit User</Button>
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
                  <AvatarImage src={userData.avatarUrl} />
                  <AvatarFallback className="text-2xl">
                    {userData.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="mt-4">{userData.displayName}</CardTitle>
                <CardDescription>@{userData.username}</CardDescription>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      statusColors[userData.status],
                    )}
                  />
                  <span className="text-sm capitalize">{userData.status}</span>
                </div>
                <div className="mt-2">
                  <RoleBadge role={userData.role} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{userData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Joined {new Date(userData.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Last seen{" "}
                    {userData.lastSeenAt
                      ? new Date(userData.lastSeenAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                {userData.bio && (
                  <>
                    <Separator />
                    <p className="text-sm text-muted-foreground">
                      {userData.bio}
                    </p>
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
                <TabsTrigger value="channels">Channels</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="moderation">Moderation</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {isEditing ? (
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
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <RoleSelect
                          value={editedData.role}
                          onChange={(role) =>
                            setEditedData((prev) => ({ ...prev, role }))
                          }
                          disabledRoles={
                            currentUser.role === "admin"
                              ? ["owner", "admin"]
                              : ["owner"]
                          }
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
                          {userData.stats.messagesSent}
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
                          {userData.stats.channelsJoined}
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
                        <CardDescription>Reactions</CardDescription>
                        <CardTitle className="text-2xl">
                          {userData.stats.reactionsGiven}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-xs text-muted-foreground">
                          Reactions given
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Active Days</CardDescription>
                        <CardTitle className="text-2xl">
                          {userData.stats.daysActive}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          Days active
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Channels Tab */}
              <TabsContent value="channels">
                <Card>
                  <CardHeader>
                    <CardTitle>Channel Memberships</CardTitle>
                    <CardDescription>
                      Channels this user is a member of
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {userData.channelMemberships.map((channel) => (
                        <div
                          key={channel.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{channel.name}</span>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            <Shield className="mr-1 h-3 w-3" />
                            {channel.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                    <CardDescription>
                      Recent actions by this user
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userData.activityHistory.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 border-l-2 border-muted pl-4"
                        >
                          <div className="flex-1">
                            <p className="text-sm">{activity.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Moderation Tab */}
              <TabsContent value="moderation" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Warnings</CardTitle>
                    <CardDescription>
                      Issue warnings to this user for policy violations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter warning reason..."
                        value={warningText}
                        onChange={(e) => setWarningText(e.target.value)}
                      />
                      <Button
                        onClick={handleAddWarning}
                        disabled={!warningText.trim()}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Add Warning
                      </Button>
                    </div>
                    {userData.warnings.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No warnings issued
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {userData.warnings.map((warning) => (
                          <div
                            key={warning.id}
                            className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950"
                          >
                            <p className="text-sm font-medium">
                              {warning.reason}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Issued by {warning.issuedBy} on{" "}
                              {new Date(warning.date).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ban Options</CardTitle>
                    <CardDescription>
                      Manage user access to the workspace
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant={
                        userData.status === "banned" ? "default" : "destructive"
                      }
                      onClick={() => setBanDialogOpen(true)}
                      disabled={userData.role === "owner"}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      {userData.status === "banned" ? "Unban User" : "Ban User"}
                    </Button>
                    {userData.role === "owner" && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        The workspace owner cannot be banned.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Ban Dialog */}
        <BanDialog
          user={banDialogUser}
          open={banDialogOpen}
          onOpenChange={setBanDialogOpen}
          onConfirm={handleBanConfirm}
        />
      </div>
    </AdminLayout>
  );
}
