"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  SettingsLayout,
  SettingsSection,
  SettingsRow,
  SimpleNotificationToggle,
} from "@/components/settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  MapPin,
  ChevronLeft,
  Globe,
  Users,
  Lock,
  Clock,
  Trash2,
  Shield,
  History,
  Navigation,
  AlertCircle,
} from "lucide-react";
import {
  type LocationVisibility,
  type LocationSharingDuration,
  type LocationPrivacySettings,
  SHARING_DURATION_OPTIONS,
  DEFAULT_LOCATION_PRIVACY,
} from "@/lib/location";
import { PermissionStatusBadge } from "@/components/location";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface LocationSettingsState extends LocationPrivacySettings {
  locationHistoryCount?: number;
}

// ============================================================================
// Default State
// ============================================================================

const defaultSettings: LocationSettingsState = {
  ...DEFAULT_LOCATION_PRIVACY,
  locationHistoryCount: 0,
};

// ============================================================================
// Page Component
// ============================================================================

export default function LocationPrivacySettingsPage() {
  const [settings, setSettings] =
    useState<LocationSettingsState>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  const updateSetting = <K extends keyof LocationSettingsState>(
    key: K,
    value: LocationSettingsState[K],
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
      logger.error("Failed to save location settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    setClearingHistory(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSettings((prev) => ({ ...prev, locationHistoryCount: 0 }));
    } catch (error) {
      logger.error("Failed to clear location history:", error);
    } finally {
      setClearingHistory(false);
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href="/settings/privacy"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Privacy
        </Link>

        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Location Privacy
            </h1>
            <p className="text-sm text-muted-foreground">
              Control how your location is shared and stored
            </p>
          </div>
        </div>

        {/* Permission Status */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Navigation className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Location Access</p>
              <p className="text-sm text-muted-foreground">
                Browser permission status
              </p>
            </div>
          </div>
          <PermissionStatusBadge />
        </div>

        <div className="space-y-6">
          {/* Who Can See Location */}
          <SettingsSection
            title="Location Visibility"
            description="Control who can see your location when you share it"
          >
            <div className="space-y-4">
              <SettingsRow
                label="Who can see your location"
                description="Choose who can see your location when you share it"
                htmlFor="location-visibility"
                vertical
              >
                <RadioGroup
                  value={settings.locationVisibility}
                  onValueChange={(value) =>
                    updateSetting(
                      "locationVisibility",
                      value as LocationVisibility,
                    )
                  }
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 rounded-lg border p-4">
                    <RadioGroupItem value="everyone" id="vis-everyone" />
                    <div className="flex-1">
                      <Label
                        htmlFor="vis-everyone"
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Everyone</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Anyone in the channel or conversation can see your
                        location
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border p-4">
                    <RadioGroupItem value="contacts" id="vis-contacts" />
                    <div className="flex-1">
                      <Label
                        htmlFor="vis-contacts"
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Contacts only</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Only people in your contacts can see your location
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border p-4">
                    <RadioGroupItem value="nobody" id="vis-nobody" />
                    <div className="flex-1">
                      <Label
                        htmlFor="vis-nobody"
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Nobody</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Disable location sharing entirely
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </SettingsRow>
            </div>
          </SettingsSection>

          {/* Location Accuracy */}
          <SettingsSection
            title="Location Accuracy"
            description="Control the precision of your shared location"
          >
            <div className="space-y-2 rounded-lg border p-4">
              <SimpleNotificationToggle
                id="approximate-location"
                label="Use approximate location"
                description="Share a general area instead of your exact position (within ~500m)"
                checked={settings.useApproximateLocation}
                onCheckedChange={(checked) =>
                  updateSetting("useApproximateLocation", checked)
                }
              />
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <div className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  When enabled, your location will be shown as a general area
                  rather than a precise point, adding an extra layer of privacy.
                </p>
              </div>
            </div>
          </SettingsSection>

          {/* Default Sharing Duration */}
          <SettingsSection
            title="Default Live Location Duration"
            description="Set the default duration when sharing live location"
          >
            <div className="rounded-lg border p-4">
              <SettingsRow
                label="Default duration"
                description="How long to share live location by default"
                htmlFor="default-duration"
              >
                <Select
                  value={String(settings.defaultSharingDuration)}
                  onValueChange={(value) =>
                    updateSetting(
                      "defaultSharingDuration",
                      parseInt(value) as LocationSharingDuration,
                    )
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHARING_DURATION_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.duration}
                        value={String(option.duration)}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsRow>
            </div>
          </SettingsSection>

          {/* Nearby Places */}
          <SettingsSection
            title="Nearby Places"
            description="Control whether to show nearby places when sharing location"
          >
            <div className="rounded-lg border p-4">
              <SimpleNotificationToggle
                id="show-nearby"
                label="Show nearby places"
                description="Display nearby restaurants, stores, and other places when sharing location"
                checked={settings.showNearbyPlaces}
                onCheckedChange={(checked) =>
                  updateSetting("showNearbyPlaces", checked)
                }
              />
            </div>
          </SettingsSection>

          {/* Location History */}
          <SettingsSection
            title="Location History"
            description="Control how your location history is stored"
          >
            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <SimpleNotificationToggle
                  id="save-history"
                  label="Save location history"
                  description="Keep a record of places you've shared"
                  checked={settings.saveLocationHistory}
                  onCheckedChange={(checked) =>
                    updateSetting("saveLocationHistory", checked)
                  }
                />
              </div>

              {settings.saveLocationHistory && (
                <div className="rounded-lg border p-4">
                  <SettingsRow
                    label="Auto-delete history"
                    description="Automatically delete old location history"
                    htmlFor="history-retention"
                  >
                    <Select
                      value={String(settings.locationHistoryRetentionDays)}
                      onValueChange={(value) =>
                        updateSetting(
                          "locationHistoryRetentionDays",
                          parseInt(value),
                        )
                      }
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Never</SelectItem>
                        <SelectItem value="7">After 7 days</SelectItem>
                        <SelectItem value="30">After 30 days</SelectItem>
                        <SelectItem value="90">After 90 days</SelectItem>
                        <SelectItem value="365">After 1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingsRow>
                </div>
              )}

              {/* Clear History */}
              <div className="border-destructive/30 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Clear location history</p>
                      <p className="text-sm text-muted-foreground">
                        {settings.locationHistoryCount
                          ? `${settings.locationHistoryCount} locations saved`
                          : "No location history"}
                      </p>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-destructive/10 text-destructive"
                        disabled={
                          !settings.locationHistoryCount || clearingHistory
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                          Clear Location History?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all saved location data.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearHistory}
                          className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                        >
                          Clear History
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Privacy Tips */}
          <SettingsSection
            title="Privacy Tips"
            description="Best practices for location sharing"
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Shield className="mt-0.5 h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Only share with trusted people
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Be mindful about who you share your location with,
                    especially live location.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Clock className="mt-0.5 h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-400">
                    Use shorter durations
                  </p>
                  <p className="text-sm text-muted-foreground">
                    When sharing live location, choose the shortest duration
                    that meets your needs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Navigation className="mt-0.5 h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    Review active shares
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Regularly check if you have any active live location shares
                    and stop them when no longer needed.
                  </p>
                </div>
              </div>
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
