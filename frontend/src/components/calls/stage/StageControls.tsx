/**
 * Stage Controls Component
 *
 * Control panel for stage moderators with speaker queue management,
 * stage settings, and moderation actions.
 */

"use client";

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Users,
  Settings,
  Crown,
  Hand,
  Play,
  Pause,
  Square,
  Circle,
  UserPlus,
  UserMinus,
  Volume2,
  VolumeX,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit3,
  MessageSquare,
  Bell,
  BellOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  StageChannel,
  StageSettings,
  StageParticipant,
  RaiseHandRequest,
  StageModerationLog,
} from "@/types/stage";

// =============================================================================
// Types
// =============================================================================

export interface StageControlsProps {
  stage: StageChannel;
  settings: StageSettings;
  speakers: StageParticipant[];
  listeners: StageParticipant[];
  raiseHandRequests: RaiseHandRequest[];
  moderationLog: StageModerationLog[];
  isRecording: boolean;
  onUpdateTopic: (topic: string) => void;
  onUpdateSettings: (settings: Partial<StageSettings>) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseStage: () => void;
  onResumeStage: () => void;
  onEndStage: () => void;
  onMuteAll: () => void;
  onAcceptRaiseHand: (requestId: string) => void;
  onDeclineRaiseHand: (requestId: string) => void;
  onDeclineAllRaiseHands: () => void;
  onInviteToSpeak: (userId: string) => void;
  onMoveToAudience: (userId: string) => void;
  onMuteSpeaker: (userId: string) => void;
  onPromoteToModerator: (userId: string) => void;
  onRemoveFromStage: (userId: string) => void;
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function StageControls({
  stage,
  settings,
  speakers,
  listeners,
  raiseHandRequests,
  moderationLog,
  isRecording,
  onUpdateTopic,
  onUpdateSettings,
  onStartRecording,
  onStopRecording,
  onPauseStage,
  onResumeStage,
  onEndStage,
  onMuteAll,
  onAcceptRaiseHand,
  onDeclineRaiseHand,
  onDeclineAllRaiseHands,
  onInviteToSpeak,
  onMoveToAudience,
  onMuteSpeaker,
  onPromoteToModerator,
  onRemoveFromStage,
  className,
}: StageControlsProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [editingTopic, setEditingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState(stage.topic);

  const pendingRequests = raiseHandRequests.filter(
    (r) => r.status === "pending",
  );

  const handleTopicSave = () => {
    onUpdateTopic(newTopic);
    setEditingTopic(false);
  };

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <Tabs defaultValue="speakers" className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="speakers" className="gap-1">
            <Mic className="h-4 w-4" />
            Speakers
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1 relative">
            <Hand className="h-4 w-4" />
            Queue
            {pendingRequests.length > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-4 w-4 p-0 text-[10px]"
              >
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1">
            <MessageSquare className="h-4 w-4" />
            Log
          </TabsTrigger>
        </TabsList>

        {/* Speakers Tab */}
        <TabsContent value="speakers" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {/* Topic Editor */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Current Topic</h4>
                  {!editingTopic && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTopic(true)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {editingTopic ? (
                  <div className="mt-2 space-y-2">
                    <Input
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      placeholder="Enter topic..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleTopicSave}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewTopic(stage.topic);
                          setEditingTopic(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stage.topic}
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMuteAll}
                  className="gap-1"
                >
                  <VolumeX className="h-4 w-4" />
                  Mute All
                </Button>

                {stage.isRecordingEnabled &&
                  (isRecording ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={onStopRecording}
                      className="gap-1"
                    >
                      <Square className="h-4 w-4" />
                      Stop Recording
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onStartRecording}
                      className="gap-1"
                    >
                      <Circle className="h-4 w-4 text-red-500" />
                      Start Recording
                    </Button>
                  ))}

                {stage.status === "live" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPauseStage}
                    className="gap-1"
                  >
                    <Pause className="h-4 w-4" />
                    Pause Stage
                  </Button>
                ) : stage.status === "paused" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResumeStage}
                    className="gap-1"
                  >
                    <Play className="h-4 w-4" />
                    Resume Stage
                  </Button>
                ) : null}
              </div>

              <Separator />

              {/* Speakers List */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Mic className="h-4 w-4" />
                  Current Speakers ({speakers.length})
                </h4>
                <div className="space-y-2">
                  {speakers.map((speaker) => (
                    <SpeakerControlItem
                      key={speaker.userId}
                      participant={speaker}
                      onMute={() => onMuteSpeaker(speaker.userId)}
                      onMoveToAudience={() => onMoveToAudience(speaker.userId)}
                      onPromote={() => onPromoteToModerator(speaker.userId)}
                      onRemove={() => onRemoveFromStage(speaker.userId)}
                    />
                  ))}
                  {speakers.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No speakers yet
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Invite Listeners */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <UserPlus className="h-4 w-4" />
                  Invite to Speak
                </h4>
                <div className="space-y-2">
                  {listeners.slice(0, 10).map((listener) => (
                    <ListenerInviteItem
                      key={listener.userId}
                      participant={listener}
                      onInvite={() => onInviteToSpeak(listener.userId)}
                    />
                  ))}
                  {listeners.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No listeners to invite
                    </p>
                  )}
                  {listeners.length > 10 && (
                    <p className="text-sm text-muted-foreground">
                      +{listeners.length - 10} more listeners
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {pendingRequests.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      Pending Requests ({pendingRequests.length})
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDeclineAllRaiseHands}
                    >
                      Decline All
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {pendingRequests.map((request, index) => (
                      <RaiseHandQueueItem
                        key={request.id}
                        request={request}
                        position={index + 1}
                        onAccept={() => onAcceptRaiseHand(request.id)}
                        onDecline={() => onDeclineRaiseHand(request.id)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Hand className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No pending requests
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-6 p-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Raise Hand Settings</h4>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-raise-hand">Allow raise hand</Label>
                  <Switch
                    id="allow-raise-hand"
                    checked={settings.allowRaiseHand}
                    onCheckedChange={(checked) =>
                      onUpdateSettings({ allowRaiseHand: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-accept">Auto-accept requests</Label>
                  <Switch
                    id="auto-accept"
                    checked={settings.autoAcceptRaiseHand}
                    onCheckedChange={(checked) =>
                      onUpdateSettings({ autoAcceptRaiseHand: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-raise-hand">
                    Notify on raise hand
                  </Label>
                  <Switch
                    id="notify-raise-hand"
                    checked={settings.notifyOnRaiseHand}
                    onCheckedChange={(checked) =>
                      onUpdateSettings({ notifyOnRaiseHand: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Stage Settings</h4>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-chat">Allow chat</Label>
                  <Switch
                    id="allow-chat"
                    checked={settings.allowChat}
                    onCheckedChange={(checked) =>
                      onUpdateSettings({ allowChat: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-reactions">Allow reactions</Label>
                  <Switch
                    id="allow-reactions"
                    checked={settings.allowReactions}
                    onCheckedChange={(checked) =>
                      onUpdateSettings({ allowReactions: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="mute-on-join">Mute listeners on join</Label>
                  <Switch
                    id="mute-on-join"
                    checked={settings.muteListenersOnJoin}
                    onCheckedChange={(checked) =>
                      onUpdateSettings({ muteListenersOnJoin: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* End Stage */}
              <div>
                <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      End Stage
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>End Stage?</DialogTitle>
                      <DialogDescription>
                        This will end the stage for all participants. This
                        action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowEndConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          onEndStage();
                          setShowEndConfirm(false);
                        }}
                      >
                        End Stage
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Log Tab */}
        <TabsContent value="log" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
              {moderationLog.length > 0 ? (
                moderationLog.map((log) => (
                  <ModerationLogItem key={log.id} log={log} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No moderation actions yet
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// Speaker Control Item
// =============================================================================

interface SpeakerControlItemProps {
  participant: StageParticipant;
  onMute: () => void;
  onMoveToAudience: () => void;
  onPromote: () => void;
  onRemove: () => void;
}

function SpeakerControlItem({
  participant,
  onMute,
  onMoveToAudience,
  onPromote,
  onRemove,
}: SpeakerControlItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {participant.user.displayName}
          </span>
          {participant.role === "moderator" && (
            <Badge variant="default" className="h-5 gap-1 text-xs">
              <Crown className="h-3 w-3" />
              Mod
            </Badge>
          )}
          {participant.isMuted && <MicOff className="h-4 w-4 text-red-500" />}
        </div>
      </div>

      <div className="flex gap-1">
        {!participant.isMuted && participant.role !== "moderator" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMute}
          >
            <MicOff className="h-4 w-4" />
          </Button>
        )}
        {participant.role === "speaker" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMoveToAudience}
            >
              <UserMinus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onPromote}
            >
              <Shield className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Listener Invite Item
// =============================================================================

interface ListenerInviteItemProps {
  participant: StageParticipant;
  onInvite: () => void;
}

function ListenerInviteItem({
  participant,
  onInvite,
}: ListenerInviteItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {participant.user.displayName}
          </span>
          {participant.hasRaisedHand && (
            <Badge variant="secondary" className="h-5 gap-1 text-xs">
              <Hand className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onInvite}>
        <UserPlus className="mr-1 h-4 w-4" />
        Invite
      </Button>
    </div>
  );
}

// =============================================================================
// Raise Hand Queue Item
// =============================================================================

interface RaiseHandQueueItemProps {
  request: RaiseHandRequest;
  position: number;
  onAccept: () => void;
  onDecline: () => void;
}

function RaiseHandQueueItem({
  request,
  position,
  onAccept,
  onDecline,
}: RaiseHandQueueItemProps) {
  const waitTime = Math.floor(
    (Date.now() - new Date(request.requestedAt).getTime()) / 1000,
  );
  const waitMinutes = Math.floor(waitTime / 60);
  const waitSeconds = waitTime % 60;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-amber-50 p-3 dark:bg-amber-900/20">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-sm font-medium dark:bg-amber-800">
        {position}
      </div>

      <div className="flex-1 min-w-0">
        <span className="font-medium">{request.user.displayName}</span>
        {request.message && (
          <p className="truncate text-sm text-muted-foreground">
            {request.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Waiting {waitMinutes > 0 ? `${waitMinutes}m ` : ""}
          {waitSeconds}s
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={onAccept}>
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={onDecline}>
          <XCircle className="mr-1 h-4 w-4" />
          Decline
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Moderation Log Item
// =============================================================================

interface ModerationLogItemProps {
  log: StageModerationLog;
}

function ModerationLogItem({ log }: ModerationLogItemProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "invite_to_speak":
        return <Mic className="h-4 w-4 text-green-500" />;
      case "move_to_audience":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "mute_speaker":
        return <MicOff className="h-4 w-4 text-yellow-500" />;
      case "accept_raise_hand":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "decline_raise_hand":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "remove_from_stage":
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case "end_stage":
        return <Square className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getActionText = (action: string): string => {
    switch (action) {
      case "invite_to_speak":
        return "invited to speak";
      case "move_to_audience":
        return "moved to audience";
      case "mute_speaker":
        return "muted";
      case "accept_raise_hand":
        return "accepted raise hand";
      case "decline_raise_hand":
        return "declined raise hand";
      case "remove_from_stage":
        return "removed from stage";
      case "promote_to_moderator":
        return "promoted to moderator";
      case "demote_from_moderator":
        return "demoted from moderator";
      case "end_stage":
        return "ended the stage";
      case "pause_stage":
        return "paused the stage";
      case "resume_stage":
        return "resumed the stage";
      case "start_recording":
        return "started recording";
      case "stop_recording":
        return "stopped recording";
      case "update_topic":
        return "updated the topic";
      default:
        return action.replace(/_/g, " ");
    }
  };

  const time = new Date(log.timestamp).toLocaleTimeString();

  return (
    <div className="flex items-start gap-3 rounded-lg border p-2 text-sm">
      {getActionIcon(log.action)}
      <div className="flex-1 min-w-0">
        <span className="font-medium">{log.moderator.displayName}</span>
        <span className="text-muted-foreground">
          {" "}
          {getActionText(log.action)}
        </span>
        {log.targetUser && (
          <span className="font-medium"> {log.targetUser.displayName}</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{time}</span>
    </div>
  );
}

export default StageControls;
