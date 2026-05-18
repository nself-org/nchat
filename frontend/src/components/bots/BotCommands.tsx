"use client";

/**
 * Bot Commands Component
 * Define slash commands for your bot
 */

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  BotBuilderAction,
  BotCommandDefinition,
  CommandArgument,
} from "@/lib/bots";

// ============================================================================
// TYPES
// ============================================================================

interface BotCommandsProps {
  actions: BotBuilderAction[];
  onAdd: (action: BotBuilderAction) => void;
  onRemove: (actionId: string) => void;
  className?: string;
}

interface CommandDraft {
  name: string;
  description: string;
  response: string;
  arguments: CommandArgument[];
}

// ============================================================================
// ARGUMENT TYPES
// ============================================================================

const ARGUMENT_TYPES = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes/No" },
  { value: "user", label: "User" },
  { value: "channel", label: "Channel" },
  { value: "duration", label: "Duration" },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BotCommands({
  actions,
  onAdd,
  onRemove,
  className,
}: BotCommandsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<CommandDraft>({
    name: "",
    description: "",
    response: "",
    arguments: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter command actions
  const commandActions = actions.filter(
    (a) => a.type === "send_message" && a.config.isCommand,
  );

  // Validate draft
  const validateDraft = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!draft.name.trim()) {
      newErrors.name = "Command name is required";
    } else if (!/^[a-z][a-z0-9_-]*$/.test(draft.name)) {
      newErrors.name =
        "Command name must start with a letter and contain only lowercase letters, numbers, hyphens, and underscores";
    }

    if (!draft.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!draft.response.trim()) {
      newErrors.response = "Response is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add a command
  const handleAdd = () => {
    if (!validateDraft()) return;

    const action: BotBuilderAction = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: "send_message",
      config: {
        isCommand: true,
        command: draft.name,
        description: draft.description,
        response: draft.response,
        arguments: draft.arguments,
      },
      order: commandActions.length,
    };

    onAdd(action);

    // Reset
    setDraft({
      name: "",
      description: "",
      response: "",
      arguments: [],
    });
    setIsAdding(false);
  };

  // Add an argument
  const addArgument = () => {
    setDraft((prev) => ({
      ...prev,
      arguments: [
        ...prev.arguments,
        {
          name: "",
          description: "",
          type: "string" as const,
          required: false,
        },
      ],
    }));
  };

  // Update an argument
  const updateArgument = (
    index: number,
    field: keyof CommandArgument,
    value: unknown,
  ) => {
    setDraft((prev) => ({
      ...prev,
      arguments: prev.arguments.map((arg, i) =>
        i === index ? { ...arg, [field]: value } : arg,
      ),
    }));
  };

  // Remove an argument
  const removeArgument = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      arguments: prev.arguments.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Existing Commands */}
      {commandActions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Commands</h4>
          {commandActions.map((action) => (
            <Card key={action.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <code className="font-mono text-sm text-primary">
                    /{action.config.command as string}
                  </code>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {action.config.description as string}
                  </p>
                  {(action.config.arguments as CommandArgument[])?.length >
                    0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Arguments:{" "}
                      {(action.config.arguments as CommandArgument[])
                        .map((a) => a.name)
                        .join(", ")}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(action.id)}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Command Form */}
      {isAdding ? (
        <Card className="space-y-4 p-4">
          <h4 className="font-medium">New Command</h4>

          {/* Command Name */}
          <div>
            <label
              htmlFor="command-name"
              className="mb-1 block text-sm font-medium"
            >
              Command Name
            </label>
            <div className="flex items-center">
              <span className="mr-1 text-muted-foreground">/</span>
              <input
                id="command-name"
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    name: e.target.value.toLowerCase(),
                  }))
                }
                placeholder="mycommand"
                className={cn(
                  "flex-1 rounded-md border bg-background px-3 py-2",
                  errors.name ? "border-destructive" : "border-input",
                )}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="command-description"
              className="mb-1 block text-sm font-medium"
            >
              Description
            </label>
            <input
              id="command-description"
              type="text"
              value={draft.description}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="What does this command do?"
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2",
                errors.description ? "border-destructive" : "border-input",
              )}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-destructive">
                {errors.description}
              </p>
            )}
          </div>

          {/* Arguments */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="block text-sm font-medium">
                Arguments (optional)
              </span>
              <Button variant="outline" size="sm" onClick={addArgument}>
                Add Argument
              </Button>
            </div>

            {draft.arguments.map((arg, index) => (
              <div
                key={index}
                className="mb-2 flex items-start gap-2 rounded-md border p-2"
              >
                <input
                  type="text"
                  value={arg.name}
                  onChange={(e) =>
                    updateArgument(index, "name", e.target.value)
                  }
                  placeholder="name"
                  aria-label={`Argument ${index + 1} name`}
                  className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
                />
                <select
                  value={arg.type}
                  onChange={(e) =>
                    updateArgument(index, "type", e.target.value)
                  }
                  aria-label={`Argument ${index + 1} type`}
                  className="rounded border border-input bg-background px-2 py-1 text-sm"
                >
                  {ARGUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={arg.required}
                    onChange={(e) =>
                      updateArgument(index, "required", e.target.checked)
                    }
                    className="mr-1"
                  />
                  Required
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeArgument(index)}
                >
                  X
                </Button>
              </div>
            ))}
          </div>

          {/* Response */}
          <div>
            <label
              htmlFor="command-response"
              className="mb-1 block text-sm font-medium"
            >
              Response Message
            </label>
            <textarea
              id="command-response"
              value={draft.response}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, response: e.target.value }))
              }
              placeholder="The message to send when this command is used"
              rows={3}
              className={cn(
                "w-full resize-none rounded-md border bg-background px-3 py-2",
                errors.response ? "border-destructive" : "border-input",
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use {"{user}"} for username, {"{channel}"} for channel name
            </p>
            {errors.response && (
              <p className="mt-1 text-sm text-destructive">{errors.response}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setErrors({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Command</Button>
          </div>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          + Add Command
        </Button>
      )}

      {/* Help */}
      <div className="text-sm text-muted-foreground">
        <p>
          Commands allow users to interact with your bot using slash commands
          like <code className="text-primary">/mycommand</code>.
        </p>
      </div>
    </div>
  );
}

export default BotCommands;
