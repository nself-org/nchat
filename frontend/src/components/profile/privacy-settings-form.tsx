"use client";

/**
 * Privacy Settings Form Component
 *
 * Form for managing user privacy settings with visibility controls.
 *
 * @module components/profile/privacy-settings-form
 * @version 1.0.0
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import type {
  ProfilePrivacySettings,
  PrivacyVisibility,
} from "@/types/profile";

// ============================================================================
// Types
// ============================================================================

export interface PrivacySettingsFormProps {
  /** Current privacy settings */
  settings: ProfilePrivacySettings;
  /** Called when settings change */
  onChange: (settings: Partial<ProfilePrivacySettings>) => void;
  /** Called when form is submitted */
  onSubmit: () => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VISIBILITY_OPTIONS: {
  value: PrivacyVisibility;
  label: string;
  description: string;
}[] = [
  { value: "everyone", label: "Everyone", description: "Visible to all users" },
  {
    value: "contacts",
    label: "Contacts Only",
    description: "Only people you message with",
  },
  { value: "nobody", label: "Nobody", description: "Hidden from everyone" },
];

// ============================================================================
// Component
// ============================================================================

export function PrivacySettingsForm({
  settings,
  onChange,
  onSubmit,
  isLoading = false,
  className,
}: PrivacySettingsFormProps) {
  const [hasChanges, setHasChanges] = React.useState(false);

  const handleVisibilityChange = (
    field: keyof ProfilePrivacySettings,
    value: PrivacyVisibility,
  ) => {
    onChange({ [field]: value });
    setHasChanges(true);
  };

  const handleBooleanChange = (
    field: keyof ProfilePrivacySettings,
    value: boolean,
  ) => {
    onChange({ [field]: value });
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit();
    setHasChanges(false);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Online Status & Presence */}
      <Card>
        <CardHeader>
          <CardTitle>Online Status & Presence</CardTitle>
          <CardDescription>
            Control who can see when you're online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Online Status</Label>
              <p className="text-sm text-muted-foreground">
                Who can see if you're online
              </p>
            </div>
            <Select
              value={settings.onlineStatus}
              onValueChange={(v) =>
                handleVisibilityChange("onlineStatus", v as PrivacyVisibility)
              }
            >
              <SelectTrigger
                className="w-40"
                data-testid="online-status-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Last Seen</Label>
              <p className="text-sm text-muted-foreground">
                Who can see when you were last online
              </p>
            </div>
            <Select
              value={settings.lastSeen}
              onValueChange={(v) =>
                handleVisibilityChange("lastSeen", v as PrivacyVisibility)
              }
            >
              <SelectTrigger className="w-40" data-testid="last-seen-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Typing Indicator</Label>
              <p className="text-sm text-muted-foreground">
                Show when you're typing a message
              </p>
            </div>
            <Switch
              checked={settings.typingIndicator}
              onCheckedChange={(v) => handleBooleanChange("typingIndicator", v)}
              data-testid="typing-indicator-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Visibility</CardTitle>
          <CardDescription>
            Control who can see your profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Profile Photo</Label>
              <p className="text-sm text-muted-foreground">
                Who can see your profile photo
              </p>
            </div>
            <Select
              value={settings.profilePhoto}
              onValueChange={(v) =>
                handleVisibilityChange("profilePhoto", v as PrivacyVisibility)
              }
            >
              <SelectTrigger
                className="w-40"
                data-testid="profile-photo-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Bio</Label>
              <p className="text-sm text-muted-foreground">
                Who can see your bio/about
              </p>
            </div>
            <Select
              value={settings.bio}
              onValueChange={(v) =>
                handleVisibilityChange("bio", v as PrivacyVisibility)
              }
            >
              <SelectTrigger className="w-40" data-testid="bio-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Phone Number</Label>
              <p className="text-sm text-muted-foreground">
                Who can see your phone number
              </p>
            </div>
            <Select
              value={settings.phone}
              onValueChange={(v) =>
                handleVisibilityChange("phone", v as PrivacyVisibility)
              }
            >
              <SelectTrigger className="w-40" data-testid="phone-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Email</Label>
              <p className="text-sm text-muted-foreground">
                Display email on your public profile
              </p>
            </div>
            <Switch
              checked={settings.showEmail}
              onCheckedChange={(v) => handleBooleanChange("showEmail", v)}
              data-testid="show-email-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Messaging & Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Messaging & Calls</CardTitle>
          <CardDescription>Control who can contact you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Add to Groups</Label>
              <p className="text-sm text-muted-foreground">
                Who can add you to groups
              </p>
            </div>
            <Select
              value={settings.addToGroups}
              onValueChange={(v) =>
                handleVisibilityChange("addToGroups", v as PrivacyVisibility)
              }
            >
              <SelectTrigger
                className="w-40"
                data-testid="add-to-groups-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Calls</Label>
              <p className="text-sm text-muted-foreground">Who can call you</p>
            </div>
            <Select
              value={settings.calls}
              onValueChange={(v) =>
                handleVisibilityChange("calls", v as PrivacyVisibility)
              }
            >
              <SelectTrigger className="w-40" data-testid="calls-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Read Receipts</Label>
              <p className="text-sm text-muted-foreground">
                Send read receipts when you view messages
              </p>
            </div>
            <Switch
              checked={settings.readReceipts}
              onCheckedChange={(v) => handleBooleanChange("readReceipts", v)}
              data-testid="read-receipts-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile Discovery */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Discovery</CardTitle>
          <CardDescription>Control how people can find you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Searchable by Username</Label>
              <p className="text-sm text-muted-foreground">
                Allow people to find you by username
              </p>
            </div>
            <Switch
              checked={settings.searchableByUsername}
              onCheckedChange={(v) =>
                handleBooleanChange("searchableByUsername", v)
              }
              data-testid="searchable-username-switch"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Searchable by Email</Label>
              <p className="text-sm text-muted-foreground">
                Allow people to find you by email address
              </p>
            </div>
            <Switch
              checked={settings.searchableByEmail}
              onCheckedChange={(v) =>
                handleBooleanChange("searchableByEmail", v)
              }
              data-testid="searchable-email-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading || !hasChanges}
          data-testid="save-privacy-button"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

export default PrivacySettingsForm;
