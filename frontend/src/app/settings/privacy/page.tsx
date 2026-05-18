"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  SettingsLayout,
  SettingsSection,
  SettingsRow,
  SimpleNotificationToggle,
} from "@/components/settings";
import { Shield, Eye, Check, Edit3, Users, Lock, Globe } from "lucide-react";

import { logger } from "@/lib/logger";

interface PrivacySettings {
  // Who can DM
  dmPermission: "everyone" | "members" | "none";

  // Online status
  showOnlineStatus: boolean;
  showLastSeen: boolean;

  // Message features
  readReceipts: boolean;
  typingIndicators: boolean;

  // Profile visibility
  profileVisibility: "public" | "members" | "private";
  showEmail: boolean;
  showBio: boolean;

  // Activity
  showActivity: boolean;
}

const defaultSettings: PrivacySettings = {
  dmPermission: "everyone",
  showOnlineStatus: true,
  showLastSeen: true,
  readReceipts: true,
  typingIndicators: true,
  profileVisibility: "members",
  showEmail: false,
  showBio: true,
  showActivity: true,
};

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateSetting = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      logger.error("Failed to save privacy settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Privacy</h1>
            <p className="text-sm text-muted-foreground">
              Control who can see your activity and contact you
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Direct Messages */}
          <SettingsSection
            title="Direct Messages"
            description="Control who can send you direct messages"
          >
            <div className="space-y-4">
              <SettingsRow
                label="Who can send you direct messages"
                description="Choose who is allowed to start a conversation with you"
                htmlFor="dm-permission"
                vertical
              >
                <RadioGroup
                  value={settings.dmPermission}
                  onValueChange={(value) =>
                    updateSetting(
                      "dmPermission",
                      value as PrivacySettings["dmPermission"],
                    )
                  }
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 rounded-lg border p-4">
                    <RadioGroupItem value="everyone" id="dm-everyone" />
                    <div className="flex-1">
                      <Label
                        htmlFor="dm-everyone"
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Everyone</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Anyone can send you a direct message
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border p-4">
                    <RadioGroupItem value="members" id="dm-members" />
                    <div className="flex-1">
                      <Label
                        htmlFor="dm-members"
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          Workspace members only
                        </span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Only members of your workspace can message you
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border p-4">
                    <RadioGroupItem value="none" id="dm-none" />
                    <div className="flex-1">
                      <Label
                        htmlFor="dm-none"
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">No one</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Disable direct messages entirely
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </SettingsRow>
            </div>
          </SettingsSection>

          {/* Online Status */}
          <SettingsSection
            title="Online Status"
            description="Control visibility of your online presence"
          >
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-3 pb-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Status visibility</span>
              </div>

              <SimpleNotificationToggle
                id="show-online"
                label="Show online status"
                description="Let others see when you're online"
                checked={settings.showOnlineStatus}
                onCheckedChange={(checked) =>
                  updateSetting("showOnlineStatus", checked)
                }
              />

              <SimpleNotificationToggle
                id="show-last-seen"
                label="Show last seen"
                description="Let others see when you were last active"
                checked={settings.showLastSeen}
                onCheckedChange={(checked) =>
                  updateSetting("showLastSeen", checked)
                }
                disabled={!settings.showOnlineStatus}
              />
            </div>
          </SettingsSection>

          {/* Read Receipts & Typing */}
          <SettingsSection
            title="Message Privacy"
            description="Control read receipts and typing indicators"
          >
            <div className="space-y-2 rounded-lg border p-4">
              <SimpleNotificationToggle
                id="read-receipts"
                label="Read receipts"
                description="Let others know when you've read their messages. If disabled, you also won't see when others read your messages."
                checked={settings.readReceipts}
                onCheckedChange={(checked) =>
                  updateSetting("readReceipts", checked)
                }
              />

              <SimpleNotificationToggle
                id="typing-indicators"
                label="Typing indicators"
                description="Show when you're typing a message. If disabled, you also won't see when others are typing."
                checked={settings.typingIndicators}
                onCheckedChange={(checked) =>
                  updateSetting("typingIndicators", checked)
                }
              />
            </div>

            {/* Info about reciprocal settings */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> These settings are reciprocal. If you
                disable read receipts, you won't see read receipts from others
                either.
              </p>
            </div>
          </SettingsSection>

          {/* Profile Visibility */}
          <SettingsSection
            title="Profile Visibility"
            description="Control who can see your profile information"
          >
            <SettingsRow
              label="Profile visibility"
              description="Choose who can view your full profile"
              htmlFor="profile-visibility"
              vertical
            >
              <RadioGroup
                value={settings.profileVisibility}
                onValueChange={(value) =>
                  updateSetting(
                    "profileVisibility",
                    value as PrivacySettings["profileVisibility"],
                  )
                }
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 rounded-lg border p-4">
                  <RadioGroupItem value="public" id="profile-public" />
                  <Label
                    htmlFor="profile-public"
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">Public</div>
                    <p className="text-sm text-muted-foreground">
                      Anyone can view your profile
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 rounded-lg border p-4">
                  <RadioGroupItem value="members" id="profile-members" />
                  <Label
                    htmlFor="profile-members"
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">Workspace members</div>
                    <p className="text-sm text-muted-foreground">
                      Only workspace members can view your profile
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 rounded-lg border p-4">
                  <RadioGroupItem value="private" id="profile-private" />
                  <Label
                    htmlFor="profile-private"
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">Private</div>
                    <p className="text-sm text-muted-foreground">
                      Only show basic info (name and avatar)
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </SettingsRow>

            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-sm font-medium">Profile fields visibility</p>
              <SimpleNotificationToggle
                id="show-email"
                label="Show email address"
                description="Display your email on your profile"
                checked={settings.showEmail}
                onCheckedChange={(checked) =>
                  updateSetting("showEmail", checked)
                }
              />
              <SimpleNotificationToggle
                id="show-bio"
                label="Show bio"
                description="Display your bio on your profile"
                checked={settings.showBio}
                onCheckedChange={(checked) => updateSetting("showBio", checked)}
              />
            </div>
          </SettingsSection>

          {/* Activity Status */}
          <SettingsSection
            title="Activity"
            description="Control visibility of your activity"
          >
            <div className="rounded-lg border p-4">
              <SimpleNotificationToggle
                id="show-activity"
                label="Show activity status"
                description="Let others see what channels you're active in"
                checked={settings.showActivity}
                onCheckedChange={(checked) =>
                  updateSetting("showActivity", checked)
                }
              />
            </div>
          </SettingsSection>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            {saved && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Changes saved successfully!
              </p>
            )}
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
