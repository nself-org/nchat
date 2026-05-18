"use client";

/**
 * Moderation Queue Component
 * Displays flagged content for moderator review
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import type { QueueItem } from "@/lib/moderation/moderation-queue";

import { logger } from "@/lib/logger";

interface ModerationQueueProps {
  moderatorId: string;
  moderatorRole: string;
}

export function ModerationQueue({
  moderatorId,
  moderatorRole,
}: ModerationQueueProps) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch queue items
  useEffect(() => {
    fetchQueueItems();
  }, [filter]);

  const fetchQueueItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "pending") {
        params.set("status", "pending");
      }
      params.set("limit", "50");

      const response = await fetch(`/api/moderation/queue?${params}`);
      const data = await response.json();

      if (data.success) {
        setQueueItems(data.items);
      } else {
        toast.error("Failed to load queue items");
      }
    } catch (error) {
      logger.error("Error fetching queue items:", error);
      toast.error("Failed to load queue items");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    itemId: string,
    action: "approve" | "reject" | "warn",
  ) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/moderation/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          action,
          moderatorId,
          reason: actionNotes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setActionNotes("");
        setSelectedItem(null);
        fetchQueueItems();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      logger.error("Error performing action:", error);
      toast.error("Failed to perform action");
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-red-600 dark:text-red-400";
    if (score >= 0.6) return "text-orange-600 dark:text-orange-400";
    if (score >= 0.4) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Moderation Queue</h2>
          <p className="text-sm text-muted-foreground">
            Review and moderate flagged content
          </p>
        </div>
        <Button onClick={fetchQueueItems} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({queueItems.filter((i) => i.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="all">All Items</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {loading ? (
            <div className="py-8 text-center">Loading...</div>
          ) : queueItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="mb-4 h-12 w-12 text-green-600" />
                <h3 className="text-lg font-semibold">Queue is empty</h3>
                <p className="text-sm text-muted-foreground">
                  No items pending review
                </p>
              </CardContent>
            </Card>
          ) : (
            queueItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge variant="outline">{item.contentType}</Badge>
                        {item.isHidden && (
                          <Badge variant="secondary">
                            <EyeOff className="mr-1 h-3 w-3" />
                            Hidden
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base">
                        {item.userDisplayName || "Unknown User"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(item.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Content Preview */}
                  {item.contentText && (
                    <div className="rounded-md bg-muted p-3">
                      <p className="whitespace-pre-wrap font-mono text-sm">
                        {item.contentText.substring(0, 200)}
                        {item.contentText.length > 200 && "..."}
                      </p>
                    </div>
                  )}

                  {item.contentUrl && (
                    <div className="rounded-md bg-muted p-3">
                      <a
                        href={item.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View Content
                      </a>
                    </div>
                  )}

                  {/* AI Detection Scores */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {item.toxicScore > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Toxic
                        </div>
                        <div
                          className={`text-lg font-bold ${getScoreColor(item.toxicScore)}`}
                        >
                          {(item.toxicScore * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                    {item.nsfwScore > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground">
                          NSFW
                        </div>
                        <div
                          className={`text-lg font-bold ${getScoreColor(item.nsfwScore)}`}
                        >
                          {(item.nsfwScore * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                    {item.spamScore > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Spam
                        </div>
                        <div
                          className={`text-lg font-bold ${getScoreColor(item.spamScore)}`}
                        >
                          {(item.spamScore * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                    {item.profanityDetected && (
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Profanity
                        </div>
                        <div className="text-lg font-bold text-orange-600">
                          Yes
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detected Issues */}
                  {item.aiFlags && item.aiFlags.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs text-muted-foreground">
                        Detected Issues:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.aiFlags.map((flag, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs"
                          >
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto Action */}
                  {item.autoAction && item.autoAction !== "none" && (
                    <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950">
                      <div className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                        Auto Action: {item.autoAction}
                      </div>
                      {item.autoActionReason && (
                        <div className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                          {item.autoActionReason}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {selectedItem?.id === item.id ? (
                    <div className="space-y-3 border-t pt-3">
                      <Textarea
                        placeholder="Add notes (optional)..."
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAction(item.id, "approve")}
                          disabled={actionLoading}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(item.id, "warn")}
                          disabled={actionLoading}
                        >
                          <AlertTriangle className="mr-1 h-4 w-4" />
                          Warn
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(item.id, "reject")}
                          disabled={actionLoading}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedItem(null);
                            setActionNotes("");
                          }}
                          disabled={actionLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 border-t pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedItem(item)}
                      >
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Review
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {/* Similar to pending, but shows all items */}
          <div className="py-8 text-center text-muted-foreground">
            All queue items view (implement similar to pending)
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
