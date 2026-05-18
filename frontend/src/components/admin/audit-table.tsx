"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  User,
  Hash,
  Settings,
  Shield,
  Ban,
  Trash2,
  Plus,
  Edit,
  Archive,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type AuditActionType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.banned"
  | "user.unbanned"
  | "user.role_changed"
  | "channel.created"
  | "channel.updated"
  | "channel.deleted"
  | "channel.archived"
  | "channel.unarchived"
  | "settings.updated"
  | "message.deleted";

export interface AuditLogEntry {
  id: string;
  action: AuditActionType;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  targetType: "user" | "channel" | "settings" | "message";
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditTableProps {
  entries: AuditLogEntry[];
}

const actionIcons: Record<
  AuditActionType,
  React.ComponentType<{ className?: string }>
> = {
  "user.created": Plus,
  "user.updated": Edit,
  "user.deleted": Trash2,
  "user.banned": Ban,
  "user.unbanned": Shield,
  "user.role_changed": Shield,
  "channel.created": Plus,
  "channel.updated": Edit,
  "channel.deleted": Trash2,
  "channel.archived": Archive,
  "channel.unarchived": Archive,
  "settings.updated": Settings,
  "message.deleted": Trash2,
};

const actionColors: Record<AuditActionType, string> = {
  "user.created": "bg-green-500/10 text-green-600",
  "user.updated": "bg-blue-500/10 text-blue-600",
  "user.deleted": "bg-red-500/10 text-red-600",
  "user.banned": "bg-orange-500/10 text-orange-600",
  "user.unbanned": "bg-green-500/10 text-green-600",
  "user.role_changed": "bg-yellow-500/10 text-yellow-600",
  "channel.created": "bg-green-500/10 text-green-600",
  "channel.updated": "bg-blue-500/10 text-blue-600",
  "channel.deleted": "bg-red-500/10 text-red-600",
  "channel.archived": "bg-gray-500/10 text-gray-600",
  "channel.unarchived": "bg-green-500/10 text-green-600",
  "settings.updated": "bg-purple-500/10 text-purple-600",
  "message.deleted": "bg-red-500/10 text-red-600",
};

const actionLabels: Record<AuditActionType, string> = {
  "user.created": "User Created",
  "user.updated": "User Updated",
  "user.deleted": "User Deleted",
  "user.banned": "User Banned",
  "user.unbanned": "User Unbanned",
  "user.role_changed": "Role Changed",
  "channel.created": "Channel Created",
  "channel.updated": "Channel Updated",
  "channel.deleted": "Channel Deleted",
  "channel.archived": "Channel Archived",
  "channel.unarchived": "Channel Unarchived",
  "settings.updated": "Settings Updated",
  "message.deleted": "Message Deleted",
};

const targetTypeIcons: Record<
  AuditLogEntry["targetType"],
  React.ComponentType<{ className?: string }>
> = {
  user: User,
  channel: Hash,
  settings: Settings,
  message: Edit,
};

function AuditEntryRow({ entry }: { entry: AuditLogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const ActionIcon = actionIcons[entry.action];
  const TargetIcon = targetTypeIcons[entry.targetType];

  return (
    <>
      <tr className="hover:bg-muted/30 border-b">
        <td className="px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center space-x-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                actionColors[entry.action],
              )}
            >
              <ActionIcon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">
              {actionLabels[entry.action]}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={entry.actorAvatarUrl} />
              <AvatarFallback className="text-xs">
                {entry.actorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{entry.actorName}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          {entry.targetName && (
            <div className="flex items-center space-x-2">
              <TargetIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{entry.targetName}</span>
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {new Date(entry.createdAt).toLocaleString()}
        </td>
      </tr>
      {isExpanded && entry.details && (
        <tr className="bg-muted/20">
          <td colSpan={5} className="px-4 py-3">
            <div className="ml-10 space-y-2 text-sm">
              <div className="font-medium">Details</div>
              <pre className="rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
              {entry.ipAddress && (
                <div className="text-muted-foreground">
                  IP Address: {entry.ipAddress}
                </div>
              )}
              {entry.userAgent && (
                <div className="max-w-xl truncate text-muted-foreground">
                  User Agent: {entry.userAgent}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function AuditTable({ entries }: AuditTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<string>("all");

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.targetName?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false);

    const matchesAction =
      actionFilter === "all" || entry.action === actionFilter;
    const matchesTarget =
      targetFilter === "all" || entry.targetType === targetFilter;

    return matchesSearch && matchesAction && matchesTarget;
  });

  const uniqueActions = Array.from(new Set(entries.map((e) => e.action)));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          placeholder="Search by actor or target..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action}>
                {actionLabels[action]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={targetFilter} onValueChange={setTargetFilter}>
          <SelectTrigger className="sm:w-[150px]">
            <SelectValue placeholder="Filter by target" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Targets</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="channel">Channel</SelectItem>
            <SelectItem value="settings">Settings</SelectItem>
            <SelectItem value="message">Message</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Actor
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No audit log entries found
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <AuditEntryRow key={entry.id} entry={entry} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredEntries.length} of {entries.length} entries
      </div>
    </div>
  );
}
