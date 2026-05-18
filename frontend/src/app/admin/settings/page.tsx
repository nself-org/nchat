"use client";

import { useState } from "react";
import {
  Settings,
  Save,
  Upload,
  Shield,
  Bell,
  Lock,
  Palette,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAdminAccess } from "@/lib/admin/use-admin";
import { useAppConfig } from "@/contexts/app-config-context";

interface WorkspaceSettings {
  general: {
    name: string;
    description: string;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
  };
  security: {
    allowRegistration: boolean;
    requireEmailVerification: boolean;
    enforceStrongPasswords: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    allowedDomains: string;
  };
  features: {
    enableDirectMessages: boolean;
    enableThreads: boolean;
    enableReactions: boolean;
    enableFileUploads: boolean;
    enableVoiceMessages: boolean;
    enableVideoConferencing: boolean;
    maxFileSize: number;
    allowedFileTypes: string;
  };
  moderation: {
    enableAutoModeration: boolean;
    bannedWords: string;
    requireApprovalForNewUsers: boolean;
    enableSpamFilter: boolean;
    maxMessagesPerMinute: number;
  };
  notifications: {
    enableEmailNotifications: boolean;
    enablePushNotifications: boolean;
    digestFrequency: "instant" | "daily" | "weekly" | "never";
    allowUserPreferences: boolean;
  };
}

const defaultSettings: WorkspaceSettings = {
  general: {
    name: "nchat",
    description: "Team Communication Platform",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#6366f1",
  },
  security: {
    allowRegistration: true,
    requireEmailVerification: true,
    enforceStrongPasswords: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    allowedDomains: "",
  },
  features: {
    enableDirectMessages: true,
    enableThreads: true,
    enableReactions: true,
    enableFileUploads: true,
    enableVoiceMessages: false,
    enableVideoConferencing: false,
    maxFileSize: 100,
    allowedFileTypes: "jpg,jpeg,png,gif,pdf,doc,docx",
  },
  moderation: {
    enableAutoModeration: false,
    bannedWords: "",
    requireApprovalForNewUsers: false,
    enableSpamFilter: true,
    maxMessagesPerMinute: 30,
  },
  notifications: {
    enableEmailNotifications: true,
    enablePushNotifications: true,
    digestFrequency: "daily",
    allowUserPreferences: true,
  },
};

export default function SettingsPage() {
  const { canManageSettings, isOwner } = useAdminAccess();
  // Prefix with underscore as it's unused
  const _isOwner = isOwner;
  const [settings, setSettings] = useState<WorkspaceSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSettings = <K extends keyof WorkspaceSettings>(
    section: K,
    key: keyof WorkspaceSettings[K],
    value: WorkspaceSettings[K][keyof WorkspaceSettings[K]],
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
  };

  if (!canManageSettings) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Settings className="h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            Only the workspace owner can manage these settings.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Settings className="h-8 w-8" />
              Workspace Settings
            </h1>
            <p className="text-muted-foreground">
              Configure your workspace settings, features, and security
            </p>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-2 rounded-lg border border-orange-500/50 bg-orange-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span>You have unsaved changes.</span>
          </div>
        )}

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:inline-grid lg:w-auto">
            <TabsTrigger value="general" className="gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Features</span>
            </TabsTrigger>
            <TabsTrigger value="moderation" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Moderation</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure your workspace branding and basic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    value={settings.general.name}
                    onChange={(e) =>
                      updateSettings("general", "name", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={settings.general.description}
                    onChange={(e) =>
                      updateSettings("general", "description", e.target.value)
                    }
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="logo">Logo URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="logo"
                        value={settings.general.logoUrl}
                        onChange={(e) =>
                          updateSettings("general", "logoUrl", e.target.value)
                        }
                        placeholder="https://..."
                      />
                      <Button variant="outline" size="icon">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="favicon">Favicon URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="favicon"
                        value={settings.general.faviconUrl}
                        onChange={(e) =>
                          updateSettings(
                            "general",
                            "faviconUrl",
                            e.target.value,
                          )
                        }
                        placeholder="https://..."
                      />
                      <Button variant="outline" size="icon">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.general.primaryColor}
                      onChange={(e) =>
                        updateSettings(
                          "general",
                          "primaryColor",
                          e.target.value,
                        )
                      }
                      className="h-10 w-20 p-1"
                    />
                    <Input
                      value={settings.general.primaryColor}
                      onChange={(e) =>
                        updateSettings(
                          "general",
                          "primaryColor",
                          e.target.value,
                        )
                      }
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure authentication and security policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to create accounts
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.allowRegistration}
                    onCheckedChange={(checked) =>
                      updateSettings("security", "allowRegistration", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must verify their email before accessing the
                      workspace
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.requireEmailVerification}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "security",
                        "requireEmailVerification",
                        checked,
                      )
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enforce Strong Passwords</Label>
                    <p className="text-sm text-muted-foreground">
                      Require passwords with minimum 8 characters, numbers, and
                      symbols
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.enforceStrongPasswords}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "security",
                        "enforceStrongPasswords",
                        checked,
                      )
                    }
                  />
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">
                      Session Timeout (days)
                    </Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      min={1}
                      max={365}
                      value={settings.security.sessionTimeout}
                      onChange={(e) =>
                        updateSettings(
                          "security",
                          "sessionTimeout",
                          parseInt(e.target.value) || 30,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      min={1}
                      max={20}
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) =>
                        updateSettings(
                          "security",
                          "maxLoginAttempts",
                          parseInt(e.target.value) || 5,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowedDomains">Allowed Email Domains</Label>
                  <Input
                    id="allowedDomains"
                    value={settings.security.allowedDomains}
                    onChange={(e) =>
                      updateSettings(
                        "security",
                        "allowedDomains",
                        e.target.value,
                      )
                    }
                    placeholder="company.com, partner.org (leave empty to allow all)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of allowed email domains. Leave empty
                    to allow all.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Settings */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Feature Settings</CardTitle>
                <CardDescription>
                  Enable or disable platform features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    {
                      key: "enableDirectMessages",
                      label: "Direct Messages",
                      desc: "Allow private messaging between users",
                    },
                    {
                      key: "enableThreads",
                      label: "Threads",
                      desc: "Allow threaded replies to messages",
                    },
                    {
                      key: "enableReactions",
                      label: "Reactions",
                      desc: "Allow emoji reactions on messages",
                    },
                    {
                      key: "enableFileUploads",
                      label: "File Uploads",
                      desc: "Allow users to upload files",
                    },
                    {
                      key: "enableVoiceMessages",
                      label: "Voice Messages",
                      desc: "Allow voice message recording",
                    },
                    {
                      key: "enableVideoConferencing",
                      label: "Video Conferencing",
                      desc: "Enable video calls (requires integration)",
                    },
                  ].map(({ key, label, desc }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <Label>{label}</Label>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={
                          settings.features[
                            key as keyof typeof settings.features
                          ] as boolean
                        }
                        onCheckedChange={(checked) =>
                          updateSettings(
                            "features",
                            key as keyof typeof settings.features,
                            checked,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                    <Input
                      id="maxFileSize"
                      type="number"
                      min={1}
                      max={500}
                      value={settings.features.maxFileSize}
                      onChange={(e) =>
                        updateSettings(
                          "features",
                          "maxFileSize",
                          parseInt(e.target.value) || 100,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
                    <Input
                      id="allowedFileTypes"
                      value={settings.features.allowedFileTypes}
                      onChange={(e) =>
                        updateSettings(
                          "features",
                          "allowedFileTypes",
                          e.target.value,
                        )
                      }
                      placeholder="jpg,png,pdf,doc"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Settings */}
          <TabsContent value="moderation">
            <Card>
              <CardHeader>
                <CardTitle>Moderation Settings</CardTitle>
                <CardDescription>
                  Configure content moderation and spam protection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Moderation</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically flag content based on rules
                    </p>
                  </div>
                  <Switch
                    checked={settings.moderation.enableAutoModeration}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "moderation",
                        "enableAutoModeration",
                        checked,
                      )
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Spam Filter</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically detect and filter spam messages
                    </p>
                  </div>
                  <Switch
                    checked={settings.moderation.enableSpamFilter}
                    onCheckedChange={(checked) =>
                      updateSettings("moderation", "enableSpamFilter", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Approval for New Users</Label>
                    <p className="text-sm text-muted-foreground">
                      Admin must approve new user registrations
                    </p>
                  </div>
                  <Switch
                    checked={settings.moderation.requireApprovalForNewUsers}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "moderation",
                        "requireApprovalForNewUsers",
                        checked,
                      )
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="maxMessagesPerMinute">
                    Max Messages Per Minute
                  </Label>
                  <Input
                    id="maxMessagesPerMinute"
                    type="number"
                    min={1}
                    max={100}
                    value={settings.moderation.maxMessagesPerMinute}
                    onChange={(e) =>
                      updateSettings(
                        "moderation",
                        "maxMessagesPerMinute",
                        parseInt(e.target.value) || 30,
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Rate limit for messages to prevent spam
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bannedWords">Banned Words</Label>
                  <Textarea
                    id="bannedWords"
                    value={settings.moderation.bannedWords}
                    onChange={(e) =>
                      updateSettings(
                        "moderation",
                        "bannedWords",
                        e.target.value,
                      )
                    }
                    placeholder="Enter words separated by commas"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Messages containing these words will be flagged or blocked
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how notifications are sent to users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.enableEmailNotifications}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "notifications",
                        "enableEmailNotifications",
                        checked,
                      )
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send browser/mobile push notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.enablePushNotifications}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "notifications",
                        "enablePushNotifications",
                        checked,
                      )
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow User Preferences</Label>
                    <p className="text-sm text-muted-foreground">
                      Let users customize their notification preferences
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.allowUserPreferences}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "notifications",
                        "allowUserPreferences",
                        checked,
                      )
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Email Digest Frequency</Label>
                  <Select
                    value={settings.notifications.digestFrequency}
                    onValueChange={(value) =>
                      updateSettings(
                        "notifications",
                        "digestFrequency",
                        value as "instant" | "daily" | "weekly" | "never",
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">
                        Instant (every notification)
                      </SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Digest</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
