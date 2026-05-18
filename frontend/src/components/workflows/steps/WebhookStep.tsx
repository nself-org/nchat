"use client";

/**
 * WebhookStep - Webhook configuration component
 *
 * Configures HTTP API calls
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type {
  WebhookStep as WebhookStepType,
  HttpMethod,
  WebhookHeader,
} from "@/lib/workflows/workflow-types";

interface WebhookStepPropertiesProps {
  step: WebhookStepType;
  onUpdate: (config: Record<string, unknown>) => void;
}

export function WebhookStepProperties({
  step,
  onUpdate,
}: WebhookStepPropertiesProps) {
  const config = step.config;

  const handleAddHeader = () => {
    const newHeaders: WebhookHeader[] = [
      ...(config.headers || []),
      { key: "", value: "", isSecret: false },
    ];
    onUpdate({ headers: newHeaders });
  };

  const handleUpdateHeader = (
    index: number,
    updates: Partial<WebhookHeader>,
  ) => {
    const newHeaders = [...(config.headers || [])];
    newHeaders[index] = { ...newHeaders[index], ...updates };
    onUpdate({ headers: newHeaders });
  };

  const handleDeleteHeader = (index: number) => {
    const newHeaders = config.headers?.filter((_, i) => i !== index) || [];
    onUpdate({ headers: newHeaders });
  };

  return (
    <div className="space-y-3">
      {/* URL */}
      <div>
        <Label className="text-xs">URL</Label>
        <Input
          value={config.url || ""}
          onChange={(e) => onUpdate({ url: e.target.value })}
          className="mt-1 h-8 font-mono text-sm"
          placeholder="https://api.example.com/endpoint"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Use {"{{variable}}"} to insert dynamic values
        </p>
      </div>

      {/* Method */}
      <div>
        <Label className="text-xs">Method</Label>
        <Select
          value={config.method}
          onValueChange={(value) => onUpdate({ method: value as HttpMethod })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
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

      {/* Headers */}
      <div className="border-t pt-2">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs">Headers</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6"
            onClick={handleAddHeader}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>

        {config.headers && config.headers.length > 0 && (
          <div className="space-y-2">
            {config.headers.map((header, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={header.key}
                  onChange={(e) =>
                    handleUpdateHeader(index, { key: e.target.value })
                  }
                  className="h-6 flex-1 text-xs"
                  placeholder="Header name"
                />
                <Input
                  value={header.value}
                  onChange={(e) =>
                    handleUpdateHeader(index, { value: e.target.value })
                  }
                  className="h-6 flex-1 text-xs"
                  placeholder="Value"
                  type={header.isSecret ? "password" : "text"}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDeleteHeader(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body (for POST, PUT, PATCH) */}
      {["POST", "PUT", "PATCH"].includes(config.method) && (
        <div className="border-t pt-2">
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-xs">Request Body</Label>
            <Select
              value={config.bodyType || "json"}
              onValueChange={(value) => onUpdate({ bodyType: value })}
            >
              <SelectTrigger className="h-6 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="raw">Raw</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={config.body || ""}
            onChange={(e) => onUpdate({ body: e.target.value })}
            className="mt-1 min-h-[80px] font-mono text-xs"
            placeholder={
              config.bodyType === "json"
                ? '{\n  "key": "{{variable}}"\n}'
                : "Request body..."
            }
          />
        </div>
      )}

      {/* Response handling */}
      <div className="border-t pt-2">
        <Label className="text-xs">Response Handling</Label>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-xs">Parse Response as JSON</p>
            <p className="text-[10px] text-muted-foreground">
              Store response in a variable
            </p>
          </div>
          <Switch
            checked={config.parseResponse !== false}
            onCheckedChange={(checked) => onUpdate({ parseResponse: checked })}
          />
        </div>

        {config.parseResponse !== false && (
          <div className="mt-2">
            <Label className="text-[10px]">Store response in variable</Label>
            <Input
              value={config.responseVariableName || ""}
              onChange={(e) =>
                onUpdate({ responseVariableName: e.target.value })
              }
              className="mt-1 h-6 font-mono text-xs"
              placeholder="webhookResponse"
            />
          </div>
        )}
      </div>

      {/* Advanced options */}
      <div className="border-t pt-2">
        <Label className="text-xs">Advanced</Label>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Timeout (seconds)</Label>
            <Input
              type="number"
              value={config.timeoutSeconds || 30}
              onChange={(e) =>
                onUpdate({ timeoutSeconds: parseInt(e.target.value) })
              }
              className="h-6 text-xs"
              min={1}
              max={300}
            />
          </div>
          <div>
            <Label className="text-[10px]">Retries</Label>
            <Input
              type="number"
              value={config.retryCount || 0}
              onChange={(e) =>
                onUpdate({ retryCount: parseInt(e.target.value) })
              }
              className="h-6 text-xs"
              min={0}
              max={10}
            />
          </div>
        </div>

        <div className="mt-2">
          <Label className="text-[10px]">Expected Status Codes</Label>
          <Input
            value={config.expectedStatusCodes?.join(", ") || ""}
            onChange={(e) => {
              const codes = e.target.value
                .split(",")
                .map((s) => parseInt(s.trim()))
                .filter((n) => !isNaN(n));
              onUpdate({
                expectedStatusCodes: codes.length > 0 ? codes : undefined,
              });
            }}
            className="mt-1 h-6 text-xs"
            placeholder="200, 201 (empty for any 2xx)"
          />
        </div>
      </div>
    </div>
  );
}

export default WebhookStepProperties;
