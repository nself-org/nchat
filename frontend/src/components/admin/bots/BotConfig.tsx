/**
 * Bot Configuration UI Component
 *
 * Comprehensive configuration interface for bots including triggers,
 * channel scope, permissions, rate limiting, and environment variables.
 */

"use client";

import { useState } from "react";
import {
  Settings,
  Zap,
  Hash,
  Users,
  Shield,
  Clock,
  Key,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import type { Bot, BotPermissionScope } from "@/types/bot";

interface BotConfigProps {
  bot: Bot;
  channels?: Array<{ id: string; name: string }>;
  onSave?: (config: BotConfiguration) => Promise<void>;
}

interface BotConfiguration {
  triggers: TriggerConfig[];
  channelScope: ChannelScope;
  permissions: BotPermissionScope[];
  rateLimits: RateLimitConfig;
  environmentVars: EnvironmentVariable[];
}

interface TriggerConfig {
  id: string;
  type: "keyword" | "pattern" | "schedule" | "event";
  value: string;
  enabled: boolean;
}

interface ChannelScope {
  mode: "all" | "specific" | "exclude";
  channelIds: string[];
}

interface RateLimitConfig {
  messagesPerMinute: number;
  commandsPerMinute: number;
  enabled: boolean;
}

interface EnvironmentVariable {
  key: string;
  value: string;
  isSecret: boolean;
}

// Available permissions
const AVAILABLE_PERMISSIONS: Array<{
  id: BotPermissionScope;
  name: string;
  description: string;
  category: string;
  dangerous?: boolean;
}> = [
  {
    id: "messages.read",
    name: "Read Messages",
    description: "Read messages in channels",
    category: "Messages",
  },
  {
    id: "messages.write",
    name: "Send Messages",
    description: "Send messages to channels",
    category: "Messages",
  },
  {
    id: "messages.delete",
    name: "Delete Messages",
    description: "Delete bot messages",
    category: "Messages",
    dangerous: true,
  },
  {
    id: "channels.read",
    name: "View Channels",
    description: "View channel information",
    category: "Channels",
  },
  {
    id: "channels.manage",
    name: "Manage Channels",
    description: "Create and update channels",
    category: "Channels",
    dangerous: true,
  },
  {
    id: "users.read",
    name: "View Users",
    description: "View user information",
    category: "Users",
  },
  {
    id: "reactions.read",
    name: "View Reactions",
    description: "View reactions on messages",
    category: "Reactions",
  },
  {
    id: "reactions.write",
    name: "Add Reactions",
    description: "Add reactions to messages",
    category: "Reactions",
  },
  {
    id: "files.read",
    name: "View Files",
    description: "View file attachments",
    category: "Files",
  },
  {
    id: "files.write",
    name: "Upload Files",
    description: "Upload file attachments",
    category: "Files",
  },
];

export function BotConfig({ bot, channels = [], onSave }: BotConfigProps) {
  const [config, setConfig] = useState<BotConfiguration>({
    triggers: [],
    channelScope: {
      mode: "all",
      channelIds: [],
    },
    permissions: bot.permissions.scopes || [],
    rateLimits: {
      messagesPerMinute: 30,
      commandsPerMinute: 10,
      enabled: true,
    },
    environmentVars: [],
  });

  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  // Add trigger
  const addTrigger = () => {
    setConfig((prev) => ({
      ...prev,
      triggers: [
        ...prev.triggers,
        {
          id: `trigger-${Date.now()}`,
          type: "keyword",
          value: "",
          enabled: true,
        },
      ],
    }));
  };

  // Remove trigger
  const removeTrigger = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      triggers: prev.triggers.filter((t) => t.id !== id),
    }));
  };

  // Update trigger
  const updateTrigger = (id: string, updates: Partial<TriggerConfig>) => {
    setConfig((prev) => ({
      ...prev,
      triggers: prev.triggers.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    }));
  };

  // Add environment variable
  const addEnvVar = () => {
    setConfig((prev) => ({
      ...prev,
      environmentVars: [
        ...prev.environmentVars,
        { key: "", value: "", isSecret: false },
      ],
    }));
  };

  // Remove environment variable
  const removeEnvVar = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      environmentVars: prev.environmentVars.filter((_, i) => i !== index),
    }));
  };

  // Update environment variable
  const updateEnvVar = (
    index: number,
    updates: Partial<EnvironmentVariable>,
  ) => {
    setConfig((prev) => ({
      ...prev,
      environmentVars: prev.environmentVars.map((v, i) =>
        i === index ? { ...v, ...updates } : v,
      ),
    }));
  };

  // Toggle permission
  const togglePermission = (permission: BotPermissionScope) => {
    setConfig((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  // Toggle channel
  const toggleChannel = (channelId: string) => {
    setConfig((prev) => ({
      ...prev,
      channelScope: {
        ...prev.channelScope,
        channelIds: prev.channelScope.channelIds.includes(channelId)
          ? prev.channelScope.channelIds.filter((id) => id !== channelId)
          : [...prev.channelScope.channelIds, channelId],
      },
    }));
  };

  // Save configuration
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(config);
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by category
  const permissionsByCategory = AVAILABLE_PERMISSIONS.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_PERMISSIONS>,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Settings className="h-6 w-6" />
            Bot Configuration
          </h2>
          <p className="text-muted-foreground">
            Configure triggers, permissions, and bot behavior
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="triggers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="triggers">
            <Zap className="mr-2 h-4 w-4" />
            Triggers
          </TabsTrigger>
          <TabsTrigger value="channels">
            <Hash className="mr-2 h-4 w-4" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="mr-2 h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="rate-limits">
            <Clock className="mr-2 h-4 w-4" />
            Rate Limits
          </TabsTrigger>
          <TabsTrigger value="environment">
            <Key className="mr-2 h-4 w-4" />
            Environment
          </TabsTrigger>
        </TabsList>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bot Triggers</CardTitle>
                  <CardDescription>
                    Configure when your bot should activate
                  </CardDescription>
                </div>
                <Button onClick={addTrigger}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Trigger
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.triggers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Zap className="mb-2 h-8 w-8" />
                  <p>No triggers configured</p>
                </div>
              ) : (
                config.triggers.map((trigger) => (
                  <div
                    key={trigger.id}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-4">
                          <Select
                            value={trigger.type}
                            onValueChange={(value: any) =>
                              updateTrigger(trigger.id, { type: value })
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="keyword">Keyword</SelectItem>
                              <SelectItem value="pattern">
                                Regex Pattern
                              </SelectItem>
                              <SelectItem value="schedule">
                                Schedule (Cron)
                              </SelectItem>
                              <SelectItem value="event">Event</SelectItem>
                            </SelectContent>
                          </Select>
                          <Switch
                            checked={trigger.enabled}
                            onCheckedChange={(enabled) =>
                              updateTrigger(trigger.id, { enabled })
                            }
                          />
                        </div>
                        <Input
                          value={trigger.value}
                          onChange={(e) =>
                            updateTrigger(trigger.id, { value: e.target.value })
                          }
                          placeholder={
                            trigger.type === "keyword"
                              ? "Enter keyword..."
                              : trigger.type === "pattern"
                                ? "Enter regex pattern..."
                                : trigger.type === "schedule"
                                  ? "0 0 * * *"
                                  : "Enter event name..."
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTrigger(trigger.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel Scope</CardTitle>
              <CardDescription>
                Select which channels the bot can operate in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Scope Mode</Label>
                <Select
                  value={config.channelScope.mode}
                  onValueChange={(value: any) =>
                    setConfig((prev) => ({
                      ...prev,
                      channelScope: { ...prev.channelScope, mode: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="specific">Specific Channels</SelectItem>
                    <SelectItem value="exclude">Exclude Channels</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.channelScope.mode !== "all" && (
                <div className="space-y-2">
                  <Label>
                    {config.channelScope.mode === "specific"
                      ? "Allowed Channels"
                      : "Excluded Channels"}
                  </Label>
                  <div className="space-y-2">
                    {channels.map((channel) => (
                      <div
                        key={channel.id}
                        className="flex items-center gap-2 rounded-lg border p-3"
                      >
                        <Checkbox
                          checked={config.channelScope.channelIds.includes(
                            channel.id,
                          )}
                          onCheckedChange={() => toggleChannel(channel.id)}
                        />
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{channel.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bot Permissions</CardTitle>
              <CardDescription>
                Grant permissions required for bot functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(permissionsByCategory).map(
                ([category, perms]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="font-semibold">{category}</h4>
                    <div className="space-y-2">
                      {perms.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-start gap-3 rounded-lg border p-3"
                        >
                          <Checkbox
                            checked={config.permissions.includes(permission.id)}
                            onCheckedChange={() =>
                              togglePermission(permission.id)
                            }
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{permission.name}</p>
                              {permission.dangerous && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Dangerous
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rate Limits Tab */}
        <TabsContent value="rate-limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>
                Configure rate limits to prevent abuse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Rate Limiting</Label>
                  <p className="text-sm text-muted-foreground">
                    Limit bot actions per minute
                  </p>
                </div>
                <Switch
                  checked={config.rateLimits.enabled}
                  onCheckedChange={(enabled) =>
                    setConfig((prev) => ({
                      ...prev,
                      rateLimits: { ...prev.rateLimits, enabled },
                    }))
                  }
                />
              </div>

              {config.rateLimits.enabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Messages Per Minute</Label>
                    <Input
                      type="number"
                      value={config.rateLimits.messagesPerMinute}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          rateLimits: {
                            ...prev.rateLimits,
                            messagesPerMinute: parseInt(e.target.value),
                          },
                        }))
                      }
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Commands Per Minute</Label>
                    <Input
                      type="number"
                      value={config.rateLimits.commandsPerMinute}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          rateLimits: {
                            ...prev.rateLimits,
                            commandsPerMinute: parseInt(e.target.value),
                          },
                        }))
                      }
                      min={1}
                      max={60}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Environment Variables Tab */}
        <TabsContent value="environment" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Environment Variables</CardTitle>
                  <CardDescription>
                    Configure environment variables and secrets for your bot
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? (
                      <EyeOff className="mr-2 h-4 w-4" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    {showSecrets ? "Hide" : "Show"} Secrets
                  </Button>
                  <Button onClick={addEnvVar}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Variable
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.environmentVars.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Key className="mb-2 h-8 w-8" />
                  <p>No environment variables configured</p>
                </div>
              ) : (
                config.environmentVars.map((envVar, index) => (
                  <div key={index} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <Input
                          placeholder="VARIABLE_NAME"
                          value={envVar.key}
                          onChange={(e) =>
                            updateEnvVar(index, { key: e.target.value })
                          }
                        />
                        <Input
                          type={
                            envVar.isSecret && !showSecrets
                              ? "password"
                              : "text"
                          }
                          placeholder="value"
                          value={envVar.value}
                          onChange={(e) =>
                            updateEnvVar(index, { value: e.target.value })
                          }
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`secret-${index}`}
                            checked={envVar.isSecret}
                            onCheckedChange={(checked) =>
                              updateEnvVar(index, {
                                isSecret: checked as boolean,
                              })
                            }
                          />
                          <Label
                            htmlFor={`secret-${index}`}
                            className="text-sm"
                          >
                            Mark as secret
                          </Label>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEnvVar(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
