"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ConnectionStatus,
  ConnectionStatusCard,
  InlineConnectionStatus,
  ConnectionQualityBar,
} from "./ConnectionStatus";
import { PresenceIndicator, PresenceBadge } from "../user/PresenceIndicator";
import {
  TypingIndicator,
  InlineTypingIndicator,
} from "../chat/typing-indicator";
import type { TypingUser as MessageTypingUser } from "@/types/message";
import {
  MessageInputWithTyping,
  MinimalMessageInput,
} from "../chat/MessageInputWithTyping";
import { useTyping } from "@/hooks/use-typing";
import { usePresence } from "@/hooks/use-presence";
import type { PresenceStatus } from "@/lib/presence/presence-types";
import { useRealtime } from "@/contexts/realtime-context";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

/**
 * Realtime features demo component
 * Shows all real-time features in action
 */
export function RealtimeDemo() {
  const [selectedTab, setSelectedTab] = useState("connection");
  const [presenceStatus, setPresenceStatus] =
    useState<PresenceStatus>("online");
  const [messages, setMessages] = useState<string[]>([]);

  const channelId = "demo-channel";
  const demoUserIds = ["user-1", "user-2", "user-3"];

  const { isConnected, connectionState, reconnectAttempts } = useRealtime();
  const { typingUsers } = useTyping(channelId);
  const { presence } = usePresence(demoUserIds);
  const currentStatus = presenceStatus;

  // Map hook TypingUser (startedAt: string) to component TypingUser (startedAt: Date)
  const mappedTypingUsers: MessageTypingUser[] = typingUsers.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    startedAt: new Date(u.startedAt),
  }));

  const handleSendMessage = (content: string) => {
    setMessages((prev) => [...prev, content]);
    // REMOVED: console.log('Message sent:', content)
  };

  const handlePresenceChange = (status: PresenceStatus) => {
    setPresenceStatus(status);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-time Features Demo</h1>
          <p className="text-muted-foreground">
            Interactive demonstration of all real-time features
          </p>
        </div>
        <InlineConnectionStatus showLabel />
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="presence">Presence</TabsTrigger>
          <TabsTrigger value="typing">Typing</TabsTrigger>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connection" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ConnectionStatusCard />

            <Card>
              <CardHeader>
                <CardTitle>Connection Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">State</span>
                    <Badge variant={isConnected ? "default" : "destructive"}>
                      {connectionState}
                    </Badge>
                  </div>
                  {reconnectAttempts > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Reconnect Attempts
                      </span>
                      <Badge variant="outline">{reconnectAttempts}</Badge>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Connection Quality</h4>
                  <ConnectionQualityBar />
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Indicator Styles</h4>
                  <div className="flex items-center gap-2">
                    <InlineConnectionStatus showLabel />
                    <InlineConnectionStatus />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Floating Connection Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 relative h-40 rounded-lg border">
                <ConnectionStatus show position="top-right" showStats />
                <ConnectionStatus show position="bottom-left" compact />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Presence Tab */}
        <TabsContent value="presence" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Presence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <PresenceBadge
                    userId="current-user"
                    showCustomStatus
                    showTooltip
                  />
                  <Badge>Current: {currentStatus}</Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Change Status</h4>
                  <div className="flex gap-2">
                    {(
                      ["online", "away", "dnd", "offline"] as PresenceStatus[]
                    ).map((s) => (
                      <Button
                        key={s}
                        onClick={() => handlePresenceChange(s)}
                        size="sm"
                        variant={presenceStatus === s ? "default" : "outline"}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Presence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {demoUserIds.map((userId) => {
                    const userPresence = presence.get(userId);
                    return (
                      <div
                        key={userId}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 rounded-full bg-muted">
                            <PresenceIndicator
                              userId={userId}
                              showTooltip
                              showLastSeen
                            />
                          </div>
                          <div>
                            <div className="font-medium">{userId}</div>
                            <div className="text-xs text-muted-foreground">
                              {userPresence?.status || "offline"}
                            </div>
                          </div>
                        </div>
                        <PresenceBadge userId={userId} />
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Indicator Sizes</h4>
                  <div className="flex items-center gap-4">
                    <div className="relative h-8 w-8 rounded-full bg-muted">
                      <PresenceIndicator userId="user-1" size="xs" />
                    </div>
                    <div className="relative h-10 w-10 rounded-full bg-muted">
                      <PresenceIndicator userId="user-1" size="sm" />
                    </div>
                    <div className="relative h-12 w-12 rounded-full bg-muted">
                      <PresenceIndicator userId="user-1" size="md" />
                    </div>
                    <div className="relative h-14 w-14 rounded-full bg-muted">
                      <PresenceIndicator userId="user-1" size="lg" />
                    </div>
                    <div className="relative h-16 w-16 rounded-full bg-muted">
                      <PresenceIndicator userId="user-1" size="xl" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Typing Tab */}
        <TabsContent value="typing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Typing Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Currently Typing</h4>
                  {typingUsers.length > 0 ? (
                    <TypingIndicator users={mappedTypingUsers} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No one is typing
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Inline Indicator</h4>
                  <div className="bg-muted/50 rounded-lg border p-4">
                    <InlineTypingIndicator users={mappedTypingUsers} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Typing Count</h4>
                  <Badge>{typingUsers.length} user(s) typing</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Typing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Type in the input below to trigger typing indicators
                </p>
                <MessageInputWithTyping
                  channelId={channelId}
                  onSendMessage={handleSendMessage}
                  placeholder="Start typing to see the indicator..."
                  showCharCount
                  maxLength={500}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Messaging Tab */}
        <TabsContent value="messaging" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Full Message Input</CardTitle>
              </CardHeader>
              {/* eslint-disable jsx-a11y/no-autofocus */}
              <CardContent className="space-y-4">
                <MessageInputWithTyping
                  channelId={channelId}
                  onSendMessage={handleSendMessage}
                  placeholder="Type a message..."
                  showCharCount
                  maxLength={2000}
                  autoFocus
                />
                {/* eslint-enable jsx-a11y/no-autofocus */}

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Sent Messages</h4>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No messages yet
                      </p>
                    ) : (
                      messages.map((msg, i) => (
                        <div
                          key={i}
                          className="bg-primary/10 rounded-lg px-3 py-2 text-sm"
                        >
                          {msg}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Minimal Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MinimalMessageInput
                  channelId={channelId}
                  onSendMessage={handleSendMessage}
                  placeholder="Quick message..."
                />

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Features</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>✓ Typing indicators</li>
                    <li>✓ Auto-resize textarea</li>
                    <li>✓ Enter to send, Shift+Enter for new line</li>
                    <li>✓ Character count (optional)</li>
                    <li>✓ Send button with loading state</li>
                    <li>✓ Auto-focus support</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
