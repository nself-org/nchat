"use client";

import { useState, useMemo } from "react";
import {
  Flag,
  Search,
  Hash,
  Lock,
  MessageSquare,
  Upload,
  Mic,
  MessageCircle,
  Smile,
  Users,
  Link,
  FolderOpen,
  Sparkles,
  Calendar,
  Video,
  ArrowRight,
  Check,
  X,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ComponentPreview,
  PreviewCard,
  PreviewGrid,
} from "@/components/dev/component-preview";
import { CodeBlock } from "@/components/dev/code-block";

// ============================================================================
// Feature Definitions
// ============================================================================

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "channels" | "messaging" | "media" | "organization" | "advanced";
  defaultEnabled: boolean;
  dependencies?: string[];
  requiredBy?: string[];
}

const featureFlags: FeatureFlag[] = [
  // Channels
  {
    id: "publicChannels",
    name: "Public Channels",
    description: "Allow creation of public channels visible to all members",
    icon: Hash,
    category: "channels",
    defaultEnabled: true,
    requiredBy: ["channelCategories"],
  },
  {
    id: "privateChannels",
    name: "Private Channels",
    description: "Allow creation of private, invite-only channels",
    icon: Lock,
    category: "channels",
    defaultEnabled: true,
  },
  {
    id: "directMessages",
    name: "Direct Messages",
    description: "Enable one-on-one private messaging between users",
    icon: MessageSquare,
    category: "channels",
    defaultEnabled: true,
  },

  // Messaging
  {
    id: "threads",
    name: "Message Threads",
    description: "Allow threaded replies to keep conversations organized",
    icon: MessageCircle,
    category: "messaging",
    defaultEnabled: true,
  },
  {
    id: "reactions",
    name: "Emoji Reactions",
    description: "Allow users to react to messages with emoji",
    icon: Smile,
    category: "messaging",
    defaultEnabled: true,
  },
  {
    id: "search",
    name: "Message Search",
    description: "Enable full-text search across all messages",
    icon: Search,
    category: "messaging",
    defaultEnabled: true,
  },
  {
    id: "messageScheduling",
    name: "Message Scheduling",
    description: "Schedule messages to be sent at a later time",
    icon: Calendar,
    category: "messaging",
    defaultEnabled: false,
  },

  // Media
  {
    id: "fileUploads",
    name: "File Uploads",
    description: "Allow users to upload and share files",
    icon: Upload,
    category: "media",
    defaultEnabled: true,
    requiredBy: ["customEmojis"],
  },
  {
    id: "voiceMessages",
    name: "Voice Messages",
    description: "Record and send voice messages",
    icon: Mic,
    category: "media",
    defaultEnabled: false,
    dependencies: ["fileUploads"],
  },
  {
    id: "videoConferencing",
    name: "Video Conferencing",
    description: "Start video calls within channels and DMs",
    icon: Video,
    category: "media",
    defaultEnabled: false,
  },
  {
    id: "customEmojis",
    name: "Custom Emoji",
    description: "Upload and use custom emoji",
    icon: Sparkles,
    category: "media",
    defaultEnabled: false,
    dependencies: ["fileUploads", "reactions"],
  },

  // Organization
  {
    id: "guestAccess",
    name: "Guest Access",
    description: "Allow external guests with limited access",
    icon: Users,
    category: "organization",
    defaultEnabled: false,
  },
  {
    id: "inviteLinks",
    name: "Invite Links",
    description: "Generate shareable invite links for channels",
    icon: Link,
    category: "organization",
    defaultEnabled: true,
  },
  {
    id: "channelCategories",
    name: "Channel Categories",
    description: "Organize channels into collapsible categories",
    icon: FolderOpen,
    category: "organization",
    defaultEnabled: false,
    dependencies: ["publicChannels"],
  },
];

const categoryLabels = {
  channels: "Channels",
  messaging: "Messaging",
  media: "Media & Files",
  organization: "Organization",
  advanced: "Advanced",
};

// ============================================================================
// Code Examples
// ============================================================================

const featureConfigCode = `// src/config/app-config.ts

export interface AppConfig {
  features: {
    publicChannels: boolean
    privateChannels: boolean
    directMessages: boolean
    fileUploads: boolean
    voiceMessages: boolean
    threads: boolean
    reactions: boolean
    search: boolean
    guestAccess: boolean
    inviteLinks: boolean
    channelCategories: boolean
    customEmojis: boolean
    messageScheduling: boolean
    videoConferencing: boolean
  }
}`;

const featureUsageCode = `// Using feature flags in components
import { useAppConfig } from '@/contexts/app-config-context'

function MessageActions({ message }) {
  const { config } = useAppConfig()

  return (
    <div className="flex gap-1">
      {config?.features?.reactions && (
        <Button onClick={() => openReactionPicker()}>
          <Smile className="h-4 w-4" />
        </Button>
      )}

      {config?.features?.threads && (
        <Button onClick={() => openThread(message)}>
          <MessageCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}`;

const featureGuardCode = `// Feature guard component
export function FeatureGuard({
  feature,
  children,
  fallback = null
}: {
  feature: keyof AppConfig['features']
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { config } = useAppConfig()

  if (!config?.features?.[feature]) {
    return fallback
  }

  return children
}

// Usage
<FeatureGuard feature="voiceMessages">
  <VoiceRecordButton />
</FeatureGuard>`;

// ============================================================================
// Page Component
// ============================================================================

export default function FeaturesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(() => {
    const defaults = new Set<string>();
    featureFlags.forEach((f) => {
      if (f.defaultEnabled) defaults.add(f.id);
    });
    return defaults;
  });

  // Filter features based on search
  const filteredFeatures = useMemo(() => {
    if (!searchQuery) return featureFlags;
    const query = searchQuery.toLowerCase();
    return featureFlags.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  // Group features by category
  const featuresByCategory = useMemo(() => {
    const grouped: Record<string, FeatureFlag[]> = {};
    filteredFeatures.forEach((f) => {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category].push(f);
    });
    return grouped;
  }, [filteredFeatures]);

  // Toggle a feature
  const toggleFeature = (featureId: string) => {
    const feature = featureFlags.find((f) => f.id === featureId);
    if (!feature) return;

    setEnabledFeatures((prev) => {
      const next = new Set(prev);

      if (next.has(featureId)) {
        // Disabling - check if required by other enabled features
        const blockedBy = featureFlags.filter(
          (f) => f.dependencies?.includes(featureId) && next.has(f.id),
        );
        if (blockedBy.length > 0) {
          // Also disable dependent features
          blockedBy.forEach((f) => next.delete(f.id));
        }
        next.delete(featureId);
      } else {
        // Enabling - check dependencies
        if (feature.dependencies) {
          feature.dependencies.forEach((dep) => next.add(dep));
        }
        next.add(featureId);
      }

      return next;
    });
  };

  // Check if feature can be disabled
  const getFeatureStatus = (feature: FeatureFlag) => {
    const isEnabled = enabledFeatures.has(feature.id);

    // Check if dependencies are met
    const missingDeps = feature.dependencies?.filter(
      (dep) => !enabledFeatures.has(dep),
    );

    // Check if required by enabled features
    const requiredByEnabled = featureFlags.filter(
      (f) => f.dependencies?.includes(feature.id) && enabledFeatures.has(f.id),
    );

    return {
      isEnabled,
      missingDeps,
      requiredByEnabled,
      canToggle: !requiredByEnabled.length || !isEnabled,
    };
  };

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Flag className="h-5 w-5 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          </div>
          <p className="text-muted-foreground">
            Configure which features are available in your nself-chat
            deployment. Toggle features on/off to customize the user experience.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {enabledFeatures.size} / {featureFlags.length} enabled
          </Badge>
          <Badge variant="outline" className="text-sm">
            {featureFlags.filter((f) => f.defaultEnabled).length} default
            enabled
          </Badge>
        </div>

        <Separator />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Feature Toggle Grid */}
        <section className="space-y-8">
          {Object.entries(featuresByCategory).map(([category, features]) => (
            <div key={category}>
              <h2 className="mb-4 text-lg font-semibold">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  const status = getFeatureStatus(feature);

                  return (
                    <Card
                      key={feature.id}
                      className={cn(
                        "transition-all",
                        status.isEnabled && "border-primary/30 bg-primary/5",
                      )}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "rounded-lg p-2",
                                status.isEnabled ? "bg-primary/10" : "bg-muted",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-5 w-5",
                                  status.isEnabled
                                    ? "text-primary"
                                    : "text-muted-foreground",
                                )}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor={feature.id}
                                  className="cursor-pointer font-medium"
                                >
                                  {feature.name}
                                </Label>
                                {feature.dependencies && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        Requires:{" "}
                                        {feature.dependencies
                                          .map(
                                            (d) =>
                                              featureFlags.find(
                                                (f) => f.id === d,
                                              )?.name,
                                          )
                                          .join(", ")}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {feature.description}
                              </p>

                              {/* Dependency warnings */}
                              {status.missingDeps &&
                                status.missingDeps.length > 0 && (
                                  <p className="mt-2 text-xs text-amber-500">
                                    Will also enable:{" "}
                                    {status.missingDeps
                                      .map(
                                        (d) =>
                                          featureFlags.find((f) => f.id === d)
                                            ?.name,
                                      )
                                      .join(", ")}
                                  </p>
                                )}

                              {status.requiredByEnabled.length > 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Used by:{" "}
                                  {status.requiredByEnabled
                                    .map((f) => f.name)
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                          </div>

                          <Switch
                            id={feature.id}
                            checked={status.isEnabled}
                            onCheckedChange={() => toggleFeature(feature.id)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <Separator />

        {/* Dependency Visualization */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Feature Dependencies</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {featureFlags
                  .filter((f) => f.dependencies && f.dependencies.length > 0)
                  .map((feature) => (
                    <div
                      key={feature.id}
                      className="flex items-center gap-4 text-sm"
                    >
                      <div className="flex min-w-[200px] items-center gap-2">
                        {enabledFeatures.has(feature.id) ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            !enabledFeatures.has(feature.id) &&
                              "text-muted-foreground",
                          )}
                        >
                          {feature.name}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">requires</span>
                        {feature.dependencies?.map((dep, i) => {
                          const depFeature = featureFlags.find(
                            (f) => f.id === dep,
                          );
                          return (
                            <span key={dep}>
                              <Badge
                                variant={
                                  enabledFeatures.has(dep)
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {depFeature?.name}
                              </Badge>
                              {i < (feature.dependencies?.length || 0) - 1 && (
                                <span className="mx-1">+</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Code Examples */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Implementation Guide</h2>

          <Card>
            <CardHeader>
              <CardTitle>Feature Configuration</CardTitle>
              <CardDescription>
                Features are configured in the AppConfig interface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={featureConfigCode}
                language="typescript"
                filename="app-config.ts"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Using Feature Flags</CardTitle>
              <CardDescription>
                Check feature flags in components to conditionally render UI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={featureUsageCode}
                language="tsx"
                filename="message-actions.tsx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Guard Component</CardTitle>
              <CardDescription>
                A reusable component for feature-gated content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={featureGuardCode}
                language="tsx"
                filename="feature-guard.tsx"
              />
            </CardContent>
          </Card>
        </section>

        {/* Best Practices */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Best Practices</h2>
          <PreviewGrid cols={3}>
            <PreviewCard title="Default Conservatively">
              <p className="text-sm text-muted-foreground">
                Start with core features enabled and let users opt into advanced
                features through the setup wizard.
              </p>
            </PreviewCard>
            <PreviewCard title="Handle Dependencies">
              <p className="text-sm text-muted-foreground">
                When disabling a feature, consider its dependents. Provide clear
                warnings about cascading effects.
              </p>
            </PreviewCard>
            <PreviewCard title="Graceful Degradation">
              <p className="text-sm text-muted-foreground">
                Components should handle disabled features gracefully, hiding UI
                elements rather than showing errors.
              </p>
            </PreviewCard>
          </PreviewGrid>
        </section>
      </div>
    </TooltipProvider>
  );
}
