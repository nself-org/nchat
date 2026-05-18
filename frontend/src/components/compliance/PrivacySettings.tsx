"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  User,
  MessageSquare,
  Activity,
  Bell,
  BarChart2,
  Shield,
  Save,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useComplianceStore } from "@/stores/compliance-store";
import type { PrivacySettings as PrivacySettingsType } from "@/lib/compliance/compliance-types";
import { logger } from "@/lib/logger";
import {
  createDefaultPrivacySettings,
  PROFILE_VISIBILITY_OPTIONS,
  DIRECT_MESSAGE_OPTIONS,
  PRIVACY_SETTING_CATEGORIES,
  calculatePrivacyScore,
} from "@/lib/compliance/privacy-policy";

export function PrivacySettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { privacySettings, setPrivacySettings, updatePrivacySettings } =
    useComplianceStore();

  // Initialize settings if not present
  useEffect(() => {
    if (!privacySettings) {
      setPrivacySettings(createDefaultPrivacySettings("user-123"));
    }
  }, [privacySettings, setPrivacySettings]);

  const settings = privacySettings || createDefaultPrivacySettings("user-123");
  const privacyScore = calculatePrivacyScore(settings);

  const handleToggle = (key: keyof PrivacySettingsType, value: boolean) => {
    updatePrivacySettings({ [key]: value });
    setHasChanges(true);
  };

  const handleSelect = (key: keyof PrivacySettingsType, value: string) => {
    updatePrivacySettings({ [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setHasChanges(false);
    } catch (error) {
      logger.error("Failed to save privacy settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getPrivacyLevelColor = (level: string) => {
    switch (level) {
      case "maximum":
        return "text-green-600";
      case "high":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    profile: <User className="h-5 w-5" />,
    activity: <Activity className="h-5 w-5" />,
    messaging: <MessageSquare className="h-5 w-5" />,
    invitations: <Bell className="h-5 w-5" />,
    data: <BarChart2 className="h-5 w-5" />,
    communications: <Bell className="h-5 w-5" />,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Shield className="h-6 w-6" />
            Privacy Settings
          </h2>
          <p className="text-muted-foreground">
            Control how your information is shared and displayed
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Privacy Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`rounded-full p-3 ${
                  privacyScore.level === "maximum" ||
                  privacyScore.level === "high"
                    ? "bg-green-100"
                    : privacyScore.level === "medium"
                      ? "bg-yellow-100"
                      : "bg-red-100"
                }`}
              >
                {privacyScore.level === "maximum" ||
                privacyScore.level === "high" ? (
                  <EyeOff className="h-6 w-6 text-green-600" />
                ) : (
                  <Eye className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div>
                <p className="font-medium">Privacy Score</p>
                <p
                  className={`text-2xl font-bold ${getPrivacyLevelColor(privacyScore.level)}`}
                >
                  {privacyScore.score}%
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Privacy Level</p>
              <p
                className={`font-medium capitalize ${getPrivacyLevelColor(privacyScore.level)}`}
              >
                {privacyScore.level}
              </p>
            </div>
          </div>
          {privacyScore.recommendations.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-sm font-medium">Recommendations</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {privacyScore.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-yellow-500">*</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Categories */}
      {PRIVACY_SETTING_CATEGORIES.map((category) => (
        <Card key={category.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {categoryIcons[category.id]}
              {category.name}
            </CardTitle>
            <CardDescription>{category.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {category.settings.map((setting) => {
              const value = settings[setting.key as keyof PrivacySettingsType];

              if (setting.type === "boolean") {
                return (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="space-y-0.5">
                      <Label className="text-base">{setting.name}</Label>
                      <p className="text-sm text-muted-foreground">
                        {setting.description}
                      </p>
                    </div>
                    <Switch
                      checked={value as boolean}
                      onCheckedChange={(checked) =>
                        handleToggle(
                          setting.key as keyof PrivacySettingsType,
                          checked,
                        )
                      }
                    />
                  </div>
                );
              }

              if (setting.type === "select" && setting.options) {
                return (
                  <div key={setting.key} className="space-y-2">
                    <Label>{setting.name}</Label>
                    <p className="text-sm text-muted-foreground">
                      {setting.description}
                    </p>
                    <Select
                      value={value as string}
                      onValueChange={(v) =>
                        handleSelect(
                          setting.key as keyof PrivacySettingsType,
                          v,
                        )
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[250px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {setting.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              return null;
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
