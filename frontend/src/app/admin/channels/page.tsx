"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Plus, Download, Archive } from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { ChannelTable, Channel } from "@/components/admin/channel-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock channels data for demonstration
const mockChannels: Channel[] = [
  {
    id: "1",
    name: "general",
    slug: "general",
    description: "General discussion for the team",
    type: "public",
    memberCount: 156,
    messageCount: 4521,
    isArchived: false,
    createdAt: "2024-01-01T00:00:00Z",
    lastActivityAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "random",
    slug: "random",
    description: "Non-work banter and water cooler conversation",
    type: "public",
    memberCount: 142,
    messageCount: 3287,
    isArchived: false,
    createdAt: "2024-01-01T00:00:00Z",
    lastActivityAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "announcements",
    slug: "announcements",
    description: "Important announcements for the workspace",
    type: "public",
    memberCount: 156,
    messageCount: 89,
    isArchived: false,
    createdAt: "2024-01-01T00:00:00Z",
    lastActivityAt: "2024-01-20T10:00:00Z",
  },
  {
    id: "4",
    name: "engineering",
    slug: "engineering",
    description: "Engineering team discussions",
    type: "private",
    memberCount: 24,
    messageCount: 1856,
    isArchived: false,
    createdAt: "2024-01-05T00:00:00Z",
    lastActivityAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "design",
    slug: "design",
    description: "Design team collaboration",
    type: "private",
    memberCount: 12,
    messageCount: 743,
    isArchived: false,
    createdAt: "2024-01-08T00:00:00Z",
    lastActivityAt: "2024-01-21T16:30:00Z",
  },
  {
    id: "6",
    name: "old-project",
    slug: "old-project",
    description: "Archived project channel",
    type: "private",
    memberCount: 8,
    messageCount: 234,
    isArchived: true,
    createdAt: "2023-06-15T00:00:00Z",
    lastActivityAt: "2023-12-01T14:00:00Z",
  },
];

export default function ChannelsManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>(mockChannels);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: "",
    description: "",
    type: "public" as "public" | "private",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    type: "public" as "public" | "private",
  });

  useEffect(() => {
    if (!loading && (!user || !["owner", "admin"].includes(user.role))) {
      router.push("/chat");
    }
  }, [user, loading, router]);

  const handleEditChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setEditForm({
      name: channel.name,
      description: channel.description || "",
      type: channel.type as "public" | "private",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEditChannel = () => {
    if (!selectedChannel) return;
    setChannels((prev) =>
      prev.map((c) =>
        c.id === selectedChannel.id
          ? {
              ...c,
              name: editForm.name,
              slug: editForm.name.toLowerCase().replace(/\s+/g, "-"),
              description: editForm.description,
              type: editForm.type,
            }
          : c,
      ),
    );
    setEditDialogOpen(false);
    setSelectedChannel(null);
  };

  const handleArchiveChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setArchiveDialogOpen(true);
  };

  const handleDeleteChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setDeleteDialogOpen(true);
  };

  const handleCreateChannel = async () => {
    // In production, this would call an API
    const newChannelData: Channel = {
      id: Date.now().toString(),
      name: newChannel.name,
      slug: newChannel.name.toLowerCase().replace(/\s+/g, "-"),
      description: newChannel.description,
      type: newChannel.type,
      memberCount: 1,
      messageCount: 0,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    setChannels((prev) => [...prev, newChannelData]);
    setCreateDialogOpen(false);
    setNewChannel({ name: "", description: "", type: "public" });
  };

  const handleConfirmArchive = async () => {
    if (!selectedChannel) return;
    setChannels((prev) =>
      prev.map((c) =>
        c.id === selectedChannel.id ? { ...c, isArchived: !c.isArchived } : c,
      ),
    );
    setArchiveDialogOpen(false);
    setSelectedChannel(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedChannel) return;
    setChannels((prev) => prev.filter((c) => c.id !== selectedChannel.id));
    setDeleteDialogOpen(false);
    setSelectedChannel(null);
  };

  if (loading || !user || !["owner", "admin"].includes(user.role)) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Channels</h1>
            <p className="text-muted-foreground">
              Manage workspace channels and their settings
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Archive className="mr-2 h-4 w-4" />
              View Archived
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Channel
            </Button>
          </div>
        </div>

        {/* Channel Table */}
        <ChannelTable
          channels={channels}
          onEditChannel={handleEditChannel}
          onArchiveChannel={handleArchiveChannel}
          onDeleteChannel={handleDeleteChannel}
        />

        {/* Create Channel Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Channel</DialogTitle>
              <DialogDescription>
                Add a new channel to your workspace
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., engineering"
                  value={newChannel.name}
                  onChange={(e) =>
                    setNewChannel((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this channel about?"
                  value={newChannel.description}
                  onChange={(e) =>
                    setNewChannel((prev) => ({
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
                  value={newChannel.type}
                  onValueChange={(value: "public" | "private") =>
                    setNewChannel((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div>
                        <div className="font-medium">Public</div>
                        <div className="text-xs text-muted-foreground">
                          Anyone can join and view messages
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div>
                        <div className="font-medium">Private</div>
                        <div className="text-xs text-muted-foreground">
                          Only invited members can join
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateChannel}
                disabled={!newChannel.name.trim()}
              >
                Create Channel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Channel Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Channel</DialogTitle>
              <DialogDescription>
                Update channel settings for #{selectedChannel?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Channel Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
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
                  value={editForm.type}
                  onValueChange={(value: "public" | "private") =>
                    setEditForm((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditChannel}
                disabled={!editForm.name.trim()}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Archive Confirmation Dialog */}
        <AlertDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedChannel?.isArchived ? "Unarchive" : "Archive"} Channel
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedChannel?.isArchived
                  ? `This will restore #${selectedChannel?.name} and make it visible to members again.`
                  : `This will archive #${selectedChannel?.name}. Archived channels are hidden from the channel list but can be restored later. Messages will be preserved.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmArchive}>
                {selectedChannel?.isArchived ? "Unarchive" : "Archive"} Channel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Channel</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete #{selectedChannel?.name}? This
                action cannot be undone. All messages in this channel will be
                permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
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
