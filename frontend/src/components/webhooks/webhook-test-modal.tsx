"use client";

import { useState, useCallback } from "react";
import {
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hash,
  FileJson,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Webhook,
  WebhookDelivery,
  TestWebhookFormData,
  getDeliveryStatusColor,
} from "@/lib/webhooks";

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: Webhook | null;
  onTest: (data: TestWebhookFormData) => Promise<WebhookDelivery | null>;
  isLoading?: boolean;
  error?: string | null;
}

// ============================================================================
// SAMPLE PAYLOADS
// ============================================================================

const SAMPLE_PAYLOADS = {
  simple: {
    name: "Simple Message",
    content: "Hello from webhook!",
  },
  github: {
    name: "GitHub Push",
    content: JSON.stringify(
      {
        content: "**[repo/main]** 2 new commits pushed by @user",
        embeds: [
          {
            title: "Fix bug in authentication",
            description: "Updated login flow to handle edge cases",
            color: 0x2ea44f,
          },
        ],
      },
      null,
      2,
    ),
  },
  alert: {
    name: "Alert Notification",
    content: JSON.stringify(
      {
        content: "[ALERT] Server CPU usage above 90%",
        embeds: [
          {
            title: "High CPU Alert",
            description:
              "Server: prod-web-01\nCPU: 93%\nTime: 2024-01-15 10:30:00 UTC",
            color: 0xef4444,
          },
        ],
      },
      null,
      2,
    ),
  },
  deployment: {
    name: "Deployment",
    content: JSON.stringify(
      {
        content: "Deployment completed successfully",
        embeds: [
          {
            title: "v2.1.0 deployed to production",
            description: "All health checks passed",
            color: 0x22c55e,
            fields: [
              { name: "Environment", value: "production", inline: true },
              { name: "Duration", value: "45s", inline: true },
            ],
          },
        ],
      },
      null,
      2,
    ),
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function WebhookTestModal({
  open,
  onOpenChange,
  webhook,
  onTest,
  isLoading = false,
  error = null,
}: WebhookTestModalProps) {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [content, setContent] = useState("Hello from webhook test!");
  const [jsonPayload, setJsonPayload] = useState(
    JSON.stringify({ content: "Hello from webhook test!" }, null, 2),
  );
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [testResult, setTestResult] = useState<WebhookDelivery | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setContent("Hello from webhook test!");
    setJsonPayload(
      JSON.stringify({ content: "Hello from webhook test!" }, null, 2),
    );
    setUsername("");
    setAvatarUrl("");
    setTestResult(null);
    setValidationError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      onOpenChange(false);
      setTimeout(resetForm, 300);
    }
  }, [isLoading, onOpenChange, resetForm]);

  const handleSendTest = async () => {
    if (!webhook) return;

    // Validate based on mode
    if (mode === "simple") {
      if (!content.trim()) {
        setValidationError("Please enter a message");
        return;
      }
    } else {
      try {
        JSON.parse(jsonPayload);
      } catch {
        setValidationError("Invalid JSON payload");
        return;
      }
    }

    setValidationError(null);
    setTestResult(null);

    const payload: TestWebhookFormData = {
      webhookId: webhook.id,
      content: mode === "simple" ? content.trim() : jsonPayload,
      username: username.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
    };

    const result = await onTest(payload);
    if (result) {
      setTestResult(result);
    }
  };

  const handleSelectSample = (sampleKey: keyof typeof SAMPLE_PAYLOADS) => {
    const sample = SAMPLE_PAYLOADS[sampleKey];
    if (mode === "simple") {
      setContent(
        typeof sample.content === "string"
          ? sample.content
          : JSON.parse(sample.content).content || sample.content,
      );
    } else {
      setJsonPayload(
        typeof sample.content === "string"
          ? JSON.stringify({ content: sample.content }, null, 2)
          : sample.content,
      );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!webhook) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Test Webhook</DialogTitle>
          <DialogDescription>
            Send a test message to verify your webhook is working correctly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Webhook Info */}
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={webhook.avatar_url} />
              <AvatarFallback>{getInitials(webhook.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{webhook.name}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                <span>{webhook.channel?.name || "Unknown channel"}</span>
              </div>
            </div>
            <Badge
              variant={webhook.status === "active" ? "default" : "secondary"}
            >
              {webhook.status}
            </Badge>
          </div>

          {/* Error Display */}
          {(error || validationError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || validationError}</AlertDescription>
            </Alert>
          )}

          {/* Test Result */}
          {testResult && (
            <Alert
              variant={
                testResult.status === "success" ? "default" : "destructive"
              }
              className={cn(
                testResult.status === "success" &&
                  "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
              )}
            >
              {testResult.status === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {testResult.status === "success"
                  ? "Test message sent successfully!"
                  : testResult.error_message || "Failed to send test message"}
              </AlertDescription>
            </Alert>
          )}

          {/* Mode Tabs */}
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "simple" | "advanced")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simple">Simple</TabsTrigger>
              <TabsTrigger value="advanced">Advanced (JSON)</TabsTrigger>
            </TabsList>

            {/* Simple Mode */}
            <TabsContent value="simple" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-content">Message</Label>
                <Textarea
                  id="test-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your test message..."
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </TabsContent>

            {/* Advanced Mode */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="test-json">JSON Payload</Label>
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                </div>
                <Textarea
                  id="test-json"
                  value={jsonPayload}
                  onChange={(e) => setJsonPayload(e.target.value)}
                  placeholder='{"content": "Hello!"}'
                  rows={6}
                  className="font-mono text-sm"
                  disabled={isLoading}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Sample Payloads */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Sample payloads
            </Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SAMPLE_PAYLOADS).map(([key, sample]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    handleSelectSample(key as keyof typeof SAMPLE_PAYLOADS)
                  }
                  disabled={isLoading}
                >
                  {sample.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Optional Overrides */}
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Optional Overrides</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="test-username" className="text-xs">
                  Username Override
                </Label>
                <Input
                  id="test-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={webhook.name}
                  disabled={isLoading}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="test-avatar" className="text-xs">
                  Avatar URL Override
                </Label>
                <Input
                  id="test-avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={isLoading}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Close
          </Button>
          <Button
            onClick={handleSendTest}
            disabled={
              isLoading ||
              webhook.status !== "active" ||
              (mode === "simple" && !content.trim())
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WebhookTestModal;
