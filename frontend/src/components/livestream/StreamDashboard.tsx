"use client";

/**
 * Stream Dashboard Component
 *
 * Broadcaster dashboard for managing live streams with
 * real-time analytics, chat moderation, and stream controls.
 *
 * @module components/livestream/StreamDashboard
 */

import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Radio,
  Users,
  MessageSquare,
  Heart,
  Clock,
  Eye,
  TrendingUp,
  Settings,
  Shield,
  Video,
  Mic,
  Monitor,
  StopCircle,
  Copy,
  RefreshCw,
} from "lucide-react";
import type {
  Stream,
  RealTimeAnalytics,
  ChatMode,
  AutoModConfig,
} from "@/services/livestream/types";

// ============================================================================
// Types
// ============================================================================

export interface StreamDashboardProps {
  stream: Stream;
  analytics: RealTimeAnalytics;
  isLive: boolean;
  onStartStream: () => Promise<void>;
  onEndStream: () => Promise<void>;
  onUpdateStream: (updates: Partial<Stream>) => Promise<void>;
  onRegenerateKey: () => Promise<string>;
  onSetChatMode: (mode: ChatMode) => Promise<void>;
  onSetSlowMode: (seconds: number) => Promise<void>;
  onUpdateAutoMod: (config: Partial<AutoModConfig>) => Promise<void>;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function StreamDashboard({
  stream,
  analytics,
  isLive,
  onStartStream,
  onEndStream,
  onUpdateStream,
  onRegenerateKey,
  onSetChatMode,
  onSetSlowMode,
  onUpdateAutoMod,
  className,
}: StreamDashboardProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleStartStream = useCallback(async () => {
    setIsStarting(true);
    try {
      await onStartStream();
    } finally {
      setIsStarting(false);
    }
  }, [onStartStream]);

  const handleEndStream = useCallback(async () => {
    if (!confirm("Are you sure you want to end the stream?")) return;

    setIsEnding(true);
    try {
      await onEndStream();
    } finally {
      setIsEnding(false);
    }
  }, [onEndStream]);

  const handleCopyStreamKey = useCallback(() => {
    navigator.clipboard.writeText(stream.streamKey);
  }, [stream.streamKey]);

  const handleRegenerateKey = useCallback(async () => {
    if (
      !confirm(
        "Regenerating the stream key will invalidate the current one. Continue?",
      )
    ) {
      return;
    }
    await onRegenerateKey();
  }, [onRegenerateKey]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stream Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isLive ? (
            <Badge variant="destructive" className="animate-pulse">
              <Radio className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          ) : (
            <Badge variant="outline">Offline</Badge>
          )}
          <h2 className="text-xl font-semibold">{stream.title}</h2>
        </div>

        <div className="flex items-center gap-2">
          {isLive ? (
            <Button
              variant="destructive"
              onClick={handleEndStream}
              disabled={isEnding}
            >
              <StopCircle className="h-4 w-4 mr-2" />
              {isEnding ? "Ending..." : "End Stream"}
            </Button>
          ) : (
            <Button onClick={handleStartStream} disabled={isStarting}>
              <Radio className="h-4 w-4 mr-2" />
              {isStarting ? "Starting..." : "Go Live"}
            </Button>
          )}
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viewers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.currentViewers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {analytics.viewerDelta >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />
              )}
              {analytics.viewerDelta >= 0 ? "+" : ""}
              {analytics.viewerDelta} from last minute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Viewers</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.peakViewers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalViews.toLocaleString()} total views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat/min</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.chatMessagesPerMinute}
            </div>
            <p className="text-xs text-muted-foreground">messages per minute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reactions/min</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.reactionsPerMinute}
            </div>
            <p className="text-xs text-muted-foreground">
              reactions per minute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.healthScore}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.bufferingRatio.toFixed(1)}% buffering
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Video className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="moderation">
            <Shield className="h-4 w-4 mr-2" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Stream Info */}
            <Card>
              <CardHeader>
                <CardTitle>Stream Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Stream Key</Label>
                  <div className="flex gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                      {showStreamKey
                        ? stream.streamKey
                        : "************************"}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowStreamKey(!showStreamKey)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyStreamKey}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRegenerateKey}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Ingest URL</Label>
                  <code className="block mt-1 p-2 bg-muted rounded text-sm font-mono truncate">
                    {stream.ingestUrl}
                  </code>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Resolution</Label>
                    <p className="text-sm font-medium">
                      {stream.maxResolution}
                    </p>
                  </div>
                  <div>
                    <Label>Bitrate</Label>
                    <p className="text-sm font-medium">
                      {stream.bitrateKbps} kbps
                    </p>
                  </div>
                  <div>
                    <Label>FPS</Label>
                    <p className="text-sm font-medium">{stream.fps}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Session Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Duration</Label>
                    <p className="text-2xl font-bold">
                      {stream.startedAt
                        ? formatDuration(
                            Math.floor(
                              (Date.now() -
                                new Date(stream.startedAt).getTime()) /
                                1000,
                            ),
                          )
                        : "00:00:00"}
                    </p>
                  </div>
                  <div>
                    <Label>Avg Watch Time</Label>
                    <p className="text-2xl font-bold">
                      {formatDuration(Math.floor(analytics.averageWatchTime))}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Total Messages</Label>
                    <p className="text-xl font-bold">
                      {stream.totalChatMessages.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label>Total Reactions</Label>
                    <p className="text-xl font-bold">
                      {stream.totalReactions.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <span className="text-sm">
                      Recording: {stream.isRecorded ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Moderation Tab */}
        <TabsContent value="moderation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Chat Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="chat-mode">Chat Mode</Label>
                  <Select
                    value={stream.chatMode}
                    onValueChange={(value) => onSetChatMode(value as ChatMode)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="followers">Followers Only</SelectItem>
                      <SelectItem value="subscribers">
                        Subscribers Only
                      </SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Slow Mode</Label>
                    <span className="text-sm text-muted-foreground">
                      {stream.slowModeSeconds}s
                    </span>
                  </div>
                  <Slider
                    value={[stream.slowModeSeconds]}
                    onValueChange={([value]) => onSetSlowMode(value)}
                    min={0}
                    max={120}
                    step={5}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="reactions">Enable Reactions</Label>
                  <Switch
                    id="reactions"
                    checked={stream.enableReactions}
                    onCheckedChange={(checked) =>
                      onUpdateStream({ enableReactions: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auto-Moderation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="profanity">Profanity Filter</Label>
                  <Switch
                    id="profanity"
                    defaultChecked
                    onCheckedChange={(checked) =>
                      onUpdateAutoMod({ profanityFilter: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="spam">Spam Detection</Label>
                  <Switch
                    id="spam"
                    defaultChecked
                    onCheckedChange={(checked) =>
                      onUpdateAutoMod({ spamDetection: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="links">Block Links</Label>
                  <Switch
                    id="links"
                    onCheckedChange={(checked) =>
                      onUpdateAutoMod({ linkBlocking: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stream Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <Video className="h-6 w-6" />
                  Camera
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <Monitor className="h-6 w-6" />
                  Screen Share
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <Mic className="h-6 w-6" />
                  Audio Only
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StreamDashboard;
