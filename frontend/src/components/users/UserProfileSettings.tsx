"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ProfileVisibility } from "./ProfileVisibility";
import { ProfileSections } from "./ProfileSections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ProfileSettingsData {
  visibility: {
    email: "public" | "contacts" | "private";
    phone: "public" | "contacts" | "private";
    location: "public" | "contacts" | "private";
    timezone: "public" | "contacts" | "private";
    lastSeen: "everyone" | "contacts" | "nobody";
    onlineStatus: "everyone" | "contacts" | "nobody";
  };
  sections: {
    showBio: boolean;
    showWorkInfo: boolean;
    showContactInfo: boolean;
    showSocialLinks: boolean;
    showBadges: boolean;
    showActivity: boolean;
    showSharedChannels: boolean;
    showSharedFiles: boolean;
  };
}

export interface UserProfileSettingsProps extends React.HTMLAttributes<HTMLDivElement> {
  initialSettings: ProfileSettingsData;
  onSave?: (settings: ProfileSettingsData) => Promise<void>;
  isLoading?: boolean;
}

const defaultSettings: ProfileSettingsData = {
  visibility: {
    email: "contacts",
    phone: "private",
    location: "public",
    timezone: "public",
    lastSeen: "everyone",
    onlineStatus: "everyone",
  },
  sections: {
    showBio: true,
    showWorkInfo: true,
    showContactInfo: true,
    showSocialLinks: true,
    showBadges: true,
    showActivity: true,
    showSharedChannels: true,
    showSharedFiles: true,
  },
};

// ============================================================================
// Component
// ============================================================================

const UserProfileSettings = React.forwardRef<
  HTMLDivElement,
  UserProfileSettingsProps
>(
  (
    {
      className,
      initialSettings = defaultSettings,
      onSave,
      isLoading = false,
      ...props
    },
    ref,
  ) => {
    const [settings, setSettings] =
      React.useState<ProfileSettingsData>(initialSettings);
    const [hasChanges, setHasChanges] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    const handleVisibilityChange = (
      key: keyof ProfileSettingsData["visibility"],
      value: string,
    ) => {
      setSettings((prev) => ({
        ...prev,
        visibility: {
          ...prev.visibility,
          [key]: value,
        },
      }));
      setHasChanges(true);
    };

    const handleSectionChange = (
      key: keyof ProfileSettingsData["sections"],
      value: boolean,
    ) => {
      setSettings((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          [key]: value,
        },
      }));
      setHasChanges(true);
    };

    const handleReset = () => {
      setSettings(initialSettings);
      setHasChanges(false);
    };

    const handleSave = async () => {
      if (!onSave) return;
      setIsSaving(true);
      try {
        await onSave(settings);
        setHasChanges(false);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div ref={ref} className={cn("space-y-6", className)} {...props}>
        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Control who can see your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileVisibility
              visibility={settings.visibility}
              onVisibilityChange={handleVisibilityChange}
              disabled={isLoading}
            />
          </CardContent>
        </Card>

        {/* Profile Sections */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Sections</CardTitle>
            <CardDescription>
              Choose which sections to display on your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSections
              sections={settings.sections}
              onSectionChange={handleSectionChange}
              disabled={isLoading}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    );
  },
);
UserProfileSettings.displayName = "UserProfileSettings";

export { UserProfileSettings, defaultSettings as defaultProfileSettings };
