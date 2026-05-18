"use client";

/**
 * GitHub Settings Component
 *
 * Allows users to connect/disconnect their GitHub account,
 * select repositories to receive notifications from,
 * and configure notification preferences.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// Types
// ============================================================================

interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  email?: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description?: string;
  defaultBranch: string;
}

interface GitHubSettings {
  connected: boolean;
  user?: GitHubUser;
  selectedRepositories: string[];
  notifications: {
    issues: boolean;
    pullRequests: boolean;
    pushes: boolean;
    releases: boolean;
    reviews: boolean;
    deployments: boolean;
  };
  targetChannel?: string;
}

interface GitHubSettingsProps {
  settings?: GitHubSettings;
  repositories?: GitHubRepository[];
  channels?: Array<{ id: string; name: string }>;
  isLoading?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSettingsChange?: (settings: Partial<GitHubSettings>) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function GitHubSettings({
  settings,
  repositories = [],
  channels = [],
  isLoading = false,
  onConnect,
  onDisconnect,
  onSettingsChange,
  className,
}: GitHubSettingsProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter repositories by search query
  const filteredRepositories = React.useMemo(() => {
    if (!searchQuery) return repositories;
    const query = searchQuery.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.fullName.toLowerCase().includes(query),
    );
  }, [repositories, searchQuery]);

  const handleToggleRepository = React.useCallback(
    (repoFullName: string, checked: boolean) => {
      if (!settings || !onSettingsChange) return;

      const selectedRepositories = checked
        ? [...settings.selectedRepositories, repoFullName]
        : settings.selectedRepositories.filter((r) => r !== repoFullName);

      onSettingsChange({ selectedRepositories });
    },
    [settings, onSettingsChange],
  );

  const handleNotificationChange = React.useCallback(
    (key: keyof GitHubSettings["notifications"], value: boolean) => {
      if (!settings || !onSettingsChange) return;

      onSettingsChange({
        notifications: {
          ...settings.notifications,
          [key]: value,
        },
      });
    },
    [settings, onSettingsChange],
  );

  const handleChannelChange = React.useCallback(
    (channelId: string) => {
      onSettingsChange?.({ targetChannel: channelId });
    },
    [onSettingsChange],
  );

  if (isLoading) {
    return <GitHubSettingsSkeleton className={className} />;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <GitHubIcon className="h-8 w-8" />
            <div>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>
                Connect your GitHub account to receive notifications and
                interact with repositories
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {settings?.connected && settings.user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={settings.user.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <p className="font-medium">
                    {settings.user.name || settings.user.login}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{settings.user.login}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-600"
                >
                  Connected
                </Badge>
              </div>
              <Button variant="outline" onClick={onDisconnect}>
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-center text-muted-foreground">
                Connect your GitHub account to enable notifications for issues,
                pull requests, and more.
              </p>
              <Button onClick={onConnect}>
                <GitHubIcon className="mr-2 h-4 w-4" />
                Connect GitHub
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repository Selection */}
      {settings?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Repositories</CardTitle>
            <CardDescription>
              Select which repositories you want to receive notifications from
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              {settings.selectedRepositories.length > 0 && (
                <Badge variant="secondary">
                  {settings.selectedRepositories.length} selected
                </Badge>
              )}
            </div>

            <ScrollArea className="h-64 rounded-md border">
              {filteredRepositories.length === 0 ? (
                <div className="flex h-full items-center justify-center p-4">
                  <p className="text-muted-foreground">
                    {repositories.length === 0
                      ? "No repositories found"
                      : "No matching repositories"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {filteredRepositories.map((repo) => (
                    <RepositoryItem
                      key={repo.id}
                      repository={repo}
                      isSelected={settings.selectedRepositories.includes(
                        repo.fullName,
                      )}
                      onToggle={(checked) =>
                        handleToggleRepository(repo.fullName, checked)
                      }
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      {settings?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose which events to receive notifications for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target Channel */}
            {channels.length > 0 && (
              <div className="space-y-2">
                <Label>Send notifications to</Label>
                <Select
                  value={settings.targetChannel}
                  onValueChange={handleChannelChange}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        #{channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* Event Types */}
            <div className="space-y-4">
              <NotificationToggle
                id="issues"
                title="Issues"
                description="Issue opened, closed, or commented"
                checked={settings.notifications.issues}
                onCheckedChange={(checked) =>
                  handleNotificationChange("issues", checked)
                }
              />

              <NotificationToggle
                id="pullRequests"
                title="Pull Requests"
                description="PR opened, merged, closed, or commented"
                checked={settings.notifications.pullRequests}
                onCheckedChange={(checked) =>
                  handleNotificationChange("pullRequests", checked)
                }
              />

              <NotificationToggle
                id="pushes"
                title="Pushes"
                description="Code pushed to branches"
                checked={settings.notifications.pushes}
                onCheckedChange={(checked) =>
                  handleNotificationChange("pushes", checked)
                }
              />

              <NotificationToggle
                id="releases"
                title="Releases"
                description="New releases published"
                checked={settings.notifications.releases}
                onCheckedChange={(checked) =>
                  handleNotificationChange("releases", checked)
                }
              />

              <NotificationToggle
                id="reviews"
                title="Reviews"
                description="PR reviews and review comments"
                checked={settings.notifications.reviews}
                onCheckedChange={(checked) =>
                  handleNotificationChange("reviews", checked)
                }
              />

              <NotificationToggle
                id="deployments"
                title="Deployments"
                description="Deployment started or completed"
                checked={settings.notifications.deployments}
                onCheckedChange={(checked) =>
                  handleNotificationChange("deployments", checked)
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook URL */}
      {settings?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
            <CardDescription>
              Configure webhooks in your GitHub repository settings to receive
              events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/github`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/api/webhooks/github`,
                    );
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                In your GitHub repository settings, add a webhook with this URL
                and select the events you want to receive. Set the content type
                to <code className="text-xs">application/json</code>.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface RepositoryItemProps {
  repository: GitHubRepository;
  isSelected: boolean;
  onToggle: (checked: boolean) => void;
}

function RepositoryItem({
  repository,
  isSelected,
  onToggle,
}: RepositoryItemProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted",
        isSelected && "bg-muted",
      )}
    >
      <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{repository.name}</span>
          {repository.private && (
            <LockIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          )}
        </div>
        {repository.description && (
          <p className="truncate text-sm text-muted-foreground">
            {repository.description}
          </p>
        )}
      </div>
    </label>
  );
}

interface NotificationToggleProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function NotificationToggle({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{title}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function GitHubSettingsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export default GitHubSettings;
