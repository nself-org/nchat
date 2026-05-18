"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Pause,
  Play,
  Trash2,
  Shield,
  Bell,
  Hash,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
import { AppIcon } from "./AppCard";
import { AppPermissions } from "./AppPermissions";
import { useAppDirectoryStore } from "@/stores/app-directory-store";
import type {
  App,
  AppInstallation,
  AppSettingDefinition,
} from "@/lib/app-directory/app-types";

interface AppSettingsProps {
  app: App;
  installation: AppInstallation;
  className?: string;
}

export function AppSettings({
  app,
  installation,
  className,
}: AppSettingsProps) {
  const { uninstallApp, updateInstallation, isInstalling } =
    useAppDirectoryStore();
  const [settings, setSettings] = useState<Record<string, unknown>>(
    installation.settings,
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSettingChange = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 500));
    updateInstallation(app.id, { settings });
    setHasChanges(false);
    setIsSaving(false);
  };

  const handleReset = () => {
    setSettings(installation.settings);
    setHasChanges(false);
  };

  const handleUninstall = async () => {
    await uninstallApp(app.id);
    window.location.href = "/apps/installed";
  };

  const handlePauseToggle = async () => {
    const newStatus = installation.status === "paused" ? "active" : "paused";
    updateInstallation(app.id, { status: newStatus });
  };

  // Sample settings definitions (in real app, these would come from the app manifest)
  const settingDefinitions: AppSettingDefinition[] = [
    {
      key: "notifications_enabled",
      label: "Enable Notifications",
      description: "Receive notifications from this app",
      type: "boolean",
      defaultValue: true,
      required: false,
    },
    {
      key: "default_channel",
      label: "Default Channel",
      description: "Channel where app messages will be posted",
      type: "channel",
      defaultValue: "",
      required: false,
    },
    {
      key: "webhook_url",
      label: "Webhook URL",
      description: "URL to send webhook events to",
      type: "text",
      defaultValue: "",
      required: false,
      validation: {
        pattern: "^https?://",
        message: "Must be a valid URL starting with http:// or https://",
      },
    },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Back Link */}
      <Link
        href="/apps/installed"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Installed Apps
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <AppIcon icon={app.icon} name={app.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold">{app.name} Settings</h1>
            <p className="text-muted-foreground">
              Version {installation.installedVersion} by {app.developer.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="space-y-6 lg:col-span-2">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure how this app works in your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingDefinitions.map((definition) => (
                <SettingField
                  key={definition.key}
                  definition={definition}
                  value={settings[definition.key]}
                  onChange={(value) =>
                    handleSettingChange(definition.key, value)
                  }
                />
              ))}
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <div>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>
                    Permissions granted to this app
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AppPermissions permissions={app.permissions} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>App Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Status</span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    installation.status === "active" && "text-green-600",
                    installation.status === "paused" && "text-yellow-600",
                  )}
                >
                  {installation.status === "active" ? "Active" : "Paused"}
                </span>
              </div>
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePauseToggle}
              >
                {installation.status === "paused" ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Resume App
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause App
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {installation.status === "paused"
                  ? "App is paused and will not run until resumed."
                  : "Pausing the app will stop it from running while keeping your settings."}
              </p>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Uninstall App
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Uninstall {app.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the app and all its settings from your
                      workspace. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleUninstall}
                      className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                    >
                      {isInstalling === app.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Uninstall
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface SettingFieldProps {
  definition: AppSettingDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

function SettingField({ definition, value, onChange }: SettingFieldProps) {
  const currentValue = value ?? definition.defaultValue;

  switch (definition.type) {
    case "boolean":
      return (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{definition.label}</Label>
            {definition.description && (
              <p className="text-sm text-muted-foreground">
                {definition.description}
              </p>
            )}
          </div>
          <Switch
            checked={currentValue as boolean}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      );

    case "text":
      return (
        <div className="space-y-2">
          <Label>{definition.label}</Label>
          {definition.description && (
            <p className="text-sm text-muted-foreground">
              {definition.description}
            </p>
          )}
          <Input
            value={(currentValue as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${definition.label.toLowerCase()}`}
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-2">
          <Label>{definition.label}</Label>
          {definition.description && (
            <p className="text-sm text-muted-foreground">
              {definition.description}
            </p>
          )}
          <Input
            type="number"
            value={(currentValue as number) || 0}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={definition.validation?.min}
            max={definition.validation?.max}
          />
        </div>
      );

    case "select":
      return (
        <div className="space-y-2">
          <Label>{definition.label}</Label>
          {definition.description && (
            <p className="text-sm text-muted-foreground">
              {definition.description}
            </p>
          )}
          <Select
            value={(currentValue as string) || ""}
            onValueChange={(val) => onChange(val)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={`Select ${definition.label.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {definition.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "channel":
      return (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            {definition.label}
          </Label>
          {definition.description && (
            <p className="text-sm text-muted-foreground">
              {definition.description}
            </p>
          )}
          <Select
            value={(currentValue as string) || ""}
            onValueChange={(val) => onChange(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">#general</SelectItem>
              <SelectItem value="random">#random</SelectItem>
              <SelectItem value="announcements">#announcements</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    default:
      return null;
  }
}
