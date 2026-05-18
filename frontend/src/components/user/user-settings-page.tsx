"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type UserProfile, useUserStore } from "@/stores/user-store";
import { useTheme } from "@/contexts/theme-context";
import { EditProfileForm } from "./edit-profile-form";
import { PresenceSelector } from "./presence-selector";
import { SetStatusModal } from "./set-status-modal";
import { UserAvatar } from "./user-avatar";
import { UserStatus } from "./user-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Shield,
  Palette,
  Bell,
  Lock,
  Accessibility,
  Smile,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserSettingsPageProps extends React.HTMLAttributes<HTMLDivElement> {
  user: UserProfile;
  onSaveProfile?: (data: unknown) => Promise<void>;
  onChangePassword?: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
}

// ============================================================================
// Settings sections
// ============================================================================

type SettingsSection =
  | "profile"
  | "account"
  | "appearance"
  | "notifications"
  | "privacy"
  | "accessibility";

const settingsSections: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    id: "profile",
    label: "Profile",
    icon: <User className="h-4 w-4" />,
    description: "Your public profile information",
  },
  {
    id: "account",
    label: "Account",
    icon: <Shield className="h-4 w-4" />,
    description: "Email, password, and security",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: <Palette className="h-4 w-4" />,
    description: "Theme and display options",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="h-4 w-4" />,
    description: "Notification preferences",
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: <Lock className="h-4 w-4" />,
    description: "Control who can see your information",
  },
  {
    id: "accessibility",
    label: "Accessibility",
    icon: <Accessibility className="h-4 w-4" />,
    description: "Accessibility options",
  },
];

// ============================================================================
// Component
// ============================================================================

const UserSettingsPage = React.forwardRef<
  HTMLDivElement,
  UserSettingsPageProps
>(({ className, user, onSaveProfile, onChangePassword, ...props }, ref) => {
  const { theme, setTheme } = useTheme();
  const currentUser = useUserStore((state) => state.currentUser);
  const setMyPresence = useUserStore((state) => state.setMyPresence);

  const [activeSection, setActiveSection] =
    React.useState<SettingsSection>("profile");
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = React.useState({
    enableDesktopNotifications: true,
    enableSoundNotifications: true,
    enableEmailNotifications: false,
    muteDMs: false,
    muteChannels: false,
    notifyOnMention: true,
    notifyOnReply: true,
    notifyOnReaction: false,
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = React.useState({
    showOnlineStatus: true,
    showReadReceipts: true,
    allowDMsFromAnyone: true,
    showProfileToGuests: false,
    showEmailToMembers: false,
  });

  // Accessibility settings state
  const [accessibilitySettings, setAccessibilitySettings] = React.useState({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReaderAnnouncements: true,
  });

  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] = React.useState({
    density: "comfortable" as "compact" | "comfortable" | "spacious",
    fontSize: "medium" as "small" | "medium" | "large",
  });

  const displayUser = currentUser ?? user;

  return (
    <div ref={ref} className={cn("flex h-full", className)} {...props}>
      {/* Sidebar navigation */}
      <div className="bg-muted/30 w-64 border-r">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Settings</h2>
        </div>
        <ScrollArea className="h-[calc(100%-4rem)]">
          <nav className="space-y-1 p-2">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  activeSection === section.id
                    ? "text-primary-foreground bg-primary"
                    : "hover:bg-muted",
                )}
              >
                {section.icon}
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <ScrollArea className="h-full">
          <div className="mx-auto max-w-2xl p-6">
            {/* Profile Section */}
            {activeSection === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold">Profile</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your public profile information
                  </p>
                </div>

                {/* Status card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Status</CardTitle>
                    <CardDescription>
                      Set your presence and custom status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <UserAvatar
                        user={displayUser}
                        size="lg"
                        presence={displayUser.presence}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{displayUser.displayName}</p>
                        <UserStatus
                          status={displayUser.customStatus}
                          variant="full"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setStatusModalOpen(true)}
                      >
                        <Smile className="mr-2 h-4 w-4" />
                        Set Status
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Presence</Label>
                      <PresenceSelector
                        value={displayUser.presence}
                        onChange={(presence) => setMyPresence(presence)}
                        variant="radio"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Profile edit form */}
                <EditProfileForm user={displayUser} onSave={onSaveProfile} />

                <SetStatusModal
                  open={statusModalOpen}
                  onOpenChange={setStatusModalOpen}
                  currentStatus={displayUser.customStatus}
                />
              </div>
            )}

            {/* Account Section */}
            {activeSection === "account" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold">Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your account settings and security
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Email Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{displayUser.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Your primary email address
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Change
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Password</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">
                          Current Password
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                    <Button>Update Password</Button>
                  </CardContent>
                </Card>

                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-base text-destructive">
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Deactivate Account</p>
                        <p className="text-sm text-muted-foreground">
                          Temporarily disable your account
                        </p>
                      </div>
                      <Button variant="outline">Deactivate</Button>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Delete Account</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all data
                        </p>
                      </div>
                      <Button variant="destructive">Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold">Appearance</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize how nchat looks on your device
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Theme</CardTitle>
                    <CardDescription>
                      Select your preferred color scheme
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: "light", label: "Light", icon: Sun },
                        { value: "dark", label: "Dark", icon: Moon },
                        { value: "system", label: "System", icon: Monitor },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() =>
                            setTheme(
                              option.value as "light" | "dark" | "system",
                            )
                          }
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                            theme === option.value
                              ? "bg-primary/5 border-primary"
                              : "hover:bg-muted/80 border-transparent bg-muted",
                          )}
                        >
                          <option.icon className="h-6 w-6" />
                          <span className="text-sm font-medium">
                            {option.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Display</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Message Density</Label>
                        <p className="text-sm text-muted-foreground">
                          Adjust the spacing between messages
                        </p>
                      </div>
                      <Select
                        value={appearanceSettings.density}
                        onValueChange={(value) =>
                          setAppearanceSettings((prev) => ({
                            ...prev,
                            density: value as typeof appearanceSettings.density,
                          }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="comfortable">
                            Comfortable
                          </SelectItem>
                          <SelectItem value="spacious">Spacious</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Font Size</Label>
                        <p className="text-sm text-muted-foreground">
                          Change the text size
                        </p>
                      </div>
                      <Select
                        value={appearanceSettings.fontSize}
                        onValueChange={(value) =>
                          setAppearanceSettings((prev) => ({
                            ...prev,
                            fontSize:
                              value as typeof appearanceSettings.fontSize,
                          }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold">Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure how you want to be notified
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Notification Channels
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: "enableDesktopNotifications",
                        label: "Desktop Notifications",
                        description: "Show notifications on your desktop",
                      },
                      {
                        key: "enableSoundNotifications",
                        label: "Sound Notifications",
                        description: "Play a sound for new messages",
                      },
                      {
                        key: "enableEmailNotifications",
                        label: "Email Notifications",
                        description: "Receive email for missed messages",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Switch
                          checked={
                            notificationSettings[
                              item.key as keyof typeof notificationSettings
                            ]
                          }
                          onCheckedChange={(checked) =>
                            setNotificationSettings((prev) => ({
                              ...prev,
                              [item.key]: checked,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notify Me When</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: "notifyOnMention",
                        label: "Someone mentions me",
                      },
                      {
                        key: "notifyOnReply",
                        label: "Someone replies to my message",
                      },
                      {
                        key: "notifyOnReaction",
                        label: "Someone reacts to my message",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between"
                      >
                        <Label>{item.label}</Label>
                        <Switch
                          checked={
                            notificationSettings[
                              item.key as keyof typeof notificationSettings
                            ]
                          }
                          onCheckedChange={(checked) =>
                            setNotificationSettings((prev) => ({
                              ...prev,
                              [item.key]: checked,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Privacy Section */}
            {activeSection === "privacy" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold">Privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    Control who can see your information
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: "showOnlineStatus",
                        label: "Show online status",
                        description: "Let others see when you are online",
                      },
                      {
                        key: "showReadReceipts",
                        label: "Show read receipts",
                        description:
                          "Let others see when you have read their messages",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Switch
                          checked={
                            privacySettings[
                              item.key as keyof typeof privacySettings
                            ]
                          }
                          onCheckedChange={(checked) =>
                            setPrivacySettings((prev) => ({
                              ...prev,
                              [item.key]: checked,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Profile Visibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: "allowDMsFromAnyone",
                        label: "Allow DMs from anyone",
                        description: "Let anyone send you direct messages",
                      },
                      {
                        key: "showProfileToGuests",
                        label: "Show profile to guests",
                        description: "Allow guests to view your profile",
                      },
                      {
                        key: "showEmailToMembers",
                        label: "Show email to members",
                        description: "Allow members to see your email address",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Switch
                          checked={
                            privacySettings[
                              item.key as keyof typeof privacySettings
                            ]
                          }
                          onCheckedChange={(checked) =>
                            setPrivacySettings((prev) => ({
                              ...prev,
                              [item.key]: checked,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Accessibility Section */}
            {activeSection === "accessibility" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold">Accessibility</h3>
                  <p className="text-sm text-muted-foreground">
                    Make nchat easier to use
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Visual Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: "reduceMotion",
                        label: "Reduce motion",
                        description: "Minimize animations and transitions",
                      },
                      {
                        key: "highContrast",
                        label: "High contrast",
                        description: "Increase contrast for better visibility",
                      },
                      {
                        key: "largeText",
                        label: "Large text",
                        description: "Use larger text throughout the app",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Switch
                          checked={
                            accessibilitySettings[
                              item.key as keyof typeof accessibilitySettings
                            ]
                          }
                          onCheckedChange={(checked) =>
                            setAccessibilitySettings((prev) => ({
                              ...prev,
                              [item.key]: checked,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Screen Reader</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Screen reader announcements</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable announcements for screen readers
                        </p>
                      </div>
                      <Switch
                        checked={
                          accessibilitySettings.screenReaderAnnouncements
                        }
                        onCheckedChange={(checked) =>
                          setAccessibilitySettings((prev) => ({
                            ...prev,
                            screenReaderAnnouncements: checked,
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
});
UserSettingsPage.displayName = "UserSettingsPage";

export { UserSettingsPage };
