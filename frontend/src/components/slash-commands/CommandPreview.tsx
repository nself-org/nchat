"use client";

/**
 * CommandPreview - Preview command in action
 */

import { Hash, User, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CommandDraft } from "@/lib/slash-commands/command-types";
import { commandCategories } from "@/lib/slash-commands/built-in-commands";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CommandPreviewProps {
  command: CommandDraft;
  compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CommandPreview({
  command,
  compact = false,
}: CommandPreviewProps) {
  const category = command.category
    ? commandCategories[command.category as keyof typeof commandCategories]
    : null;

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Trigger */}
        <div className="flex items-center gap-2">
          <code className="bg-primary/10 rounded px-2 py-1 font-mono text-primary">
            /{command.trigger || "command"}
          </code>
          {command.aliases && command.aliases.length > 0 && (
            <span className="text-xs text-muted-foreground">
              +{command.aliases.length} alias
              {command.aliases.length > 1 ? "es" : ""}
            </span>
          )}
        </div>

        {/* Name & Description */}
        <div>
          <p className="font-medium">{command.name || "Untitled Command"}</p>
          <p className="text-sm text-muted-foreground">
            {command.description || "No description"}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-2">
          {category && (
            <Badge variant="outline" className="text-xs">
              {category.name}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {command.arguments?.length || 0} args
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {command.permissions?.minRole || "member"}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Command Card Preview */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">
          Command Card
        </h4>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg text-primary">
              <Hash className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm text-primary">
                  /{command.trigger || "command"}
                </code>
                {category && (
                  <Badge variant="outline" className="text-xs">
                    {category.name}
                  </Badge>
                )}
              </div>
              <h3 className="mt-1 font-medium">
                {command.name || "Untitled Command"}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {command.description || "No description provided"}
              </p>
            </div>
          </div>

          {/* Aliases */}
          {command.aliases && command.aliases.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              <span>Also available as:</span>
              {command.aliases.map((alias) => (
                <code key={alias} className="rounded bg-muted px-1 font-mono">
                  /{alias}
                </code>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Usage Preview */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Usage</h4>
        <div className="bg-muted/30 rounded-lg border p-4">
          <code className="font-mono text-sm">
            {command.usage || generateUsage(command)}
          </code>
        </div>
      </div>

      {/* Arguments Preview */}
      {command.arguments && command.arguments.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            Arguments
          </h4>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">Required</th>
                </tr>
              </thead>
              <tbody>
                {command.arguments.map((arg) => (
                  <tr key={arg.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{arg.name}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{arg.type}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      {arg.required ? (
                        <span className="text-primary">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chat Message Preview */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">In Chat</h4>
        <div className="rounded-lg border bg-card p-4">
          {/* User Input */}
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">You</span>
                <span className="text-xs text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" />
                  Just now
                </span>
              </div>
              <p className="mt-1">
                <code className="bg-primary/10 rounded px-1 font-mono text-primary">
                  /{command.trigger || "command"}
                </code>
                {command.arguments?.some((a) => a.required) && (
                  <span className="text-muted-foreground">
                    {" "}
                    {command.arguments
                      .filter((a) => a.required)
                      .map((a) => `<${a.name}>`)
                      .join(" ")}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Response Preview */}
          {command.actionType === "message" && command.action?.message && (
            <div className="mt-4 flex items-start gap-3 border-t pt-4">
              <Avatar className="bg-primary/10 h-8 w-8">
                <AvatarFallback className="text-primary">
                  <Hash className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">nchat</span>
                  <Badge variant="secondary" className="text-xs">
                    BOT
                  </Badge>
                </div>
                <p className="mt-1 text-sm">
                  {previewMessage(command.action.message)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permissions Summary */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Access</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <User className="mr-1 h-3 w-3" />
            {command.permissions?.minRole || "member"}+ can use
          </Badge>
          {command.permissions?.allowGuests && (
            <Badge variant="secondary">Guests allowed</Badge>
          )}
          {command.channels?.allowedTypes && (
            <Badge variant="outline">
              {command.channels.allowedTypes.length} channel types
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function generateUsage(command: CommandDraft): string {
  let usage = `/${command.trigger || "command"}`;

  const positionalArgs = command.arguments
    ?.filter((a) => a.position !== undefined)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  if (positionalArgs) {
    for (const arg of positionalArgs) {
      if (arg.required) {
        usage += ` <${arg.name}>`;
      } else {
        usage += ` [${arg.name}]`;
      }
    }
  }

  const flags = command.arguments?.filter((a) => a.flag);
  if (flags && flags.length > 0) {
    for (const flag of flags) {
      usage += ` [--${flag.flag}]`;
    }
  }

  return usage;
}

function previewMessage(template: string): string {
  // Replace template variables with example values
  return template
    .replace(/\{\{username\}\}/g, "john_doe")
    .replace(/\{\{displayName\}\}/g, "John Doe")
    .replace(/\{\{channelName\}\}/g, "general")
    .replace(/\{\{userId\}\}/g, "user-123")
    .replace(/\{\{[^}]+\}\}/g, "...");
}

export default CommandPreview;
