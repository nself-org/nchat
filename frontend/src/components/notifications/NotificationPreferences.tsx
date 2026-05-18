/**
 * NotificationPreferences Component
 *
 * Settings UI for managing notification preferences.
 */

"use client";

import React, { useCallback } from "react";
import {
  Bell,
  BellOff,
  Mail,
  Smartphone,
  MessageSquare,
  Clock,
  Moon,
  Send,
  AlertTriangle,
  Megaphone,
  Settings,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import {
  NotificationChannel,
  NotificationCategory,
  FrequencyType,
} from "@/types/notifications";

// =============================================================================
// Types
// =============================================================================

export interface NotificationPreferencesProps {
  /**
   * Additional class name
   */
  className?: string;

  /**
   * Callback when preferences are saved
   */
  onSave?: () => void;
}

// =============================================================================
// Channel Section Component
// =============================================================================

interface ChannelSectionProps {
  channel: NotificationChannel;
  title: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  frequency: FrequencyType;
  categories: Record<NotificationCategory, boolean>;
  onToggle: (enabled: boolean) => void;
  onFrequencyChange: (frequency: FrequencyType) => void;
  onCategoryToggle: (category: NotificationCategory, enabled: boolean) => void;
  isLoading?: boolean;
}

function ChannelSection({
  channel,
  title,
  description,
  icon: Icon,
  enabled,
  frequency,
  categories,
  onToggle,
  onFrequencyChange,
  onCategoryToggle,
  isLoading,
}: ChannelSectionProps) {
  const categoryLabels: Record<
    NotificationCategory,
    { label: string; icon: React.ElementType }
  > = {
    transactional: { label: "Messages & Mentions", icon: MessageSquare },
    marketing: { label: "Marketing & Updates", icon: Megaphone },
    system: { label: "System & Security", icon: Settings },
    alert: { label: "Alerts & Reminders", icon: AlertTriangle },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">
                {description}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={isLoading}
            aria-label={`Enable ${title}`}
          />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4 pt-0">
          <Separator />

          {/* Frequency */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Frequency</Label>
            </div>
            <Select
              value={frequency}
              onValueChange={(v) => onFrequencyChange(v as FrequencyType)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Categories</Label>
            {Object.entries(categories).map(([category, isEnabled]) => {
              const { label, icon: CategoryIcon } =
                categoryLabels[category as NotificationCategory];
              return (
                <div
                  key={category}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">{label}</Label>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      onCategoryToggle(
                        category as NotificationCategory,
                        checked,
                      )
                    }
                    disabled={isLoading}
                    aria-label={`Enable ${label}`}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// Push Subscription Section Component
// =============================================================================

function PushSubscriptionSection() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  } = usePushSubscription();

  const handleToggle = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      if (permission === "default") {
        const result = await requestPermission();
        if (result === "granted") {
          await subscribe();
        }
      } else if (permission === "granted") {
        await subscribe();
      }
    }
  }, [isSubscribed, permission, requestPermission, subscribe, unsubscribe]);

  if (!isSupported) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-4">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              Push notifications not supported
            </p>
            <p className="text-xs text-muted-foreground">
              Your browser does not support push notifications
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (permission === "denied") {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-3 py-4">
          <BellOff className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium">Push notifications blocked</p>
            <p className="text-xs text-muted-foreground">
              Enable notifications in your browser settings
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isSubscribed ? "bg-primary/10" : "bg-muted",
            )}
          >
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {isSubscribed
                ? "Push notifications enabled"
                : "Enable push notifications"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? "You will receive notifications on this device"
                : "Get notified even when the app is not open"}
            </p>
          </div>
        </div>
        <Button
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          onClick={handleToggle}
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : isSubscribed ? (
            "Disable"
          ) : (
            "Enable"
          )}
        </Button>
      </CardContent>
      {error && (
        <CardContent className="pt-0">
          <p className="text-xs text-destructive">{error}</p>
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function NotificationPreferences({
  className,
  onSave,
}: NotificationPreferencesProps) {
  const {
    preferences,
    isLoading,
    error,
    toggleChannel,
    setChannelFrequency,
    toggleCategory,
    setQuietHours,
    setDigest,
    resetPreferences,
  } = useNotificationPreferences({
    onUpdate: onSave,
  });

  const handleQuietHoursToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        await setQuietHours({
          start: "22:00",
          end: "08:00",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } else {
        await setQuietHours(null);
      }
    },
    [setQuietHours],
  );

  const handleQuietHoursChange = useCallback(
    async (field: "start" | "end", value: string) => {
      if (preferences.quietHours) {
        await setQuietHours({
          ...preferences.quietHours,
          [field]: value,
        });
      }
    },
    [preferences.quietHours, setQuietHours],
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Push Notifications */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Browser Notifications</h3>
        <PushSubscriptionSection />
      </div>

      {/* Email Notifications */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Email Notifications</h3>
        <ChannelSection
          channel="email"
          title="Email"
          description="Receive notifications via email"
          icon={Mail}
          enabled={preferences.email.enabled}
          frequency={preferences.email.frequency}
          categories={preferences.email.categories}
          onToggle={(enabled) => toggleChannel("email", enabled)}
          onFrequencyChange={(frequency) =>
            setChannelFrequency("email", frequency)
          }
          onCategoryToggle={(category, enabled) =>
            toggleCategory("email", category, enabled)
          }
          isLoading={isLoading}
        />
      </div>

      {/* Push/Mobile Notifications */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Mobile Notifications</h3>
        <ChannelSection
          channel="push"
          title="Push"
          description="Receive push notifications on your devices"
          icon={Smartphone}
          enabled={preferences.push.enabled}
          frequency={preferences.push.frequency}
          categories={preferences.push.categories}
          onToggle={(enabled) => toggleChannel("push", enabled)}
          onFrequencyChange={(frequency) =>
            setChannelFrequency("push", frequency)
          }
          onCategoryToggle={(category, enabled) =>
            toggleCategory("push", category, enabled)
          }
          isLoading={isLoading}
        />
      </div>

      {/* SMS Notifications */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">SMS Notifications</h3>
        <ChannelSection
          channel="sms"
          title="SMS"
          description="Receive notifications via text message"
          icon={Send}
          enabled={preferences.sms.enabled}
          frequency={preferences.sms.frequency}
          categories={preferences.sms.categories}
          onToggle={(enabled) => toggleChannel("sms", enabled)}
          onFrequencyChange={(frequency) =>
            setChannelFrequency("sms", frequency)
          }
          onCategoryToggle={(category, enabled) =>
            toggleCategory("sms", category, enabled)
          }
          isLoading={isLoading}
        />
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Do Not Disturb</h3>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Moon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Quiet Hours</CardTitle>
                  <CardDescription className="text-xs">
                    Pause notifications during specific hours
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={!!preferences.quietHours}
                onCheckedChange={handleQuietHoursToggle}
                disabled={isLoading}
                aria-label="Enable quiet hours"
              />
            </div>
          </CardHeader>

          {preferences.quietHours && (
            <CardContent className="space-y-4 pt-0">
              <Separator />
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={(e) =>
                      handleQuietHoursChange("start", e.target.value)
                    }
                    disabled={isLoading}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={(e) =>
                      handleQuietHoursChange("end", e.target.value)
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Daily Digest */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Daily Digest</h3>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Digest Summary</CardTitle>
                  <CardDescription className="text-xs">
                    Receive a summary of missed notifications
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={preferences.digest.enabled}
                onCheckedChange={(enabled) => setDigest(enabled)}
                disabled={isLoading}
                aria-label="Enable digest"
              />
            </div>
          </CardHeader>

          {preferences.digest.enabled && (
            <CardContent className="space-y-4 pt-0">
              <Separator />
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">
                    Frequency
                  </Label>
                  <Select
                    value={preferences.digest.frequency}
                    onValueChange={(v) =>
                      setDigest(
                        true,
                        v as "daily" | "weekly",
                        preferences.digest.time,
                      )
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={preferences.digest.time}
                    onChange={(e) =>
                      setDigest(
                        true,
                        preferences.digest.frequency,
                        e.target.value,
                      )
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 rounded-lg p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Reset Button */}
      <div className="pt-4">
        <Button
          variant="outline"
          onClick={resetPreferences}
          disabled={isLoading}
          className="w-full"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}

export default NotificationPreferences;
