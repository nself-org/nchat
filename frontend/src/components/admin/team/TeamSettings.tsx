"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Building2,
  Globe,
  Image,
  Save,
  Check,
  Loader2,
  AlertCircle,
  Settings,
  Shield,
  Bell,
  Sliders,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { useTeamStore } from "@/stores/team-store";
import { teamManager } from "@/lib/team/team-manager";
import type { TeamSettings as TeamSettingsType } from "@/lib/team/team-types";

// Form schema
const teamSettingsSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  description: z.string().max(500).optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  timezone: z.string(),
  language: z.string(),
  defaultRole: z.enum(["owner", "admin", "member"]),
});

type TeamSettingsForm = z.infer<typeof teamSettingsSchema>;

interface TeamSettingsProps {
  teamId: string;
}

export function TeamSettings({ teamId }: TeamSettingsProps) {
  const { team, settings, setTeam, setSettings } = useTeamStore();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TeamSettingsForm>({
    resolver: zodResolver(teamSettingsSchema),
    defaultValues: {
      name: team?.name || "",
      slug: team?.slug || "",
      description: team?.description || "",
      website: team?.website || "",
      timezone: "America/New_York",
      language: "en",
      defaultRole: "member",
    },
  });

  // Load team data
  useEffect(() => {
    const loadTeam = async () => {
      try {
        const teamData = await teamManager.getTeam(teamId);
        setTeam(teamData);

        // Update form with loaded data
        form.reset({
          name: teamData.name,
          slug: teamData.slug,
          description: teamData.description || "",
          website: teamData.website || "",
          timezone: teamData.timezone || "America/New_York",
          language: teamData.language || "en",
          defaultRole: teamData.defaultRole,
        });
      } catch (_err) {
        setError("Failed to load team settings");
      }
    };

    loadTeam();
  }, [teamId]);

  const onSubmit = async (data: TeamSettingsForm) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const result = await teamManager.updateTeamSettings(teamId, {
        name: data.name,
        slug: data.slug,
        description: data.description,
        website: data.website,
        timezone: data.timezone,
        language: data.language,
        defaultRole: data.defaultRole,
      } as Partial<TeamSettingsType>);

      if (result.success) {
        setSaveSuccess(true);
        if (result.data) {
          setTeam(result.data);
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to save settings");
      }
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue("name", name);

    // Only auto-generate if slug hasn't been manually edited
    if (!form.formState.dirtyFields.slug) {
      const slug = teamManager.generateSlug(name);
      form.setValue("slug", slug);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Settings</h1>
          <p className="text-muted-foreground">
            Manage your workspace settings and preferences
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <Check className="h-4 w-4" />
          <AlertDescription>Settings saved successfully</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Team Information
                </CardTitle>
                <CardDescription>
                  Basic information about your workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    onChange={handleNameChange}
                    placeholder="Acme Inc."
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Team URL Slug *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      workspace.com/
                    </span>
                    <Input
                      id="slug"
                      {...form.register("slug")}
                      placeholder="acme-inc"
                    />
                  </div>
                  {form.formState.errors.slug && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.slug.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Only lowercase letters, numbers, and hyphens
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="A brief description of your team..."
                    rows={3}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      type="url"
                      {...form.register("website")}
                      placeholder="https://example.com"
                    />
                  </div>
                  {form.formState.errors.website && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.website.message}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={form.watch("timezone")}
                      onValueChange={(value) =>
                        form.setValue("timezone", value)
                      }
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">
                          Eastern Time (ET)
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time (CT)
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time (MT)
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time (PT)
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          London (GMT)
                        </SelectItem>
                        <SelectItem value="Europe/Paris">
                          Paris (CET)
                        </SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                        <SelectItem value="Australia/Sydney">
                          Sydney (AEDT)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={form.watch("language")}
                      onValueChange={(value) =>
                        form.setValue("language", value)
                      }
                    >
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="defaultRole">
                    Default Role for New Members
                  </Label>
                  <Select
                    value={form.watch("defaultRole")}
                    onValueChange={(value) =>
                      form.setValue("defaultRole", value as any)
                    }
                  >
                    <SelectTrigger id="defaultRole">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Role automatically assigned to new team members
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Toggles</CardTitle>
                <CardDescription>
                  Enable or disable features for your team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FeatureToggle
                  id="publicChannels"
                  label="Public Channels"
                  description="Allow creation of public channels visible to all members"
                />
                <FeatureToggle
                  id="privateChannels"
                  label="Private Channels"
                  description="Allow creation of private, invite-only channels"
                />
                <FeatureToggle
                  id="directMessages"
                  label="Direct Messages"
                  description="Enable one-on-one private conversations"
                />
                <FeatureToggle
                  id="threads"
                  label="Threads"
                  description="Allow threaded conversations within messages"
                />
                <FeatureToggle
                  id="reactions"
                  label="Message Reactions"
                  description="Enable emoji reactions on messages"
                />
                <FeatureToggle
                  id="fileSharing"
                  label="File Sharing"
                  description="Allow users to upload and share files"
                />
                <FeatureToggle
                  id="voiceCalls"
                  label="Voice Calls"
                  description="Enable voice calling between users"
                />
                <FeatureToggle
                  id="videoCalls"
                  label="Video Calls"
                  description="Enable video conferencing features"
                />
                <FeatureToggle
                  id="screenSharing"
                  label="Screen Sharing"
                  description="Allow screen sharing during calls"
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Features
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require all team members to use 2FA
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enforce Strong Passwords</Label>
                    <p className="text-sm text-muted-foreground">
                      Require passwords with uppercase, numbers, and symbols
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must verify their email before joining
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    defaultValue="480"
                    min="15"
                    max="10080"
                  />
                  <p className="text-xs text-muted-foreground">
                    Users will be logged out after this period of inactivity
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Security Settings
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure default notification settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for important events
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mention Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when users are mentioned
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Channel Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify about new messages in channels
                    </p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Email Digest Frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Notification Settings
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
}

// Feature Toggle Component
function FeatureToggle({
  id,
  label,
  description,
  defaultChecked = true,
}: {
  id: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} defaultChecked={defaultChecked} />
    </div>
  );
}

export default TeamSettings;
