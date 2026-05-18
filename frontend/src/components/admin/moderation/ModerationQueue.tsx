/**
 * Moderation Queue Component
 * Displays flagged content for review
 */

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Flag,
  Shield,
} from "lucide-react";
import type { QueueItem } from "@/lib/moderation/moderation-queue";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";

interface ModerationQueueProps {
  onAction?: (itemId: string, action: string) => void;
}

export function ModerationQueue({ onAction }: ModerationQueueProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "high-priority">(
    "pending",
  );

  useEffect(() => {
    fetchQueueItems();
  }, [filter]);

  const fetchQueueItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "pending") params.set("status", "pending");
      if (filter === "high-priority") params.set("priority", "high,critical");

      const response = await fetch(`/api/moderation/queue?${params}`);
      const data = await response.json();

      if (data.success) {
        setItems(data.items || []);
      }
    } catch (error) {
      logger.error("Failed to fetch queue items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (itemId: string, action: string) => {
    try {
      const response = await fetch("/api/moderation/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          action,
          moderatorId: user?.id || "unknown",
          reason: `Action: ${action}`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh queue
        fetchQueueItems();
        onAction?.(itemId, action);
      }
    } catch (error) {
      logger.error("Action failed:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      case "reviewing":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Moderation Queue</h2>
          <p className="text-muted-foreground">Review flagged content</p>
        </div>
        <Button onClick={fetchQueueItems} variant="outline">
          Refresh
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">
            <Flag className="mr-2 h-4 w-4" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="high-priority">
            <AlertTriangle className="mr-2 h-4 w-4" />
            High Priority
          </TabsTrigger>
          <TabsTrigger value="all">
            <Shield className="mr-2 h-4 w-4" />
            All Items
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading queue items...</p>
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                <p className="text-muted-foreground">No items in queue</p>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                        <Badge variant="outline">{item.contentType}</Badge>
                        {item.isHidden && (
                          <Badge variant="destructive">
                            <EyeOff className="mr-1 h-3 w-3" />
                            Hidden
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">
                        {item.userDisplayName || "Unknown User"}
                      </CardTitle>
                      <CardDescription>
                        {new Date(item.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Content Preview */}
                  {item.contentText && (
                    <div className="rounded-lg bg-muted p-4">
                      <p className="line-clamp-4 whitespace-pre-wrap text-sm">
                        {item.contentText}
                      </p>
                    </div>
                  )}

                  {/* AI Flags */}
                  {item.aiFlags && item.aiFlags.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">AI Detections:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.aiFlags.map((flag, index) => (
                          <Badge key={index} variant="secondary">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {item.toxicScore > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Toxicity
                        </p>
                        <p className="text-lg font-semibold">
                          {(item.toxicScore * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                    {item.spamScore > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Spam</p>
                        <p className="text-lg font-semibold">
                          {(item.spamScore * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                    {item.nsfwScore > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">NSFW</p>
                        <p className="text-lg font-semibold">
                          {(item.nsfwScore * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Confidence
                      </p>
                      <p className="text-lg font-semibold">
                        {(item.confidenceScore * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {/* Profanity */}
                  {item.profanityDetected && item.profanityWords && (
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Profanity Detected:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.profanityWords.map((word, index) => (
                          <Badge key={index} variant="destructive">
                            {word}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto Action */}
                  {item.autoAction && item.autoAction !== "none" && (
                    <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                      <p className="mb-1 text-sm font-medium">
                        Auto Action: {item.autoAction}
                      </p>
                      {item.autoActionReason && (
                        <p className="text-xs text-muted-foreground">
                          {item.autoActionReason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {item.status === "pending" && (
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      <Button
                        onClick={() => handleAction(item.id, "approve")}
                        variant="default"
                        size="sm"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleAction(item.id, "reject")}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                      <Button
                        onClick={() => handleAction(item.id, "warn")}
                        variant="outline"
                        size="sm"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Warn User
                      </Button>
                      {!item.isHidden && (
                        <Button
                          onClick={() => handleAction(item.id, "hide")}
                          variant="outline"
                          size="sm"
                        >
                          <EyeOff className="mr-2 h-4 w-4" />
                          Hide
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Review Info */}
                  {item.status !== "pending" && item.reviewedBy && (
                    <div className="text-sm text-muted-foreground">
                      Reviewed by {item.reviewedBy} on{" "}
                      {new Date(item.reviewedAt!).toLocaleString()}
                      {item.moderatorNotes && (
                        <p className="mt-1">Notes: {item.moderatorNotes}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
