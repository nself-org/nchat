"use client";

/**
 * Workspace Settings Form Component
 *
 * Form for managing workspace settings including:
 * - General settings (name, description, branding)
 * - Access settings (verification, 2FA, invites)
 * - Message retention
 * - Storage quotas
 * - Ownership transfer
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Settings,
  Shield,
  HardDrive,
  Clock,
  Users,
  AlertTriangle,
  Save,
  Upload,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  useWorkspace,
  useWorkspaceMutations,
  useWorkspaceSettings,
  useOwnershipTransfer,
  useWorkspaceMembers,
  type Workspace,
} from "@/hooks/use-workspace";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const GeneralSettingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().optional().or(z.literal("")),
  bannerUrl: z.string().url().optional().or(z.literal("")),
});

const AccessSettingsSchema = z.object({
  verificationLevel: z.enum(["none", "email", "phone"]),
  defaultNotifications: z.enum(["all", "mentions", "none"]),
  explicitContentFilter: z.enum([
    "disabled",
    "members_without_roles",
    "all_members",
  ]),
  require2FA: z.boolean(),
  discoverable: z.boolean(),
  allowInvites: z.boolean(),
});

const RetentionSettingsSchema = z.object({
  enabled: z.boolean(),
  retentionDays: z.number().int().min(1).max(3650),
  excludePinnedMessages: z.boolean(),
});

const StorageSettingsSchema = z.object({
  quotaEnforced: z.boolean(),
  warningThreshold: z.number().min(0).max(1),
});

type GeneralSettingsValues = z.infer<typeof GeneralSettingsSchema>;
type AccessSettingsValues = z.infer<typeof AccessSettingsSchema>;
type RetentionSettingsValues = z.infer<typeof RetentionSettingsSchema>;
type StorageSettingsValues = z.infer<typeof StorageSettingsSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WorkspaceSettingsFormProps {
  workspaceId: string;
  currentUserId: string;
  currentUserRole: string;
  className?: string;
}

// ============================================================================
// GENERAL SETTINGS TAB
// ============================================================================

interface GeneralSettingsTabProps {
  workspace: Workspace;
  onSave: (data: GeneralSettingsValues) => Promise<void>;
  isSaving: boolean;
}

function GeneralSettingsTab({
  workspace,
  onSave,
  isSaving,
}: GeneralSettingsTabProps) {
  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(GeneralSettingsSchema),
    defaultValues: {
      name: workspace.name,
      description: workspace.description || "",
      iconUrl: workspace.iconUrl || "",
      bannerUrl: workspace.bannerUrl || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace Name</FormLabel>
              <FormControl>
                <Input placeholder="My Workspace" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What is this workspace for?"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief description of your workspace.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="iconUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon URL</FormLabel>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {field.value ? (
                    <AvatarImage src={field.value} alt="Workspace icon" />
                  ) : null}
                  <AvatarFallback>
                    {workspace.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <FormControl>
                  <Input
                    placeholder="https://example.com/icon.png"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bannerUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banner URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/banner.png"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}

// ============================================================================
// ACCESS SETTINGS TAB
// ============================================================================

interface AccessSettingsTabProps {
  workspace: Workspace;
  onSave: (data: AccessSettingsValues) => Promise<void>;
  isSaving: boolean;
}

function AccessSettingsTab({
  workspace,
  onSave,
  isSaving,
}: AccessSettingsTabProps) {
  const form = useForm<AccessSettingsValues>({
    resolver: zodResolver(AccessSettingsSchema),
    defaultValues: {
      verificationLevel: workspace.settings?.verificationLevel || "none",
      defaultNotifications: workspace.settings?.defaultNotifications || "all",
      explicitContentFilter:
        workspace.settings?.explicitContentFilter || "disabled",
      require2FA: workspace.settings?.require2FA || false,
      discoverable: workspace.settings?.discoverable || false,
      allowInvites: workspace.settings?.allowInvites ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <FormField
          control={form.control}
          name="verificationLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="email">Email Verified</SelectItem>
                  <SelectItem value="phone">Phone Verified</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Minimum verification required to join.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="require2FA"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Require 2FA</FormLabel>
                <FormDescription>
                  Members must have two-factor authentication enabled.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allowInvites"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Allow Invites</FormLabel>
                <FormDescription>
                  Allow members to create invite links.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="discoverable"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Discoverable</FormLabel>
                <FormDescription>
                  Show workspace in public directory.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="explicitContentFilter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content Filter</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="members_without_roles">
                    Members without roles
                  </SelectItem>
                  <SelectItem value="all_members">All members</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Filter explicit content in media.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}

// ============================================================================
// OWNERSHIP TAB
// ============================================================================

interface OwnershipTabProps {
  workspaceId: string;
  isOwner: boolean;
}

function OwnershipTab({ workspaceId, isOwner }: OwnershipTabProps) {
  const { members } = useWorkspaceMembers(workspaceId);
  const { initiateTransfer, isTransferring } =
    useOwnershipTransfer(workspaceId);
  const [selectedMember, setSelectedMember] = React.useState<string | null>(
    null,
  );

  const eligibleMembers = members.filter(
    (m) => m.role !== "owner" && ["admin", "moderator"].includes(m.role),
  );

  const handleTransfer = async () => {
    if (!selectedMember) return;
    await initiateTransfer(selectedMember, undefined, false);
  };

  if (!isOwner) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Only the workspace owner can manage ownership.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-destructive/50 p-4">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-medium text-destructive">Transfer Ownership</h4>
            <p className="text-sm text-muted-foreground">
              Transferring ownership will make another member the owner of this
              workspace. You will become an admin.
            </p>

            <div className="pt-4 space-y-4">
              <Select
                value={selectedMember || ""}
                onValueChange={setSelectedMember}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.user?.displayName || member.user?.username} (
                      {member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={!selectedMember || isTransferring}
                  >
                    Transfer Ownership
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. You will transfer full
                      ownership of this workspace to the selected member.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleTransfer}>
                      Transfer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DANGER ZONE TAB
// ============================================================================

interface DangerZoneTabProps {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
}

function DangerZoneTab({
  workspaceId,
  workspaceName,
  isOwner,
}: DangerZoneTabProps) {
  const { deleteWorkspace, isDeleting } = useWorkspaceMutations();
  const [confirmName, setConfirmName] = React.useState("");

  const handleDelete = async () => {
    if (confirmName === workspaceName) {
      await deleteWorkspace(workspaceId);
    }
  };

  if (!isOwner) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Only the workspace owner can delete the workspace.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-destructive p-4">
        <div className="flex items-start gap-4">
          <Trash2 className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <h4 className="font-medium text-destructive">Delete Workspace</h4>
            <p className="text-sm text-muted-foreground">
              Once you delete a workspace, there is no going back. Please be
              certain. All channels, messages, and files will be permanently
              deleted.
            </p>

            <div className="pt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Type <span className="font-bold">{workspaceName}</span> to
                  confirm
                </label>
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder="Workspace name"
                />
              </div>

              <Button
                variant="destructive"
                disabled={confirmName !== workspaceName || isDeleting}
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete Workspace"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkspaceSettingsForm({
  workspaceId,
  currentUserId,
  currentUserRole,
  className,
}: WorkspaceSettingsFormProps) {
  const { toast } = useToast();
  const { workspace, loading, error } = useWorkspace(workspaceId);
  const { updateWorkspace, isUpdating } = useWorkspaceMutations();
  const {
    updateMessageRetention,
    updateStorageQuota,
    isLoading: isSettingsLoading,
  } = useWorkspaceSettings(workspaceId);

  const isOwner = currentUserRole === "owner";
  const isAdmin = ["owner", "admin"].includes(currentUserRole);

  const handleGeneralSave = async (data: GeneralSettingsValues) => {
    await updateWorkspace(workspaceId, {
      name: data.name,
      description: data.description || null,
      iconUrl: data.iconUrl || null,
      bannerUrl: data.bannerUrl || null,
    });
  };

  const handleAccessSave = async (data: AccessSettingsValues) => {
    await updateWorkspace(workspaceId, {
      settings: data,
    });
  };

  const handleRetentionSave = async (data: RetentionSettingsValues) => {
    await updateMessageRetention(data);
  };

  const handleStorageSave = async (data: StorageSettingsValues) => {
    await updateStorageQuota(data);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading settings...
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load workspace settings.
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="access">
            <Shield className="mr-2 h-4 w-4" />
            Access
          </TabsTrigger>
          <TabsTrigger value="storage">
            <HardDrive className="mr-2 h-4 w-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="ownership">
            <Users className="mr-2 h-4 w-4" />
            Ownership
          </TabsTrigger>
          <TabsTrigger value="danger">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Danger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic workspace information and branding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettingsTab
                workspace={workspace}
                onSave={handleGeneralSave}
                isSaving={isUpdating}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Settings</CardTitle>
              <CardDescription>
                Control who can join and access this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccessSettingsTab
                workspace={workspace}
                onSave={handleAccessSave}
                isSaving={isUpdating}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Storage & Retention</CardTitle>
              <CardDescription>
                Manage file storage and message retention policies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Storage and retention settings can be configured by workspace
                admins.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ownership" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ownership</CardTitle>
              <CardDescription>
                Transfer workspace ownership to another member.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OwnershipTab workspaceId={workspaceId} isOwner={isOwner} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DangerZoneTab
                workspaceId={workspaceId}
                workspaceName={workspace.name}
                isOwner={isOwner}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WorkspaceSettingsForm;
