"use client";

/**
 * CommandInfo - Name, description, usage configuration
 */

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { commandCategories } from "@/lib/slash-commands/built-in-commands";
import type { CommandCategory } from "@/lib/slash-commands/command-types";
import {
  HelpCircle,
  Hash,
  User,
  MessageSquare,
  Shield,
  Smile,
  Wrench,
  Plug,
  Sparkles,
  Grid,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface CommandInfoProps {
  name?: string;
  description?: string;
  helpText?: string;
  usage?: string;
  category?: CommandCategory;
  icon?: string;
  onChange: (updates: {
    name?: string;
    description?: string;
    helpText?: string;
    usage?: string;
    category?: CommandCategory;
    icon?: string;
  }) => void;
}

// ============================================================================
// Icon Map
// ============================================================================

const iconOptions = [
  { value: "Grid", label: "Grid", icon: Grid },
  { value: "Hash", label: "Hash", icon: Hash },
  { value: "User", label: "User", icon: User },
  { value: "MessageSquare", label: "Message", icon: MessageSquare },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Smile", label: "Smile", icon: Smile },
  { value: "Wrench", label: "Tool", icon: Wrench },
  { value: "Plug", label: "Plug", icon: Plug },
  { value: "Sparkles", label: "Sparkles", icon: Sparkles },
  { value: "HelpCircle", label: "Help", icon: HelpCircle },
];

// ============================================================================
// Component
// ============================================================================

export function CommandInfo({
  name = "",
  description = "",
  helpText = "",
  usage = "",
  category = "custom",
  icon = "",
  onChange,
}: CommandInfoProps) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="My Command"
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          Human-readable name shown in help and command list
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Short Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What does this command do?"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Brief description shown in command suggestions (10-200 chars)
        </p>
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="helpText">Detailed Help</Label>
        <Textarea
          id="helpText"
          value={helpText}
          onChange={(e) => onChange({ helpText: e.target.value })}
          placeholder="Detailed explanation of how to use this command..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Shown when user types /help [command]
        </p>
      </div>

      {/* Usage */}
      <div className="space-y-2">
        <Label htmlFor="usage">Usage Example</Label>
        <Input
          id="usage"
          value={usage}
          onChange={(e) => onChange({ usage: e.target.value })}
          placeholder="/mycommand <required> [optional]"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Example syntax shown in help. Use &lt;required&gt; and [optional] for
          arguments.
        </p>
      </div>

      {/* Category and Icon */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(value) =>
              onChange({ category: value as CommandCategory })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(commandCategories).map(([key, cat]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{cat.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Group commands by category in the command list
          </p>
        </div>

        {/* Icon */}
        <div className="space-y-2">
          <Label>Icon</Label>
          <Select
            value={icon}
            onValueChange={(value) => onChange({ icon: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select icon">
                {icon && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const IconComponent = iconOptions.find(
                        (i) => i.value === icon,
                      )?.icon;
                      return IconComponent ? (
                        <IconComponent className="h-4 w-4" />
                      ) : null;
                    })()}
                    <span>{icon}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="h-4 w-4" />
                    <span>{opt.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Icon shown next to command in list
          </p>
        </div>
      </div>
    </div>
  );
}

export default CommandInfo;
