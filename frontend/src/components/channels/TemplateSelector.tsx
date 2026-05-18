"use client";

import * as React from "react";
import {
  MessageSquare,
  Megaphone,
  Coffee,
  HelpCircle,
  FolderKanban,
  Lock,
  Hash,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CHANNEL_TEMPLATES,
  type ChannelTemplate,
} from "@/lib/channels/channel-templates";

// ============================================================================
// Types
// ============================================================================

export interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onSelect?: (template: ChannelTemplate) => void;
  showDescriptions?: boolean;
  showFeatures?: boolean;
  variant?: "grid" | "list" | "compact";
  className?: string;
}

// ============================================================================
// Icon Mapping
// ============================================================================

const TEMPLATE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Users: () => <span className="text-lg">👥</span>,
  Megaphone: Megaphone,
  Coffee: Coffee,
  HelpCircle: HelpCircle,
  FolderKanban: FolderKanban,
  Lock: Lock,
  MessageSquare: MessageSquare,
  MessageSquarePlus: MessageSquare,
  Hash: Hash,
};

function getTemplateIcon(iconName: string) {
  return TEMPLATE_ICONS[iconName] || Hash;
}

// ============================================================================
// Component
// ============================================================================

export function TemplateSelector({
  selectedTemplateId,
  onSelect,
  showDescriptions = true,
  showFeatures = false,
  variant = "grid",
  className,
}: TemplateSelectorProps) {
  const handleSelect = (template: ChannelTemplate) => {
    onSelect?.(template);
  };

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {CHANNEL_TEMPLATES.map((template) => {
          const Icon = getTemplateIcon(template.icon);
          const isSelected = selectedTemplateId === template.id;

          return (
            <Button
              key={template.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleSelect(template)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {template.name}
              {isSelected && <Check className="ml-1 h-3 w-3" />}
            </Button>
          );
        })}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-2", className)}>
        {CHANNEL_TEMPLATES.map((template) => {
          const Icon = getTemplateIcon(template.icon);
          const isSelected = selectedTemplateId === template.id;

          return (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                "hover:bg-accent",
                isSelected && "bg-primary/5 border-primary",
              )}
            >
              <div className="rounded-md bg-muted p-2">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{template.name}</span>
                  {template.type === "private" && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                {showDescriptions && (
                  <p className="truncate text-sm text-muted-foreground">
                    {template.description}
                  </p>
                )}
              </div>
              {isSelected ? (
                <Check className="h-5 w-5 text-primary" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: grid variant
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {CHANNEL_TEMPLATES.map((template) => {
        const Icon = getTemplateIcon(template.icon);
        const isSelected = selectedTemplateId === template.id;

        return (
          <Card
            key={template.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected && "border-primary ring-1 ring-primary",
            )}
            onClick={() => handleSelect(template)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-muted p-2">
                  <Icon className="h-5 w-5" />
                </div>
                {isSelected && (
                  <div className="text-primary-foreground rounded-full bg-primary p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
              <CardTitle className="flex items-center gap-2 text-base">
                {template.name}
                {template.type === "private" && (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="mr-1 h-3 w-3" />
                    Private
                  </Badge>
                )}
              </CardTitle>
              {showDescriptions && (
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              )}
            </CardHeader>
            {showFeatures && (
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {template.features.threads && (
                    <Badge variant="secondary" className="text-xs">
                      Threads
                    </Badge>
                  )}
                  {template.features.reactions && (
                    <Badge variant="secondary" className="text-xs">
                      Reactions
                    </Badge>
                  )}
                  {template.features.fileUploads && (
                    <Badge variant="secondary" className="text-xs">
                      Files
                    </Badge>
                  )}
                  {template.features.polls && (
                    <Badge variant="secondary" className="text-xs">
                      Polls
                    </Badge>
                  )}
                  {template.permissions.moderatorsOnly && (
                    <Badge variant="outline" className="text-xs">
                      Mod only
                    </Badge>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

TemplateSelector.displayName = "TemplateSelector";
