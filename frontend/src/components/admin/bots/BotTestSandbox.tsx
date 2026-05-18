/**
 * Bot Test Sandbox Component
 *
 * Interactive testing environment for bots with simulated events,
 * response preview, and debugging tools.
 */

"use client";

import { useState } from "react";
import {
  Play,
  RotateCcw,
  Code,
  MessageSquare,
  User,
  Hash,
  Zap,
  Bug,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TestEvent {
  type: string;
  userId: string;
  channelId: string;
  content?: string;
  metadata?: Record<string, any>;
}

interface TestResult {
  success: boolean;
  response?: any;
  error?: string;
  executionTime: number;
  stateChanges?: any[];
  logs?: string[];
}

interface BotTestSandboxProps {
  botId: string;
  botName: string;
  botCode?: string;
  onTest?: (event: TestEvent) => Promise<TestResult>;
}

// Predefined test scenarios
const TEST_SCENARIOS = [
  {
    id: "simple-message",
    name: "Simple Message",
    description: "Test basic message handling",
    event: {
      type: "message_created",
      userId: "user-1",
      channelId: "channel-1",
      content: "Hello bot!",
    },
  },
  {
    id: "command",
    name: "Slash Command",
    description: "Test command execution",
    event: {
      type: "message_created",
      userId: "user-1",
      channelId: "channel-1",
      content: "/help",
    },
  },
  {
    id: "mention",
    name: "Bot Mention",
    description: "Test bot mention handling",
    event: {
      type: "message_created",
      userId: "user-1",
      channelId: "channel-1",
      content: "@bot hello",
      metadata: { isMention: true },
    },
  },
  {
    id: "user-join",
    name: "User Join",
    description: "Test user join event",
    event: {
      type: "user_joined",
      userId: "user-2",
      channelId: "channel-1",
    },
  },
  {
    id: "reaction",
    name: "Reaction Added",
    description: "Test reaction event",
    event: {
      type: "reaction_added",
      userId: "user-1",
      channelId: "channel-1",
      metadata: { emoji: "👍", messageId: "msg-123" },
    },
  },
];

export function BotTestSandbox({
  botId,
  botName,
  botCode,
  onTest,
}: BotTestSandboxProps) {
  const [eventType, setEventType] = useState("message_created");
  const [userId, setUserId] = useState("user-test-1");
  const [channelId, setChannelId] = useState("channel-test-1");
  const [messageContent, setMessageContent] = useState("");
  const [customMetadata, setCustomMetadata] = useState("{}");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [debugMode, setDebugMode] = useState(true);
  const [testHistory, setTestHistory] = useState<
    Array<{ event: TestEvent; result: TestResult; timestamp: Date }>
  >([]);

  // Load predefined scenario
  const loadScenario = (scenarioId: string) => {
    const scenario = TEST_SCENARIOS.find((s) => s.id === scenarioId);
    if (scenario) {
      setEventType(scenario.event.type);
      setUserId(scenario.event.userId);
      setChannelId(scenario.event.channelId);
      setMessageContent(scenario.event.content || "");
      setCustomMetadata(JSON.stringify(scenario.event.metadata || {}, null, 2));
    }
  };

  // Run test
  const runTest = async () => {
    setIsRunning(true);
    setTestResult(null);

    try {
      const event: TestEvent = {
        type: eventType,
        userId,
        channelId,
        content: messageContent,
        metadata: JSON.parse(customMetadata),
      };

      const startTime = Date.now();

      // Simulate test execution
      const result: TestResult = onTest
        ? await onTest(event)
        : {
            success: true,
            response: {
              type: "message",
              content: "Test response from bot",
            },
            executionTime: Date.now() - startTime,
            logs: [
              "[INFO] Bot initialized",
              "[DEBUG] Processing event: message_created",
              "[INFO] Response generated successfully",
            ],
          };

      setTestResult(result);
      setTestHistory((prev) => [
        { event, result, timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
        executionTime: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Reset test
  const resetTest = () => {
    setTestResult(null);
    setMessageContent("");
    setCustomMetadata("{}");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Bug className="h-6 w-6" />
          Test Sandbox - {botName}
        </h2>
        <p className="text-muted-foreground">
          Send test events to your bot and inspect responses
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Event Configuration</CardTitle>
              <CardDescription>
                Configure the event to send to your bot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Scenarios */}
              <div className="space-y-2">
                <Label>Quick Scenarios</Label>
                <div className="flex flex-wrap gap-2">
                  {TEST_SCENARIOS.map((scenario) => (
                    <Button
                      key={scenario.id}
                      variant="outline"
                      size="sm"
                      onClick={() => loadScenario(scenario.id)}
                    >
                      {scenario.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Event Type */}
              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger id="event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message_created">
                      Message Created
                    </SelectItem>
                    <SelectItem value="message_edited">
                      Message Edited
                    </SelectItem>
                    <SelectItem value="message_deleted">
                      Message Deleted
                    </SelectItem>
                    <SelectItem value="reaction_added">
                      Reaction Added
                    </SelectItem>
                    <SelectItem value="user_joined">User Joined</SelectItem>
                    <SelectItem value="user_left">User Left</SelectItem>
                    <SelectItem value="mention">Bot Mentioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* User ID */}
              <div className="space-y-2">
                <Label htmlFor="user-id" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  User ID
                </Label>
                <Input
                  id="user-id"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="user-123"
                />
              </div>

              {/* Channel ID */}
              <div className="space-y-2">
                <Label htmlFor="channel-id" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Channel ID
                </Label>
                <Input
                  id="channel-id"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder="channel-123"
                />
              </div>

              {/* Message Content */}
              {eventType.includes("message") && (
                <div className="space-y-2">
                  <Label htmlFor="message" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Message Content
                  </Label>
                  <Textarea
                    id="message"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Enter test message..."
                    rows={3}
                  />
                </div>
              )}

              {/* Custom Metadata */}
              <div className="space-y-2">
                <Label htmlFor="metadata" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Custom Metadata (JSON)
                </Label>
                <Textarea
                  id="metadata"
                  value={customMetadata}
                  onChange={(e) => setCustomMetadata(e.target.value)}
                  placeholder="{}"
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={runTest}
                  disabled={isRunning}
                  className="flex-1"
                >
                  {isRunning ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Test
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetTest}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Output Panel */}
        <div className="space-y-4">
          {testResult ? (
            <Tabs defaultValue="response">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="debug">Debug</TabsTrigger>
                <TabsTrigger value="state">State</TabsTrigger>
              </TabsList>

              <TabsContent value="response" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {testResult.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {testResult.success ? "Success" : "Error"}
                      </CardTitle>
                      <Badge
                        variant={testResult.success ? "default" : "destructive"}
                      >
                        {testResult.executionTime}ms
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {testResult.success ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="mb-2 text-sm font-semibold">
                            Bot Response
                          </h4>
                          <div className="rounded-lg border bg-muted p-4">
                            <pre className="text-sm">
                              {JSON.stringify(testResult.response, null, 2)}
                            </pre>
                          </div>
                        </div>

                        {testResult.response?.content && (
                          <div>
                            <h4 className="mb-2 text-sm font-semibold">
                              Preview
                            </h4>
                            <div className="rounded-lg border bg-card p-4">
                              <p>{testResult.response.content}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                          <div>
                            <p className="font-medium text-destructive">
                              Error
                            </p>
                            <p className="mt-1 text-sm">{testResult.error}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="debug">
                <Card>
                  <CardHeader>
                    <CardTitle>Debug Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1 font-mono text-sm">
                        {testResult.logs?.map((log, i) => (
                          <div key={i} className="text-muted-foreground">
                            {log}
                          </div>
                        )) || (
                          <p className="text-muted-foreground">
                            No debug logs available
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="state">
                <Card>
                  <CardHeader>
                    <CardTitle>State Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {testResult.stateChanges &&
                    testResult.stateChanges.length > 0 ? (
                      <div className="space-y-2">
                        {testResult.stateChanges.map((change, i) => (
                          <div key={i} className="rounded-lg border p-3">
                            <pre className="text-sm">
                              {JSON.stringify(change, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No state changes</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">Ready to test</p>
                <p className="text-sm text-muted-foreground">
                  Configure an event and click "Run Test"
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Test History */}
      {testHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test History</CardTitle>
            <CardDescription>Recent test executions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testHistory.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {item.result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.event.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {item.result.executionTime}ms
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEventType(item.event.type);
                        setUserId(item.event.userId);
                        setChannelId(item.event.channelId);
                        setMessageContent(item.event.content || "");
                        setCustomMetadata(
                          JSON.stringify(item.event.metadata || {}, null, 2),
                        );
                      }}
                    >
                      Replay
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
