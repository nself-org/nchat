"use client";

/**
 * CommandWebhook - Configure webhook settings
 */

import { useState } from "react";
import {
  Webhook,
  Plus,
  X,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommandWebhook as CommandWebhookType } from "@/lib/slash-commands/command-types";

// ============================================================================
// Types
// ============================================================================

interface CommandWebhookProps {
  webhook?: Partial<CommandWebhookType>;
  onChange: (webhook: Partial<CommandWebhookType>) => void;
}

// ============================================================================
// Component
// ============================================================================

export function CommandWebhook({
  webhook = {},
  onChange,
}: CommandWebhookProps) {
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleAddHeader = () => {
    if (!newHeaderKey.trim()) return;
    const headers = webhook.headers || {};
    onChange({
      ...webhook,
      headers: { ...headers, [newHeaderKey.trim()]: newHeaderValue },
    });
    setNewHeaderKey("");
    setNewHeaderValue("");
  };

  const handleRemoveHeader = (key: string) => {
    const headers = { ...webhook.headers };
    delete headers[key];
    onChange({ ...webhook, headers });
  };

  const handleTestWebhook = async () => {
    if (!webhook.url) {
      setTestResult({ success: false, message: "Webhook URL is required" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhook.url,
          method: webhook.method || "POST",
          headers: webhook.headers,
          body: webhook.bodyTemplate || "{}",
        }),
      });

      const result = await response.json();
      setTestResult({
        success: response.ok,
        message: response.ok
          ? `Success! Response status: ${result.status}`
          : `Failed: ${result.error || "Unknown error"}`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Webhook Configuration</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Call an external URL when this command is executed.
        </p>
      </div>

      {/* URL and Method */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2 sm:col-span-3">
          <Label>Webhook URL</Label>
          <Input
            value={webhook.url || ""}
            onChange={(e) => onChange({ ...webhook, url: e.target.value })}
            placeholder="https://api.example.com/webhook"
          />
        </div>
        <div className="space-y-2">
          <Label>Method</Label>
          <Select
            value={webhook.method || "POST"}
            onValueChange={(value) =>
              onChange({
                ...webhook,
                method: value as CommandWebhookType["method"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Headers */}
      <div className="space-y-3">
        <Label>Request Headers</Label>

        {webhook.headers && Object.keys(webhook.headers).length > 0 && (
          <div className="space-y-2">
            {Object.entries(webhook.headers).map(([key, value]) => (
              <div
                key={key}
                className="bg-muted/30 flex items-center gap-2 rounded border px-3 py-2"
              >
                <code className="flex-1 text-sm">
                  <span className="font-medium">{key}:</span> {value}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleRemoveHeader(key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newHeaderKey}
            onChange={(e) => setNewHeaderKey(e.target.value)}
            placeholder="Header name"
            className="flex-1"
          />
          <Input
            value={newHeaderValue}
            onChange={(e) => setNewHeaderValue(e.target.value)}
            placeholder="Value"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddHeader();
              }
            }}
          />
          <Button variant="outline" size="icon" onClick={handleAddHeader}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Common headers: Authorization, Content-Type, X-API-Key
        </p>
      </div>

      {/* Body Template */}
      {webhook.method !== "GET" && (
        <div className="space-y-3">
          <Label>Request Body Template</Label>
          <Textarea
            value={webhook.bodyTemplate || ""}
            onChange={(e) =>
              onChange({ ...webhook, bodyTemplate: e.target.value })
            }
            placeholder={`{
  "command": "{{trigger}}",
  "user": "{{username}}",
  "channel": "{{channelName}}",
  "args": {{args}}
}`}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            JSON body to send. Use {"{{variable}}"} placeholders for dynamic
            data.
          </p>
        </div>
      )}

      {/* Timeout and Retry */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Timeout (ms)</Label>
          <Input
            type="number"
            min={1000}
            max={30000}
            value={webhook.timeout || ""}
            onChange={(e) =>
              onChange({
                ...webhook,
                timeout: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="5000"
          />
          <p className="text-xs text-muted-foreground">
            Default: 5000ms (5 seconds)
          </p>
        </div>
        <div className="space-y-2">
          <Label>Retry Attempts</Label>
          <Input
            type="number"
            min={0}
            max={5}
            value={webhook.retry?.attempts || ""}
            onChange={(e) =>
              onChange({
                ...webhook,
                retry: {
                  attempts: e.target.value ? parseInt(e.target.value) : 0,
                  delay: webhook.retry?.delay || 1000,
                },
              })
            }
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            Number of retries on failure
          </p>
        </div>
      </div>

      {/* Response Mapping */}
      <div className="space-y-3">
        <Label>Response Mapping (Optional)</Label>
        <p className="text-xs text-muted-foreground">
          Map fields from the webhook response to display messages
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs">Message Path</Label>
            <Input
              value={webhook.responseMapping?.messagePath || ""}
              onChange={(e) =>
                onChange({
                  ...webhook,
                  responseMapping: {
                    ...webhook.responseMapping,
                    messagePath: e.target.value,
                  },
                })
              }
              placeholder="data.message"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Success Path</Label>
            <Input
              value={webhook.responseMapping?.successPath || ""}
              onChange={(e) =>
                onChange({
                  ...webhook,
                  responseMapping: {
                    ...webhook.responseMapping,
                    successPath: e.target.value,
                  },
                })
              }
              placeholder="success"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Error Path</Label>
            <Input
              value={webhook.responseMapping?.errorPath || ""}
              onChange={(e) =>
                onChange({
                  ...webhook,
                  responseMapping: {
                    ...webhook.responseMapping,
                    errorPath: e.target.value,
                  },
                })
              }
              placeholder="error.message"
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Test Button */}
      <div className="space-y-3">
        <Button
          variant="outline"
          onClick={handleTestWebhook}
          disabled={!webhook.url || isTesting}
        >
          {isTesting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <TestTube className="mr-2 h-4 w-4" />
          )}
          Test Webhook
        </Button>

        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-lg border p-3 ${
              testResult.success
                ? "border-green-500/20 bg-green-500/10 text-green-600"
                : "border-red-500/20 bg-red-500/10 text-red-600"
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommandWebhook;
