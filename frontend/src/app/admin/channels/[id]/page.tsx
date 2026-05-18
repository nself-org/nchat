"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MessageSquare,
  Hash,
  Lock,
  Settings,
  Archive,
  Trash2,
  Save,
  UserPlus,
  UserMinus,
  Shield,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { generateMockActivityData } from "@/components/admin/activity-chart";
import { ChartSkeleton } from "@/components/ui/loading-skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Lazy load heavy chart component (recharts)
const ActivityChart = dynamic(
  () =>
    import("@/components/admin/activity-chart").then((mod) => ({
      default: mod.ActivityChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false },
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ChannelType = "public" | "private";

// Mock channel data
const mockChannelData: {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: ChannelType;
  memberCount: number;
  messageCount: number;
  isArchived: boolean;
  createdAt: string;
  lastActivityAt: string;
  createdBy: { id: string; name: string; avatarUrl: string };
  members: {
    id: string;
    name: string;
    username: string;
    role: "admin" | "member";
    avatarUrl: string;
  }[];
  stats: {
    messagesThisWeek: number;
    activeMembers: number;
    averageResponseTime: string;
  };
} = {
  id: "4",
  name: "engineering",
  slug: "engineering",
  description: "Engineering team discussions and technical collaboration",
  type: "private",
  memberCount: 24,
  messageCount: 1856,
  isArchived: false,
  createdAt: "2024-01-05T00:00:00Z",
  lastActivityAt: new Date().toISOString(),
  createdBy: {
    id: "1",
    name: "Workspace Owner",
    avatarUrl: "",
  },
  members: [
    {
      id: "1",
      name: "Workspace Owner",
      username: "owner",
      role: "admin",
      avatarUrl: "",
    },
    {
      id: "2",
      name: "Admin User",
      username: "admin",
      role: "admin",
      avatarUrl: "",
    },
    {
      id: "4",
      name: "Alice Johnson",
      username: "alice",
      role: "member",
      avatarUrl: "",
    },
    {
      id: "5",
      name: "Bob Smith",
      username: "bob",
      role: "member",
      avatarUrl: "",
    },
    {
      id: "6",
      name: "Charlie Brown",
      username: "charlie",
      role: "member",
      avatarUrl: "",
    },
  ],
  stats: {
    messagesThisWeek: 234,
    activeMembers: 18,
    averageResponseTime: "15 min",
  },
};

type MemberRole = "admin" | "member";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ChannelDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [channelData, setChannelData] = useState(mockChannelData);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<{
    name: string;
    description: string;
    type: ChannelType;
  }>({
    name: channelData.name,
    description: channelData.description || "",
    type: channelData.type,
  });
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityData] = useState(generateMockActivityData(7));

  useEffect(() => {
    if (
      !loading &&
      (!currentUser || !["owner", "admin"].includes(currentUser.role))
    ) {
      router.push("/chat");
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    // In production, fetch channel data based on id
  }, [id]);

  const handleSave = async () => {
    // In production, this would call an API
    setChannelData((prev) => ({
      ...prev,
      name: editedData.name,
      description: editedData.description,
      type: editedData.type,
    }));
    setIsEditing(false);
  };

  const handleArchive = async () => {
    setChannelData((prev) => ({ ...prev, isArchived: !prev.isArchived }));
    setArchiveDialogOpen(false);
  };

  const handleDelete = async () => {
    // In production, this would call an API
    setDeleteDialogOpen(false);
    router.push("/admin/channels");
  };

  const handleMemberRoleChange = (memberId: string, newRole: MemberRole) => {
    setChannelData((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === memberId ? { ...m, role: newRole } : m,
      ),
    }));
  };

  const handleRemoveMember = (memberId: string) => {
    setChannelData((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== memberId),
      memberCount: prev.memberCount - 1,
    }));
  };

  if (
    loading ||
    !currentUser ||
    !["owner", "admin"].includes(currentUser.role)
  ) {
    return null;
  }

  const typeIcons = {
    public: Hash,
    private: Lock,
    direct: Users,
  };

  const TypeIcon = typeIcons[channelData.type];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/channels">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">{channelData.name}</h1>
              {channelData.isArchived && (
                <Badge variant="secondary">Archived</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Manage channel settings and members
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
                  onClick={() => setArchiveDialogOpen(true)}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {channelData.isArchived ? "Unarchive" : "Archive"}
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Settings
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Channel Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-lg",
                    channelData.type === "public"
                      ? "bg-green-500/10 text-green-600"
                      : "bg-yellow-500/10 text-yellow-600",
                  )}
                >
                  <TypeIcon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>#{channelData.name}</CardTitle>
                  <CardDescription className="capitalize">
                    {channelData.type} channel
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {channelData.description && (
                <p className="text-sm text-muted-foreground">
                  {channelData.description}
                </p>
              )}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{channelData.memberCount} members</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {channelData.messageCount.toLocaleString()} messages
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Created{" "}
                    {new Date(channelData.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Last activity{" "}
                    {channelData.lastActivityAt
                      ? new Date(channelData.lastActivityAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Created by: </span>
                <span className="font-medium">
                  {channelData.createdBy.name}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Messages This Week</CardDescription>
                      <CardTitle className="text-2xl">
                        {channelData.stats.messagesThisWeek}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Active Members</CardDescription>
                      <CardTitle className="text-2xl">
                        {channelData.stats.activeMembers}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Avg Response Time</CardDescription>
                      <CardTitle className="text-2xl">
                        {channelData.stats.averageResponseTime}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>
                <ActivityChart
                  data={activityData}
                  title="Channel Activity"
                  description="Messages and active users in this channel"
                />
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Members</CardTitle>
                      <CardDescription>
                        {channelData.members.length} members in this channel
                      </CardDescription>
                    </div>
                    <Button size="sm">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Members
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {channelData.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {member.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {member.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                @{member.username}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.role}
                              onValueChange={(value: MemberRole) =>
                                handleMemberRoleChange(member.id, value)
                              }
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center">
                                    <Shield className="mr-2 h-3 w-3" />
                                    Admin
                                  </div>
                                </SelectItem>
                                <SelectItem value="member">
                                  <div className="flex items-center">
                                    <Users className="mr-2 h-3 w-3" />
                                    Member
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="text-destructive"
                                >
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  Remove from Channel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                {isEditing ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Edit Channel</CardTitle>
                      <CardDescription>Update channel settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Channel Name</Label>
                        <Input
                          id="name"
                          value={editedData.name}
                          onChange={(e) =>
                            setEditedData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={editedData.description}
                          onChange={(e) =>
                            setEditedData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Channel Type</Label>
                        <Select
                          value={editedData.type}
                          onValueChange={(value: "public" | "private") =>
                            setEditedData((prev) => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              <div className="flex items-center">
                                <Hash className="mr-2 h-4 w-4" />
                                Public
                              </div>
                            </SelectItem>
                            <SelectItem value="private">
                              <div className="flex items-center">
                                <Lock className="mr-2 h-4 w-4" />
                                Private
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Channel Settings</CardTitle>
                      <CardDescription>
                        Current channel configuration
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border p-4">
                          <Label className="text-muted-foreground">Name</Label>
                          <p className="mt-1 font-medium">{channelData.name}</p>
                        </div>
                        <div className="rounded-lg border p-4">
                          <Label className="text-muted-foreground">Type</Label>
                          <p className="mt-1 font-medium capitalize">
                            {channelData.type}
                          </p>
                        </div>
                      </div>
                      {channelData.description && (
                        <div className="rounded-lg border p-4">
                          <Label className="text-muted-foreground">
                            Description
                          </Label>
                          <p className="mt-1">{channelData.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Danger Zone</CardTitle>
                    <CardDescription>
                      Irreversible and destructive actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
                      <div>
                        <p className="font-medium">Archive Channel</p>
                        <p className="text-sm text-muted-foreground">
                          Hide this channel from the channel list. Can be
                          restored later.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setArchiveDialogOpen(true)}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        {channelData.isArchived ? "Unarchive" : "Archive"}
                      </Button>
                    </div>
                    <div className="border-destructive/50 bg-destructive/10 flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Delete Channel</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete this channel and all messages.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Archive Dialog */}
        <AlertDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {channelData.isArchived ? "Unarchive" : "Archive"} Channel
              </AlertDialogTitle>
              <AlertDialogDescription>
                {channelData.isArchived
                  ? `This will restore #${channelData.name} and make it visible to members again.`
                  : `This will archive #${channelData.name}. Archived channels are hidden from the channel list but can be restored later. Messages will be preserved.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive}>
                {channelData.isArchived ? "Unarchive" : "Archive"} Channel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Channel</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete #{channelData.name}? This action
                cannot be undone. All messages in this channel will be
                permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
              >
                Delete Channel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
