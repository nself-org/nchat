"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Eye,
  Settings,
  Archive,
  Trash2,
  Hash,
  Lock,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: "public" | "private" | "direct";
  memberCount: number;
  messageCount: number;
  isArchived: boolean;
  createdAt: string;
  lastActivityAt?: string;
}

interface ChannelTableProps {
  channels: Channel[];
  onViewChannel?: (channel: Channel) => void;
  onEditChannel?: (channel: Channel) => void;
  onArchiveChannel?: (channel: Channel) => void;
  onDeleteChannel?: (channel: Channel) => void;
}

const typeIcons: Record<
  Channel["type"],
  React.ComponentType<{ className?: string }>
> = {
  public: Hash,
  private: Lock,
  direct: Users,
};

const typeColors: Record<Channel["type"], string> = {
  public: "bg-green-500/10 text-green-600 border-green-500/20",
  private: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  direct: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export function ChannelTable({
  channels,
  onViewChannel,
  onEditChannel,
  onArchiveChannel,
  onDeleteChannel,
}: ChannelTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredChannels = channels.filter((channel) => {
    const matchesSearch =
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (channel.description?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false);

    const matchesType = typeFilter === "all" || channel.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !channel.isArchived) ||
      (statusFilter === "archived" && channel.isArchived);

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-[150px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Channel
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Members
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Messages
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Last Activity
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredChannels.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No channels found
                  </td>
                </tr>
              ) : (
                filteredChannels.map((channel) => {
                  const TypeIcon = typeIcons[channel.type];
                  return (
                    <tr
                      key={channel.id}
                      className={cn(
                        "hover:bg-muted/30 border-b last:border-b-0",
                        channel.isArchived && "opacity-60",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg",
                              typeColors[channel.type],
                            )}
                          >
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <Link
                              href={`/admin/channels/${channel.id}`}
                              className="font-medium hover:underline"
                            >
                              {channel.name}
                            </Link>
                            {channel.description && (
                              <p className="max-w-xs truncate text-sm text-muted-foreground">
                                {channel.description}
                              </p>
                            )}
                          </div>
                          {channel.isArchived && (
                            <Badge variant="secondary" className="ml-2">
                              Archived
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn("capitalize", typeColors[channel.type])}
                        >
                          {channel.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {channel.memberCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {channel.messageCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(channel.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {channel.lastActivityAt
                          ? new Date(
                              channel.lastActivityAt,
                            ).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onViewChannel?.(channel)}
                              asChild
                            >
                              <Link href={`/admin/channels/${channel.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onEditChannel?.(channel)}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Edit Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onArchiveChannel?.(channel)}
                              className="text-orange-600"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              {channel.isArchived ? "Unarchive" : "Archive"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeleteChannel?.(channel)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Channel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredChannels.length} of {channels.length} channels
      </div>
    </div>
  );
}
