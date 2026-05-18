"use client";

/**
 * CommandResponse - Configure response type and settings
 */

import { MessageSquare, Bell, Layers, Navigation, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type {
  CommandResponseConfig,
  CommandResponseType,
} from "@/lib/slash-commands/command-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CommandResponseProps {
  responseConfig?: Partial<CommandResponseConfig>;
  onChange: (responseConfig: Partial<CommandResponseConfig>) => void;
}

// ============================================================================
// Response Types
// ============================================================================

const responseTypes: {
  value: CommandResponseType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "message",
    label: "Channel Message",
    description: "Visible to everyone in the channel",
    icon: MessageSquare,
  },
  {
    value: "ephemeral",
    label: "Ephemeral",
    description: "Only visible to the command user",
    icon: EyeOff,
  },
  {
    value: "notification",
    label: "Notification",
    description: "Show as a toast notification",
    icon: Bell,
  },
  {
    value: "modal",
    label: "Modal Dialog",
    description: "Open in a modal window",
    icon: Layers,
  },
  {
    value: "redirect",
    label: "Redirect",
    description: "Navigate to another page",
    icon: Navigation,
  },
  {
    value: "none",
    label: "No Response",
    description: "Silent execution",
    icon: EyeOff,
  },
];

// ============================================================================
// Component
// ============================================================================

export function CommandResponse({
  responseConfig = {},
  onChange,
}: CommandResponseProps) {
  return (
    <div className="space-y-6">
      {/* Response Type */}
      <div className="space-y-3">
        <Label>Response Type</Label>
        <p className="text-xs text-muted-foreground">
          How should the command respond to the user?
        </p>
        <RadioGroup
          value={responseConfig.type || "ephemeral"}
          onValueChange={(value) =>
            onChange({ ...responseConfig, type: value as CommandResponseType })
          }
          className="grid gap-3 sm:grid-cols-2"
        >
          {responseTypes.map((type) => (
            <Label
              key={type.value}
              htmlFor={`response-${type.value}`}
              className={cn(
                "hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                responseConfig.type === type.value &&
                  "bg-primary/5 border-primary",
              )}
            >
              <RadioGroupItem
                value={type.value}
                id={`response-${type.value}`}
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

      {/* Response Template */}
      {responseConfig.type !== "none" &&
        responseConfig.type !== "modal" &&
        responseConfig.type !== "redirect" && (
          <div className="space-y-3">
            <Label>Response Template</Label>
            <Textarea
              value={responseConfig.template || ""}
              onChange={(e) =>
                onChange({ ...responseConfig, template: e.target.value })
              }
              placeholder="Command executed successfully!"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{variable}}"} to include dynamic content from arguments or
              context. Available: username, displayName, channelName, plus
              argument names.
            </p>
          </div>
        )}

      {/* Ephemeral Toggle */}
      {responseConfig.type === "message" && (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Ephemeral Response</Label>
            <p className="text-xs text-muted-foreground">
              Only the user who ran the command can see the response
            </p>
          </div>
          <Switch
            checked={responseConfig.ephemeral ?? false}
            onCheckedChange={(checked) =>
              onChange({ ...responseConfig, ephemeral: checked })
            }
          />
        </div>
      )}

      {/* Typing Indicator */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Show Typing Indicator</Label>
          <p className="text-xs text-muted-foreground">
            Display "typing..." while processing the command
          </p>
        </div>
        <Switch
          checked={responseConfig.showTyping ?? false}
          onCheckedChange={(checked) =>
            onChange({ ...responseConfig, showTyping: checked })
          }
        />
      </div>

      {/* Response Delay */}
      <div className="space-y-3">
        <Label>Response Delay (optional)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={10000}
            value={responseConfig.delay || ""}
            onChange={(e) =>
              onChange({
                ...responseConfig,
                delay: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="0"
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">milliseconds</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Add a delay before showing the response (useful for dramatic effect or
          simulating processing)
        </p>
      </div>

      {/* Preview */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <h4 className="text-sm font-medium">Response Behavior</h4>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>
            - Type:{" "}
            <strong>
              {
                responseTypes.find(
                  (t) => t.value === (responseConfig.type || "ephemeral"),
                )?.label
              }
            </strong>
          </li>
          {responseConfig.type === "message" && (
            <li>
              - Visibility:{" "}
              <strong>
                {responseConfig.ephemeral ? "Only user" : "Everyone"}
              </strong>
            </li>
          )}
          <li>
            - Typing indicator:{" "}
            <strong>{responseConfig.showTyping ? "Yes" : "No"}</strong>
          </li>
          {responseConfig.delay && (
            <li>
              - Delay: <strong>{responseConfig.delay}ms</strong>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default CommandResponse;
