"use client";

import { useState, useEffect } from "react";
import { Cookie, Shield, Info, Save, Loader2 } from "lucide-react";
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
import { useComplianceStore } from "@/stores/compliance-store";
import type { CookiePreferences } from "@/lib/compliance/compliance-types";
import { logger } from "@/lib/logger";
import {
  createDefaultCookiePreferences,
  updateCookiePreferences,
} from "@/lib/compliance/consent-manager";

const COOKIE_CATEGORIES = [
  {
    id: "essential",
    name: "Essential Cookies",
    description:
      "Required for the website to function properly. Cannot be disabled.",
    required: true,
    examples: ["Session cookies", "Authentication cookies", "Security cookies"],
  },
  {
    id: "functional",
    name: "Functional Cookies",
    description: "Remember your preferences and personalize your experience.",
    required: false,
    examples: ["Language preferences", "Theme settings", "Saved form data"],
  },
  {
    id: "analytics",
    name: "Analytics Cookies",
    description: "Help us understand how you use our website to improve it.",
    required: false,
    examples: [
      "Google Analytics",
      "Page view tracking",
      "Performance monitoring",
    ],
  },
  {
    id: "advertising",
    name: "Advertising Cookies",
    description: "Used to show you relevant ads and measure ad effectiveness.",
    required: false,
    examples: ["Ad targeting", "Conversion tracking", "Remarketing"],
  },
];

export function CookieSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { cookiePreferences, setCookiePreferences } = useComplianceStore();

  // Initialize preferences if not present
  useEffect(() => {
    if (!cookiePreferences) {
      setCookiePreferences(createDefaultCookiePreferences());
    }
  }, [cookiePreferences, setCookiePreferences]);

  const preferences = cookiePreferences || createDefaultCookiePreferences();

  const handleToggle = (
    category: keyof Omit<CookiePreferences, "updatedAt" | "essential">,
    value: boolean,
  ) => {
    const updated = updateCookiePreferences(preferences, { [category]: value });
    setCookiePreferences(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setHasChanges(false);
    } catch (error) {
      logger.error("Failed to save cookie preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcceptAll = () => {
    const updated = updateCookiePreferences(preferences, {
      functional: true,
      analytics: true,
      advertising: true,
    });
    setCookiePreferences(updated);
    setHasChanges(true);
  };

  const handleRejectAll = () => {
    const updated = updateCookiePreferences(preferences, {
      functional: false,
      analytics: false,
      advertising: false,
    });
    setCookiePreferences(updated);
    setHasChanges(true);
  };

  const getCategoryValue = (id: string): boolean => {
    switch (id) {
      case "essential":
        return true;
      case "functional":
        return preferences.functional;
      case "analytics":
        return preferences.analytics;
      case "advertising":
        return preferences.advertising;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Cookie className="h-6 w-6" />
            Cookie Preferences
          </h2>
          <p className="text-muted-foreground">
            Manage how we use cookies on this website
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
              Save Preferences
            </>
          )}
        </Button>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Quickly configure your cookie preferences
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRejectAll}>
                Reject All Optional
              </Button>
              <Button onClick={handleAcceptAll}>Accept All</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cookie Categories */}
      <div className="space-y-4">
        {COOKIE_CATEGORIES.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {category.name}
                    {category.required && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        Required
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
                <Switch
                  checked={getCategoryValue(category.id)}
                  onCheckedChange={(checked) =>
                    handleToggle(
                      category.id as keyof Omit<
                        CookiePreferences,
                        "updatedAt" | "essential"
                      >,
                      checked,
                    )
                  }
                  disabled={category.required}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p className="mb-2 font-medium">Examples:</p>
                <ul className="list-inside list-disc space-y-1">
                  {category.examples.map((example, i) => (
                    <li key={i}>{example}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            About Cookies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Cookies are small text files stored on your device that help us
            provide a better experience.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Your preferences are saved to your browser</li>
            <li>You can change these settings at any time</li>
            <li>Disabling certain cookies may affect functionality</li>
            <li>
              For more information, see our{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Cookie Policy
              </a>
            </li>
          </ul>
          {preferences.updatedAt && (
            <p className="mt-4">
              Last updated: {new Date(preferences.updatedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
