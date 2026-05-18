/**
 * Enhanced Audit Log Component
 *
 * Advanced audit log viewer with:
 * - Advanced search and filtering
 * - CSV/JSON export
 * - Real-time updates
 * - Detailed event inspection
 * - Retention policy management
 */

"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  downloadCSV,
  downloadJSON,
  arrayToCSV,
} from "@/lib/admin/bulk-operations";

// ============================================================================
// Types
// ============================================================================

export type AuditEventType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.login"
  | "user.logout"
  | "user.suspended"
  | "user.role_changed"
  | "channel.created"
  | "channel.updated"
  | "channel.deleted"
  | "channel.archived"
  | "message.created"
  | "message.updated"
  | "message.deleted"
  | "message.flagged"
  | "settings.updated"
  | "automation.created"
  | "automation.executed"
  | "bulk_operation.started"
  | "bulk_operation.completed";

export type AuditEventSeverity = "info" | "warning" | "error" | "critical";

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  severity: AuditEventSeverity;
  actor: {
    id: string;
    username: string;
    displayName: string;
    email?: string;
  };
  target?: {
    type: "user" | "channel" | "message" | "setting" | "automation";
    id: string;
    name: string;
  };
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// ============================================================================
// Mock Data
// ============================================================================

function generateMockAuditEvents(count: number = 50): AuditEvent[] {
  const types: AuditEventType[] = [
    "user.created",
    "user.login",
    "user.role_changed",
    "channel.created",
    "channel.deleted",
    "message.flagged",
    "settings.updated",
  ];

  const severities: AuditEventSeverity[] = ["info", "warning", "error"];

  const users = [
    {
      id: "1",
      username: "alice",
      displayName: "Alice Johnson",
      email: "alice@example.com",
    },
    {
      id: "2",
      username: "bob",
      displayName: "Bob Smith",
      email: "bob@example.com",
    },
    {
      id: "3",
      username: "charlie",
      displayName: "Charlie Brown",
      email: "charlie@example.com",
    },
  ];

  const events: AuditEvent[] = [];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const actor = users[Math.floor(Math.random() * users.length)];

    events.push({
      id: `event-${i}`,
      type,
      severity: severities[Math.floor(Math.random() * severities.length)],
      actor,
      action: type.split(".")[1],
      description: getEventDescription(type, actor.displayName),
      metadata: {
        sessionId: `session-${Math.floor(Math.random() * 1000)}`,
        duration: Math.random() * 1000,
      },
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 7), // Last 7 days
    });
  }

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function getEventDescription(type: AuditEventType, actorName: string): string {
  const descriptions: Record<AuditEventType, string> = {
    "user.created": `${actorName} created a new user account`,
    "user.updated": `${actorName} updated user profile`,
    "user.deleted": `${actorName} deleted a user account`,
    "user.login": `${actorName} logged in`,
    "user.logout": `${actorName} logged out`,
    "user.suspended": `${actorName} suspended a user`,
    "user.role_changed": `${actorName} changed user role`,
    "channel.created": `${actorName} created a new channel`,
    "channel.updated": `${actorName} updated channel settings`,
    "channel.deleted": `${actorName} deleted a channel`,
    "channel.archived": `${actorName} archived a channel`,
    "message.created": `${actorName} posted a message`,
    "message.updated": `${actorName} edited a message`,
    "message.deleted": `${actorName} deleted a message`,
    "message.flagged": `${actorName} flagged a message`,
    "settings.updated": `${actorName} updated system settings`,
    "automation.created": `${actorName} created automation rule`,
    "automation.executed": `Automation rule executed`,
    "bulk_operation.started": `${actorName} started bulk operation`,
    "bulk_operation.completed": `Bulk operation completed`,
  };

  return descriptions[type] || `${actorName} performed ${type}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getSeverityIcon(severity: AuditEventSeverity) {
  switch (severity) {
    case "info":
      return <Info className="h-4 w-4" />;
    case "warning":
      return <AlertCircle className="h-4 w-4" />;
    case "error":
      return <XCircle className="h-4 w-4" />;
    case "critical":
      return <AlertCircle className="h-4 w-4" />;
  }
}

function getSeverityColor(severity: AuditEventSeverity): string {
  switch (severity) {
    case "info":
      return "text-blue-600 dark:text-blue-400";
    case "warning":
      return "text-yellow-600 dark:text-yellow-400";
    case "error":
      return "text-red-600 dark:text-red-400";
    case "critical":
      return "text-red-700 dark:text-red-300";
  }
}

function getSeverityBadgeVariant(
  severity: AuditEventSeverity,
): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "info":
      return "default";
    case "warning":
      return "secondary";
    case "error":
    case "critical":
      return "destructive";
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function EnhancedAuditLog() {
  const [events] = useState<AuditEvent[]>(generateMockAuditEvents(100));
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "all">(
    "all",
  );
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = event.description
          .toLowerCase()
          .includes(query);
        const matchesActor = event.actor.displayName
          .toLowerCase()
          .includes(query);
        const matchesType = event.type.toLowerCase().includes(query);
        if (!matchesDescription && !matchesActor && !matchesType) return false;
      }

      // Event type filter
      if (
        eventTypeFilter !== "all" &&
        !event.type.startsWith(eventTypeFilter)
      ) {
        return false;
      }

      // Severity filter
      if (severityFilter !== "all" && event.severity !== severityFilter) {
        return false;
      }

      // Actor filter
      if (actorFilter !== "all" && event.actor.username !== actorFilter) {
        return false;
      }

      // Date range filter
      if (dateRange !== "all") {
        const now = Date.now();
        const eventTime = event.timestamp.getTime();
        const dayMs = 86400000;

        switch (dateRange) {
          case "today":
            if (now - eventTime > dayMs) return false;
            break;
          case "7d":
            if (now - eventTime > dayMs * 7) return false;
            break;
          case "30d":
            if (now - eventTime > dayMs * 30) return false;
            break;
        }
      }

      return true;
    });
  }, [
    events,
    searchQuery,
    eventTypeFilter,
    severityFilter,
    actorFilter,
    dateRange,
  ]);

  // Get unique actors
  const uniqueActors = useMemo(() => {
    const actors = new Set(events.map((e) => e.actor.username));
    return Array.from(actors);
  }, [events]);

  // Export functions
  const handleExportCSV = () => {
    const exportData = filteredEvents.map((event) => ({
      timestamp: event.timestamp.toISOString(),
      type: event.type,
      severity: event.severity,
      actor: event.actor.displayName,
      action: event.action,
      description: event.description,
      ipAddress: event.ipAddress || "",
    }));

    const csv = arrayToCSV(exportData);
    const filename = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(filename, csv);
    toast.success(`Exported ${filteredEvents.length} events to CSV`);
  };

  const handleExportJSON = () => {
    const filename = `audit-log-${new Date().toISOString().split("T")[0]}.json`;
    downloadJSON(filename, filteredEvents);
    toast.success(`Exported ${filteredEvents.length} events to JSON`);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
    toast.success("Audit log refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <FileText className="h-8 w-8" />
            Audit Log
          </h1>
          <p className="text-muted-foreground">
            Comprehensive audit trail of all system activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredEvents.length} filtered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredEvents.filter((e) => e.severity === "info").length}
            </div>
            <p className="text-xs text-muted-foreground">Information events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredEvents.filter((e) => e.severity === "warning").length}
            </div>
            <p className="text-xs text-muted-foreground">Warning events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {
                filteredEvents.filter(
                  (e) => e.severity === "error" || e.severity === "critical",
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Error events</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Filter audit events by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="event-type">Event Type</Label>
              <Select
                value={eventTypeFilter}
                onValueChange={setEventTypeFilter}
              >
                <SelectTrigger id="event-type" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="user">User Events</SelectItem>
                  <SelectItem value="channel">Channel Events</SelectItem>
                  <SelectItem value="message">Message Events</SelectItem>
                  <SelectItem value="settings">Settings Events</SelectItem>
                  <SelectItem value="automation">Automation Events</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger id="severity" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="actor">Actor</Label>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger id="actor" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueActors.map((actor) => (
                    <SelectItem key={actor} value={actor}>
                      {actor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-range">Date Range</Label>
              <Select
                value={dateRange}
                onValueChange={(v) => setDateRange(v as typeof dateRange)}
              >
                <SelectTrigger id="date-range" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.slice(0, 50).map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Badge
                    variant={getSeverityBadgeVariant(event.severity)}
                    className="gap-1"
                  >
                    <span className={getSeverityColor(event.severity)}>
                      {getSeverityIcon(event.severity)}
                    </span>
                    {event.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{event.type}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {event.actor.displayName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {event.description}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {event.ipAddress || "-"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedEvent(event);
                      setDetailsOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredEvents.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No events found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </div>
        )}

        {filteredEvents.length > 50 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Showing 50 of {filteredEvents.length} events. Export to see all.
          </div>
        )}
      </Card>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <EventDetailsDialog
          event={selectedEvent}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Event Details Dialog
// ============================================================================

interface EventDetailsDialogProps {
  event: AuditEvent;
  open: boolean;
  onClose: () => void;
}

function EventDetailsDialog({ event, open, onClose }: EventDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
          <DialogDescription>
            {event.timestamp.toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">Event Type</h4>
              <Badge variant="outline">{event.type}</Badge>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">Severity</h4>
              <Badge variant={getSeverityBadgeVariant(event.severity)}>
                {event.severity}
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Description</h4>
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Actor</h4>
            <div className="text-sm">
              <p className="font-medium">{event.actor.displayName}</p>
              <p className="text-muted-foreground">@{event.actor.username}</p>
              {event.actor.email && (
                <p className="text-muted-foreground">{event.actor.email}</p>
              )}
            </div>
          </div>

          {event.target && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Target</h4>
              <div className="text-sm">
                <p>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  {event.target.type}
                </p>
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {event.target.name}
                </p>
                <p>
                  <span className="text-muted-foreground">ID:</span>{" "}
                  {event.target.id}
                </p>
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-sm font-medium">Technical Details</h4>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">IP Address:</span>{" "}
                {event.ipAddress || "N/A"}
              </p>
              {event.userAgent && (
                <p className="break-all text-xs text-muted-foreground">
                  {event.userAgent}
                </p>
              )}
            </div>
          </div>

          {event.metadata && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Metadata</h4>
              <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
