/**
 * MentionSettings Component
 *
 * Settings panel for configuring mention preferences.
 */

"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  MentionPreferences,
  ChannelMentionSettings,
} from "@/lib/mentions/mention-types";
import {
  DEFAULT_MENTION_PREFERENCES,
  DEFAULT_CHANNEL_MENTION_SETTINGS,
} from "@/lib/mentions/mention-types";

// ============================================================================
// Types
// ============================================================================

export interface MentionSettingsProps {
  /** Current preferences */
  preferences: MentionPreferences;
  /** Callback when preferences change */
  onPreferencesChange: (preferences: MentionPreferences) => void;
  /** Whether settings are being saved */
  isSaving?: boolean;
  /** Additional CSS class */
  className?: string;
}

export interface ChannelMentionSettingsProps {
  /** Current settings */
  settings: ChannelMentionSettings;
  /** Callback when settings change */
  onSettingsChange: (settings: ChannelMentionSettings) => void;
  /** Channel name */
  channelName?: string;
  /** Whether user is admin */
  isAdmin?: boolean;
  /** Whether settings are being saved */
  isSaving?: boolean;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// User Mention Preferences
// ============================================================================

export function MentionSettings({
  preferences,
  onPreferencesChange,
  isSaving = false,
  className,
}: MentionSettingsProps) {
  const handleToggle = useCallback(
    (key: keyof MentionPreferences) => {
      onPreferencesChange({
        ...preferences,
        [key]: !preferences[key],
      });
    },
    [preferences, onPreferencesChange],
  );

  const handleSoundChange = useCallback(
    (value: "default" | "subtle" | "none") => {
      onPreferencesChange({
        ...preferences,
        mentionSound: value,
      });
    },
    [preferences, onPreferencesChange],
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Mention Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive mention notifications
        </p>
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Notifications
        </h4>

        <SettingRow
          label="Direct mentions"
          description="Notify when someone mentions you directly with @username"
          checked={preferences.notifyOnMention}
          onCheckedChange={() => handleToggle("notifyOnMention")}
          disabled={isSaving}
        />

        <SettingRow
          label="@everyone mentions"
          description="Notify when someone uses @everyone"
          checked={preferences.notifyOnEveryone}
          onCheckedChange={() => handleToggle("notifyOnEveryone")}
          disabled={isSaving}
        />

        <SettingRow
          label="@here mentions"
          description="Notify when someone uses @here (online members)"
          checked={preferences.notifyOnHere}
          onCheckedChange={() => handleToggle("notifyOnHere")}
          disabled={isSaving}
        />

        <SettingRow
          label="@channel mentions"
          description="Notify when someone uses @channel"
          checked={preferences.notifyOnChannel}
          onCheckedChange={() => handleToggle("notifyOnChannel")}
          disabled={isSaving}
        />
      </div>

      {/* Display Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Display
        </h4>

        <SettingRow
          label="Highlight mentions"
          description="Highlight messages that mention you"
          checked={preferences.highlightMentions}
          onCheckedChange={() => handleToggle("highlightMentions")}
          disabled={isSaving}
        />

        <SettingRow
          label="Show mention badge"
          description="Show unread mention count in sidebar"
          checked={preferences.showMentionBadge}
          onCheckedChange={() => handleToggle("showMentionBadge")}
          disabled={isSaving}
        />
      </div>

      {/* Sound Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Sound
        </h4>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="mention-sound">Mention sound</Label>
            <p className="text-xs text-muted-foreground">
              Sound to play when you receive a mention
            </p>
          </div>
          <Select
            value={preferences.mentionSound}
            onValueChange={handleSoundChange}
            disabled={isSaving}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="subtle">Subtle</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reset Button */}
      <div className="border-t pt-4">
        <Button
          variant="outline"
          onClick={() => onPreferencesChange(DEFAULT_MENTION_PREFERENCES)}
          disabled={isSaving}
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Channel Mention Settings (Admin)
// ============================================================================

export function ChannelMentionSettingsPanel({
  settings,
  onSettingsChange,
  channelName,
  isAdmin = false,
  isSaving = false,
  className,
}: ChannelMentionSettingsProps) {
  const handleToggle = useCallback(
    (key: keyof ChannelMentionSettings) => {
      if (typeof settings[key] === "boolean") {
        onSettingsChange({
          ...settings,
          [key]: !settings[key],
        });
      }
    },
    [settings, onSettingsChange],
  );

  const handleRoleChange = useCallback(
    (
      key: "everyoneMinRole" | "hereMinRole" | "channelMinRole",
      value: string,
    ) => {
      onSettingsChange({
        ...settings,
        [key]: value as "owner" | "admin" | "moderator" | "member",
      });
    },
    [settings, onSettingsChange],
  );

  if (!isAdmin) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        <p>Only admins can modify channel mention settings.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">
          Mention Settings{channelName && ` for #${channelName}`}
        </h3>
        <p className="text-sm text-muted-foreground">
          Control who can use group mentions in this channel
        </p>
      </div>

      {/* @everyone Settings */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">@everyone</Label>
            <p className="text-xs text-muted-foreground">
              Notifies all workspace members
            </p>
          </div>
          <Switch
            checked={settings.allowEveryone}
            onCheckedChange={() => handleToggle("allowEveryone")}
            disabled={isSaving}
          />
        </div>

        {settings.allowEveryone && (
          <div className="flex items-center justify-between border-t pt-2">
            <Label className="text-sm">Minimum role required</Label>
            <Select
              value={settings.everyoneMinRole}
              onValueChange={(v) => handleRoleChange("everyoneMinRole", v)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* @here Settings */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">@here</Label>
            <p className="text-xs text-muted-foreground">
              Notifies online members only
            </p>
          </div>
          <Switch
            checked={settings.allowHere}
            onCheckedChange={() => handleToggle("allowHere")}
            disabled={isSaving}
          />
        </div>

        {settings.allowHere && (
          <div className="flex items-center justify-between border-t pt-2">
            <Label className="text-sm">Minimum role required</Label>
            <Select
              value={settings.hereMinRole}
              onValueChange={(v) => handleRoleChange("hereMinRole", v)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* @channel Settings */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">@channel</Label>
            <p className="text-xs text-muted-foreground">
              Notifies all channel members
            </p>
          </div>
          <Switch
            checked={settings.allowChannel}
            onCheckedChange={() => handleToggle("allowChannel")}
            disabled={isSaving}
          />
        </div>

        {settings.allowChannel && (
          <div className="flex items-center justify-between border-t pt-2">
            <Label className="text-sm">Minimum role required</Label>
            <Select
              value={settings.channelMinRole}
              onValueChange={(v) => handleRoleChange("channelMinRole", v)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div className="border-t pt-4">
        <Button
          variant="outline"
          onClick={() => onSettingsChange(DEFAULT_CHANNEL_MENTION_SETTINGS)}
          disabled={isSaving}
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Setting Row Component
// ============================================================================

interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
  disabled?: boolean;
}

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SettingRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export default MentionSettings;
