"use client";

/**
 * CommandTrigger - Trigger word configuration
 */

import { useState, useCallback } from "react";
import { X, Plus, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sanitizeTrigger } from "@/lib/slash-commands";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CommandTriggerProps {
  value: string;
  aliases?: string[];
  onChange: (trigger: string, aliases?: string[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export function CommandTrigger({
  value,
  aliases = [],
  onChange,
}: CommandTriggerProps) {
  const [newAlias, setNewAlias] = useState("");
  const [triggerError, setTriggerError] = useState<string | null>(null);

  // Validate and update trigger
  const handleTriggerChange = useCallback(
    (input: string) => {
      const sanitized = sanitizeTrigger(input);

      // Validate
      if (sanitized && !/^[a-z][a-z0-9_-]*$/.test(sanitized)) {
        setTriggerError(
          "Must start with a letter, only letters, numbers, _, -",
        );
      } else if (sanitized && sanitized.length < 2) {
        setTriggerError("Must be at least 2 characters");
      } else {
        setTriggerError(null);
      }

      onChange(sanitized, aliases);
    },
    [aliases, onChange],
  );

  // Add alias
  const handleAddAlias = useCallback(() => {
    if (!newAlias.trim()) return;

    const sanitized = sanitizeTrigger(newAlias);
    if (!sanitized) return;

    // Check if already exists
    if (aliases.includes(sanitized) || sanitized === value) {
      return;
    }

    onChange(value, [...aliases, sanitized]);
    setNewAlias("");
  }, [newAlias, aliases, value, onChange]);

  // Remove alias
  const handleRemoveAlias = useCallback(
    (alias: string) => {
      onChange(
        value,
        aliases.filter((a) => a !== alias),
      );
    },
    [value, aliases, onChange],
  );

  return (
    <div className="space-y-4">
      {/* Main Trigger */}
      <div className="space-y-2">
        <Label htmlFor="trigger">Command Trigger</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            /
          </span>
          <Input
            id="trigger"
            value={value}
            onChange={(e) => handleTriggerChange(e.target.value)}
            placeholder="mycommand"
            className={cn(
              "pl-7 font-mono",
              triggerError &&
                "border-destructive focus-visible:ring-destructive",
            )}
            maxLength={32}
          />
        </div>
        {triggerError ? (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {triggerError}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            The word users type after / to trigger this command
          </p>
        )}
      </div>

      {/* Preview */}
      {value && (
        <div className="bg-muted/50 rounded-lg border p-3">
          <p className="text-sm">
            Users will type:{" "}
            <code className="rounded bg-muted px-1 font-mono">/{value}</code>
          </p>
        </div>
      )}

      {/* Aliases */}
      <div className="space-y-2">
        <Label>Aliases (Optional)</Label>
        <p className="text-xs text-muted-foreground">
          Alternative triggers that also activate this command
        </p>

        {/* Current Aliases */}
        {aliases.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {aliases.map((alias) => (
              <Badge key={alias} variant="secondary" className="gap-1">
                /{alias}
                <button
                  onClick={() => handleRemoveAlias(alias)}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Add Alias */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              /
            </span>
            <Input
              value={newAlias}
              onChange={(e) => setNewAlias(sanitizeTrigger(e.target.value))}
              placeholder="alias"
              className="pl-7 font-mono"
              maxLength={32}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddAlias();
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddAlias}
            disabled={!newAlias.trim() || aliases.length >= 5}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Maximum 5 aliases. Press Enter to add.
        </p>
      </div>
    </div>
  );
}

export default CommandTrigger;
