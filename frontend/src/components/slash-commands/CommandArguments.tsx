"use client";

/**
 * CommandArguments - Define command arguments and options
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  CommandArgument,
  CommandArgType,
} from "@/lib/slash-commands/command-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CommandArgumentsProps {
  arguments: CommandArgument[];
  onChange: (args: CommandArgument[]) => void;
}

// ============================================================================
// Argument Types
// ============================================================================

const argumentTypes: {
  value: CommandArgType;
  label: string;
  description: string;
}[] = [
  { value: "string", label: "Text", description: "Plain text input" },
  { value: "number", label: "Number", description: "Numeric value" },
  { value: "boolean", label: "Boolean", description: "True/false toggle" },
  { value: "user", label: "User", description: "@mention a user" },
  { value: "channel", label: "Channel", description: "#channel reference" },
  {
    value: "duration",
    label: "Duration",
    description: "Time duration (1h, 30m)",
  },
  { value: "date", label: "Date", description: "Date value" },
  { value: "time", label: "Time", description: "Time value" },
  { value: "datetime", label: "Date & Time", description: "Full timestamp" },
  { value: "choice", label: "Choice", description: "Select from options" },
  { value: "rest", label: "Rest", description: "Capture remaining text" },
];

// ============================================================================
// Component
// ============================================================================

export function CommandArguments({
  arguments: args,
  onChange,
}: CommandArgumentsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Generate unique ID
  const generateId = () =>
    `arg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Add new argument
  const handleAdd = useCallback(() => {
    const position = args.filter((a) => a.position !== undefined).length;
    const newArg: CommandArgument = {
      id: generateId(),
      name: `arg${position + 1}`,
      type: "string",
      description: "",
      required: false,
      position,
    };
    onChange([...args, newArg]);
    setExpandedId(newArg.id);
  }, [args, onChange]);

  // Update argument
  const handleUpdate = useCallback(
    (id: string, updates: Partial<CommandArgument>) => {
      onChange(
        args.map((arg) => (arg.id === id ? { ...arg, ...updates } : arg)),
      );
    },
    [args, onChange],
  );

  // Remove argument
  const handleRemove = useCallback(
    (id: string) => {
      onChange(args.filter((arg) => arg.id !== id));
    },
    [args, onChange],
  );

  // Reorder arguments
  const handleReorder = useCallback(
    (newOrder: CommandArgument[]) => {
      // Update positions
      const reordered = newOrder.map((arg, index) => ({
        ...arg,
        position: arg.position !== undefined ? index : undefined,
      }));
      onChange(reordered);
    },
    [onChange],
  );

  const positionalArgs = args.filter((a) => a.position !== undefined);
  const flagArgs = args.filter((a) => a.flag);

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <h3 className="font-medium">Command Arguments</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Define the inputs your command accepts. Positional arguments are
          parsed in order, while flags use --name format.
        </p>
      </div>

      {/* Positional Arguments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Positional Arguments</h4>
          <Badge variant="outline">{positionalArgs.length} defined</Badge>
        </div>

        {positionalArgs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No positional arguments defined yet.
            </p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={positionalArgs}
            onReorder={(newOrder) => {
              const flagsKept = args.filter((a) => a.flag);
              handleReorder([...newOrder, ...flagsKept]);
            }}
            className="space-y-2"
          >
            <AnimatePresence>
              {positionalArgs.map((arg) => (
                <ArgumentItem
                  key={arg.id}
                  argument={arg}
                  isExpanded={expandedId === arg.id}
                  onToggle={() =>
                    setExpandedId(expandedId === arg.id ? null : arg.id)
                  }
                  onUpdate={(updates) => handleUpdate(arg.id, updates)}
                  onRemove={() => handleRemove(arg.id)}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}

        <Button variant="outline" className="w-full" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Positional Argument
        </Button>
      </div>

      {/* Flag Arguments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Flag Arguments</h4>
          <Badge variant="outline">{flagArgs.length} defined</Badge>
        </div>

        {flagArgs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No flag arguments defined. Flags are optional --name value pairs.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {flagArgs.map((arg) => (
                <ArgumentItem
                  key={arg.id}
                  argument={arg}
                  isExpanded={expandedId === arg.id}
                  onToggle={() =>
                    setExpandedId(expandedId === arg.id ? null : arg.id)
                  }
                  onUpdate={(updates) => handleUpdate(arg.id, updates)}
                  onRemove={() => handleRemove(arg.id)}
                  isFlag
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const newArg: CommandArgument = {
              id: generateId(),
              name: `option${flagArgs.length + 1}`,
              type: "string",
              description: "",
              required: false,
              flag: `option${flagArgs.length + 1}`,
            };
            onChange([...args, newArg]);
            setExpandedId(newArg.id);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Flag Argument
        </Button>
      </div>

      {/* Usage Preview */}
      {args.length > 0 && (
        <div className="bg-muted/30 rounded-lg border p-4">
          <h4 className="text-sm font-medium">Usage Preview</h4>
          <code className="mt-2 block font-mono text-sm">
            /command{" "}
            {positionalArgs.map((arg) => (
              <span key={arg.id}>
                {arg.required ? (
                  <span className="text-primary">&lt;{arg.name}&gt;</span>
                ) : (
                  <span className="text-muted-foreground">[{arg.name}]</span>
                )}{" "}
              </span>
            ))}
            {flagArgs.map((arg) => (
              <span key={arg.id} className="text-muted-foreground">
                [--{arg.flag} {arg.name}]{" "}
              </span>
            ))}
          </code>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Argument Item
// ============================================================================

interface ArgumentItemProps {
  argument: CommandArgument;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<CommandArgument>) => void;
  onRemove: () => void;
  isFlag?: boolean;
}

function ArgumentItem({
  argument,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  isFlag,
}: ArgumentItemProps) {
  const typeInfo = argumentTypes.find((t) => t.value === argument.type);

  return (
    <Reorder.Item
      value={argument}
      id={argument.id}
      className={cn(
        "rounded-lg border bg-card",
        isExpanded && "ring-primary/20 ring-2",
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        {/* Header */}
        <div className="flex items-center gap-2 p-3">
          {!isFlag && (
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground active:cursor-grabbing" />
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">
                {isFlag ? `--${argument.flag}` : argument.name}
              </span>
              <Badge variant="outline" className="text-xs">
                {typeInfo?.label || argument.type}
              </Badge>
              {argument.required && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
            {argument.description && (
              <p className="text-xs text-muted-foreground">
                {argument.description}
              </p>
            )}
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Expanded Content */}
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 border-t p-4"
          >
            {/* Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={argument.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="argument_name"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={argument.type}
                  onValueChange={(value) =>
                    onUpdate({ type: value as CommandArgType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {argumentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <span>{type.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {type.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={argument.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="What this argument is for"
              />
            </div>

            {/* Flag-specific options */}
            {isFlag && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Flag Name</Label>
                  <Input
                    value={argument.flag || ""}
                    onChange={(e) => onUpdate({ flag: e.target.value })}
                    placeholder="flag"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Short Flag</Label>
                  <Input
                    value={argument.shortFlag || ""}
                    onChange={(e) =>
                      onUpdate({ shortFlag: e.target.value.slice(0, 1) })
                    }
                    placeholder="f"
                    maxLength={1}
                  />
                </div>
              </div>
            )}

            {/* Required Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Required</Label>
                <p className="text-xs text-muted-foreground">
                  Command will fail if this argument is not provided
                </p>
              </div>
              <Switch
                checked={argument.required}
                onCheckedChange={(checked) => onUpdate({ required: checked })}
              />
            </div>

            {/* Default Value */}
            {!argument.required && (
              <div className="space-y-2">
                <Label>Default Value</Label>
                <Input
                  value={String(argument.defaultValue || "")}
                  onChange={(e) => onUpdate({ defaultValue: e.target.value })}
                  placeholder="Optional default value"
                />
              </div>
            )}

            {/* Choices (for choice type) */}
            {argument.type === "choice" && (
              <div className="space-y-2">
                <Label>Choices</Label>
                <p className="text-xs text-muted-foreground">
                  Enter one choice per line
                </p>
                <textarea
                  className="min-h-[100px] w-full rounded-md border bg-background p-2 font-mono text-sm"
                  value={argument.choices?.map((c) => c.value).join("\n") || ""}
                  onChange={(e) =>
                    onUpdate({
                      choices: e.target.value
                        .split("\n")
                        .filter((v) => v.trim())
                        .map((v) => ({ value: v.trim(), label: v.trim() })),
                    })
                  }
                  placeholder="option1
option2
option3"
                />
              </div>
            )}

            {/* Validation (for string/number types) */}
            {["string", "number"].includes(argument.type) && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Validation Rules
                </Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  {argument.type === "string" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs">Min Length</Label>
                        <Input
                          type="number"
                          min={0}
                          value={argument.validation?.minLength || ""}
                          onChange={(e) =>
                            onUpdate({
                              validation: {
                                ...argument.validation,
                                minLength: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Max Length</Label>
                        <Input
                          type="number"
                          min={0}
                          value={argument.validation?.maxLength || ""}
                          onChange={(e) =>
                            onUpdate({
                              validation: {
                                ...argument.validation,
                                maxLength: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                  {argument.type === "number" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs">Minimum</Label>
                        <Input
                          type="number"
                          value={argument.validation?.min ?? ""}
                          onChange={(e) =>
                            onUpdate({
                              validation: {
                                ...argument.validation,
                                min: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Maximum</Label>
                        <Input
                          type="number"
                          value={argument.validation?.max ?? ""}
                          onChange={(e) =>
                            onUpdate({
                              validation: {
                                ...argument.validation,
                                max: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </Reorder.Item>
  );
}

export default CommandArguments;
