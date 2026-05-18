"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SettingsLayout,
  SettingsSection,
  SettingsRow,
  AvatarUpload,
  LanguageSelector,
  TimezoneSelector,
} from "@/components/settings";
import { User } from "lucide-react";

import { logger } from "@/lib/logger";

interface ProfileFormData {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  timezone: string;
  language: string;
}

export default function ProfileSettingsPage() {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: "",
    username: "",
    email: "",
    bio: "",
    timezone: "America/New_York",
    language: "en",
  });

  // Load user data when available
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        username: user.username || "",
        email: user.email || "",
        bio: "",
        timezone: "America/New_York",
        language: "en",
      });
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile({
        displayName: formData.displayName,
        username: formData.username,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      logger.error("Failed to update profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    // In a real implementation, you would upload to storage and update the user's avatarUrl
  };

  const handleAvatarRemove = async () => {};

  if (!user) {
    return (
      <SettingsLayout>
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal information and preferences
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <SettingsSection
            title="Profile Photo"
            description="Upload a photo to personalize your account"
          >
            <AvatarUpload
              currentAvatarUrl={user.avatarUrl}
              fallback={user.displayName || user.username || "?"}
              onUpload={handleAvatarUpload}
              onRemove={handleAvatarRemove}
              size="lg"
            />
          </SettingsSection>

          {/* Basic Info Section */}
          <SettingsSection
            title="Basic Information"
            description="This information will be visible to other users"
          >
            <SettingsRow
              label="Display Name"
              description="Your name as it appears to others"
              htmlFor="displayName"
              vertical
            >
              <Input
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Enter your display name"
                disabled={loading}
                maxLength={50}
              />
            </SettingsRow>

            <SettingsRow
              label="Username"
              description="Your unique identifier. Can only contain letters, numbers, and underscores."
              htmlFor="username"
              vertical
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">@</span>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="username"
                  disabled={loading}
                  pattern="^[a-zA-Z0-9_]+$"
                  maxLength={30}
                  className="flex-1"
                />
              </div>
            </SettingsRow>

            <SettingsRow
              label="Email"
              description="Your email address (managed in Account settings)"
              htmlFor="email"
              vertical
            >
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </SettingsRow>

            <SettingsRow
              label="Bio"
              description="A short description about yourself (max 160 characters)"
              htmlFor="bio"
              vertical
            >
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell others about yourself..."
                disabled={loading}
                maxLength={160}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.bio.length}/160 characters
              </p>
            </SettingsRow>
          </SettingsSection>

          {/* Role Section (Read Only) */}
          {user.role && (
            <SettingsSection
              title="Role"
              description="Your role determines your permissions in the workspace"
            >
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getRoleDescription(user.role)}
                  </p>
                </div>
                <div className="bg-primary/10 rounded-full px-3 py-1 text-sm font-medium text-primary">
                  {user.role}
                </div>
              </div>
            </SettingsSection>
          )}

          {/* Regional Settings Section */}
          <SettingsSection
            title="Regional Settings"
            description="Configure your timezone and language preferences"
          >
            <SettingsRow
              label="Timezone"
              description="Used for displaying times and scheduling"
              htmlFor="timezone"
              vertical
            >
              <TimezoneSelector
                value={formData.timezone}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, timezone: value }))
                }
                disabled={loading}
              />
            </SettingsRow>

            <SettingsRow
              label="Language"
              description="The language used throughout the application"
              htmlFor="language"
              vertical
            >
              <LanguageSelector
                value={formData.language}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, language: value }))
                }
                disabled={loading}
              />
            </SettingsRow>
          </SettingsSection>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            {saved && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Changes saved successfully!
              </p>
            )}
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}

function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    owner: "Full access to all settings and user management",
    admin: "Can manage users and channels, moderate content",
    moderator: "Can moderate content and manage channels",
    member: "Standard member with full chat access",
    guest: "Limited access to specific channels",
  };
  return descriptions[role] || "Standard member";
}
