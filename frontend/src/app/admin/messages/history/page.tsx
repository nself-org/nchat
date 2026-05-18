"use client";

import { useState, useMemo } from "react";
import {
  History,
  Filter,
  RefreshCw,
  Search,
  Download,
  Trash2,
  Eye,
  User,
  MessageSquare,
  Hash,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { StatsCard, StatsGrid } from "@/components/admin/stats-card";
import { useAdminAccess } from "@/lib/admin/use-admin";
import { formatRelativeTime } from "@/lib/date";
import { EditHistory } from "@/components/message-history";
import type {
  MessageEditHistory,
  AdminHistoryItem,
} from "@/lib/message-history";

// Mock data for demonstration
const mockHistoryItems: AdminHistoryItem[] = [
  {
    messageId: "msg-1",
    channel: { id: "ch-1", name: "general" },
    author: {
      id: "user-1",
      username: "alice",
      displayName: "Alice Johnson",
      avatarUrl: undefined,
    },
    contentPreview: "Updated message content here...",
    originalPreview: "Original message content...",
    editCount: 5,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    lastEditedAt: new Date(Date.now() - 30 * 60 * 1000),
    lastEditedBy: {
      id: "user-1",
      username: "alice",
      displayName: "Alice Johnson",
    },
  },
  {
    messageId: "msg-2",
    channel: { id: "ch-2", name: "engineering" },
    author: {
      id: "user-2",
      username: "bob",
      displayName: "Bob Smith",
      avatarUrl: undefined,
    },
    contentPreview: "Technical specification update...",
    originalPreview: "Initial technical specification...",
    editCount: 12,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    lastEditedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    lastEditedBy: {
      id: "user-3",
      username: "charlie",
      displayName: "Charlie Brown",
    },
  },
  {
    messageId: "msg-3",
    channel: { id: "ch-1", name: "general" },
    author: {
      id: "user-3",
      username: "charlie",
      displayName: "Charlie Brown",
      avatarUrl: undefined,
    },
    contentPreview: "Meeting notes for Q4 planning...",
    originalPreview: "Draft meeting notes...",
    editCount: 3,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    lastEditedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    lastEditedBy: {
      id: "user-3",
      username: "charlie",
      displayName: "Charlie Brown",
    },
  },
];

// Mock history for modal
const mockFullHistory: MessageEditHistory = {
  messageId: "msg-1",
  channelId: "ch-1",
  currentContent: "Updated message content here with more details...",
  originalContent: "Original message content that was posted initially.",
  versions: [
    {
      id: "v1",
      messageId: "msg-1",
      versionNumber: 1,
      content: "Original message content that was posted initially.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      editedBy: {
        id: "user-1",
        username: "alice",
        displayName: "Alice Johnson",
      },
      isOriginal: true,
      isCurrent: false,
    },
    {
      id: "v2",
      messageId: "msg-1",
      versionNumber: 2,
      content: "First edit - added some clarification.",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      editedBy: {
        id: "user-1",
        username: "alice",
        displayName: "Alice Johnson",
      },
      isOriginal: false,
      isCurrent: false,
    },
    {
      id: "v3",
      messageId: "msg-1",
      versionNumber: 3,
      content: "Updated message content here with more details...",
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      editedBy: {
        id: "user-1",
        username: "alice",
        displayName: "Alice Johnson",
      },
      isOriginal: false,
      isCurrent: true,
    },
  ],
  editCount: 2,
  author: {
    id: "user-1",
    username: "alice",
    displayName: "Alice Johnson",
  },
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  lastEditedAt: new Date(Date.now() - 30 * 60 * 1000),
  lastEditedBy: {
    id: "user-1",
    username: "alice",
    displayName: "Alice Johnson",
  },
};

export default function AdminMessageHistoryPage() {
  const { canModerate, isAdmin } = useAdminAccess();
  const [isLoading, setIsLoading] = useState(false);
  const [items] = useState<AdminHistoryItem[]>(mockHistoryItems);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [minEditsFilter, setMinEditsFilter] = useState<string>("1");

  // Modal state
  const [viewingHistory, setViewingHistory] =
    useState<MessageEditHistory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (
        searchQuery &&
        !item.contentPreview
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) &&
        !item.author.displayName
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (channelFilter !== "all" && item.channel.id !== channelFilter) {
        return false;
      }
      if (item.editCount < parseInt(minEditsFilter)) {
        return false;
      }
      return true;
    });
  }, [items, searchQuery, channelFilter, minEditsFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalEdits = items.reduce((sum, item) => sum + item.editCount, 0);
    const uniqueAuthors = new Set(items.map((item) => item.author.id)).size;
    const uniqueChannels = new Set(items.map((item) => item.channel.id)).size;
    return {
      totalMessages: items.length,
      totalEdits,
      uniqueAuthors,
      uniqueChannels,
    };
  }, [items]);

  // Handlers
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredItems.map((item) => item.messageId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (messageId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, messageId]);
    } else {
      setSelectedIds(selectedIds.filter((id) => id !== messageId));
    }
  };

  const handleViewHistory = (_item: AdminHistoryItem) => {
    // In production, fetch the full history based on _item.messageId
    setViewingHistory(mockFullHistory);
    setIsModalOpen(true);
  };

  const handleBulkDelete = async () => {
    // In production, call the API
    setSelectedIds([]);
  };

  const handleExport = () => {
    // In production, export data
  };

  if (!canModerate) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <History className="h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to view message edit history.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <History className="h-8 w-8" />
              Message Edit History
            </h1>
            <p className="text-muted-foreground">
              View and manage edit history across all messages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <StatsGrid columns={4}>
          <StatsCard
            title="Edited Messages"
            value={stats.totalMessages}
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <StatsCard
            title="Total Edits"
            value={stats.totalEdits}
            icon={<History className="h-4 w-4" />}
          />
          <StatsCard
            title="Unique Authors"
            value={stats.uniqueAuthors}
            icon={<User className="h-4 w-4" />}
          />
          <StatsCard
            title="Channels"
            value={stats.uniqueChannels}
            icon={<Hash className="h-4 w-4" />}
          />
        </StatsGrid>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[200px] max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="ch-1">general</SelectItem>
              <SelectItem value="ch-2">engineering</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                More Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Minimum Edits</Label>
                  <Select
                    value={minEditsFilter}
                    onValueChange={setMinEditsFilter}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1+ edits</SelectItem>
                      <SelectItem value="3">3+ edits</SelectItem>
                      <SelectItem value="5">5+ edits</SelectItem>
                      <SelectItem value="10">10+ edits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Add date range filter here */}
              </div>
            </PopoverContent>
          </Popover>

          {selectedIds.length > 0 && isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Selected ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedIds.length === filteredItems.length &&
                        filteredItems.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Message</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-center">Edits</TableHead>
                <TableHead>Last Edited</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {isAdmin && (
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    )}
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-8 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="h-24 text-center"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <History className="h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">
                        No edited messages found
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.messageId}>
                    {isAdmin && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(item.messageId)}
                          onCheckedChange={(checked) =>
                            handleSelectItem(item.messageId, checked === true)
                          }
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="truncate font-medium">
                          {item.contentPreview}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Original: {item.originalPreview}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={item.author.avatarUrl}
                            alt={item.author.displayName}
                          />
                          <AvatarFallback>
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {item.author.displayName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Hash className="h-3 w-3" />
                        {item.channel.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          item.editCount >= 5 ? "destructive" : "secondary"
                        }
                      >
                        {item.editCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatRelativeTime(item.lastEditedAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          by {item.lastEditedBy.displayName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewHistory(item)}
                        className="gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination would go here */}

        {/* History Modal */}
        <EditHistory
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setViewingHistory(null);
          }}
          history={viewingHistory}
          canRestore={isAdmin}
          canClear={isAdmin}
          onRestore={async (version, reason) => {}}
          onClear={async (keepOriginal, reason) => {}}
        />
      </div>
    </AdminLayout>
  );
}
