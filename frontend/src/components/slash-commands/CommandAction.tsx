"use client";

/**
 * CommandAction - Configure what the command does
 */

import {
  MessageSquare,
  UserCircle,
  Navigation,
  Layers,
  Webhook,
  Workflow,
  Code,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type {
  CommandActionType,
  CommandAction as CommandActionConfig,
} from "@/lib/slash-commands/command-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CommandActionProps {
  actionType?: CommandActionType;
  action?: CommandActionConfig;
  onChange: (
    actionType: CommandActionType,
    action: CommandActionConfig,
  ) => void;
}

// ============================================================================
// Action Types
// ============================================================================

const actionTypes: {
  value: CommandActionType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "message",
    label: "Send Message",
    description: "Send a message to the channel",
    icon: MessageSquare,
  },
  {
    value: "status",
    label: "Update Status",
    description: "Change the user's status",
    icon: UserCircle,
  },
  {
    value: "navigate",
    label: "Navigate",
    description: "Go to a URL or page",
    icon: Navigation,
  },
  {
    value: "modal",
    label: "Open Modal",
    description: "Display a modal dialog",
    icon: Layers,
  },
  {
    value: "webhook",
    label: "Call Webhook",
    description: "Send data to an external URL",
    icon: Webhook,
  },
  {
    value: "workflow",
    label: "Trigger Workflow",
    description: "Start an automation workflow",
    icon: Workflow,
  },
  {
    value: "api",
    label: "API Call",
    description: "Call an internal API endpoint",
    icon: Code,
  },
];

// ============================================================================
// Component
// ============================================================================

export function CommandAction({
  actionType = "message",
  action = { type: "message" },
  onChange,
}: CommandActionProps) {
  const handleTypeChange = (type: CommandActionType) => {
    onChange(type, { type });
  };

  return (
    <div className="space-y-6">
      {/* Action Type Selection */}
      <div className="space-y-3">
        <Label>Action Type</Label>
        <RadioGroup
          value={actionType}
          onValueChange={(value) =>
            handleTypeChange(value as CommandActionType)
          }
          className="grid gap-3 sm:grid-cols-2"
        >
          {actionTypes.map((type) => (
            <Label
              key={type.value}
              htmlFor={type.value}
              className={cn(
                "hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                actionType === type.value && "bg-primary/5 border-primary",
              )}
            >
              <RadioGroupItem
                value={type.value}
                id={type.value}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <type.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{type.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {type.description}
                </p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Action Configuration */}
      <div className="space-y-4 rounded-lg border p-4">
        <h4 className="font-medium">Configure Action</h4>

        {/* Message Action */}
        {actionType === "message" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message Template</Label>
              <Textarea
                value={action.message || ""}
                onChange={(e) =>
                  onChange(actionType, { ...action, message: e.target.value })
                }
                placeholder="Hello {{username}}! You said: {{args}}"
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{variable}}"} to include dynamic content. Available:
                username, displayName, channelName, plus any argument names.
              </p>
            </div>
          </div>
        )}

        {/* Status Action */}
        {actionType === "status" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status Text</Label>
                <Input
                  value={action.status?.text || ""}
                  onChange={(e) =>
                    onChange(actionType, {
                      ...action,
                      status: { ...action.status, text: e.target.value },
                    })
                  }
                  placeholder="Away"
                />
              </div>
              <div className="space-y-2">
                <Label>Emoji</Label>
                <Input
                  value={action.status?.emoji || ""}
                  onChange={(e) =>
                    onChange(actionType, {
                      ...action,
                      status: {
                        ...action.status,
                        text: action.status?.text || "",
                        emoji: e.target.value,
                      },
                    })
                  }
                  placeholder=":clock:"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiry (optional)</Label>
              <Input
                value={action.status?.expiry || ""}
                onChange={(e) =>
                  onChange(actionType, {
                    ...action,
                    status: {
                      ...action.status,
                      text: action.status?.text || "",
                      expiry: e.target.value,
                    },
                  })
                }
                placeholder="1h, 30m, or ISO timestamp"
              />
            </div>
          </div>
        )}

        {/* Navigate Action */}
        {actionType === "navigate" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL or Path</Label>
              <Input
                value={action.navigate?.url || ""}
                onChange={(e) =>
                  onChange(actionType, {
                    ...action,
                    navigate: { ...action.navigate, url: e.target.value },
                  })
                }
                placeholder="/settings or https://example.com"
              />
              <p className="text-xs text-muted-foreground">
                Use relative paths for internal pages, or full URLs for external
                links. Variables like {"{{userId}}"} are supported.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="newTab"
                checked={action.navigate?.newTab || false}
                onChange={(e) =>
                  onChange(actionType, {
                    ...action,
                    navigate: {
                      ...action.navigate,
                      url: action.navigate?.url || "",
                      newTab: e.target.checked,
                    },
                  })
                }
                className="rounded border"
              />
              <Label htmlFor="newTab">Open in new tab</Label>
            </div>
          </div>
        )}

        {/* Modal Action */}
        {actionType === "modal" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Component Name</Label>
              <Input
                value={action.modal?.component || ""}
                onChange={(e) =>
                  onChange(actionType, {
                    ...action,
                    modal: { ...action.modal, component: e.target.value },
                  })
                }
                placeholder="FeedbackModal"
              />
              <p className="text-xs text-muted-foreground">
                The name of the React component to render in the modal.
              </p>
            </div>
          </div>
        )}

        {/* API Action */}
        {actionType === "api" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label>Endpoint</Label>
                <Input
                  value={action.api?.endpoint || ""}
                  onChange={(e) =>
                    onChange(actionType, {
                      ...action,
                      api: {
                        ...action.api,
                        endpoint: e.target.value,
                        method: action.api?.method || "POST",
                      },
                    })
                  }
                  placeholder="/api/my-endpoint"
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <select
                  value={action.api?.method || "POST"}
                  onChange={(e) =>
                    onChange(actionType, {
                      ...action,
                      api: {
                        ...action.api,
                        endpoint: action.api?.endpoint || "",
                        method: e.target.value,
                      },
                    })
                  }
                  className="h-10 w-full rounded-md border bg-background px-3"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Webhook Action */}
        {actionType === "webhook" && (
          <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
            <Webhook className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">
              Configure webhook settings in the Webhook tab below.
            </p>
          </div>
        )}

        {/* Workflow Action */}
        {actionType === "workflow" && (
          <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
            <Workflow className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">
              Configure workflow settings in the Workflow tab below.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommandAction;
