/**
 * Cookie Consent Banner
 *
 * GDPR-compliant cookie consent banner with granular control.
 */

"use client";

import React, { useState, useEffect } from "react";
import { X, Cookie, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { CookiePreferences } from "@/lib/compliance/compliance-types";

import { logger } from "@/lib/logger";

const COOKIE_CONSENT_KEY = "nchat_cookie_consent";
const COOKIE_CONSENT_VERSION = "1.0";

interface CookieConsentBannerProps {
  appName?: string;
  privacyPolicyUrl?: string;
  onConsentChange?: (preferences: CookiePreferences) => void;
}

export function CookieConsentBanner({
  appName = "nChat",
  privacyPolicyUrl = "/privacy",
  onConsentChange,
}: CookieConsentBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: false,
    analytics: false,
    advertising: false,
    updatedAt: new Date(),
  });

  // Check if consent has been given
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(consent);
        if (parsed.version === COOKIE_CONSENT_VERSION) {
          setPreferences(parsed.preferences);
        } else {
          // Version mismatch, ask for consent again
          setShowBanner(true);
        }
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  const savePreferences = async (prefs: CookiePreferences) => {
    const consentData = {
      version: COOKIE_CONSENT_VERSION,
      preferences: prefs,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));

    // Call API to save preferences
    try {
      await fetch("/api/compliance/consent/cookies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
    } catch (error) {
      logger.error("Failed to save cookie preferences:", error);
    }

    onConsentChange?.(prefs);
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      advertising: true,
      updatedAt: new Date(),
    };
    setPreferences(allAccepted);
    savePreferences(allAccepted);
  };

  const acceptEssentialOnly = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      advertising: false,
      updatedAt: new Date(),
    };
    setPreferences(essentialOnly);
    savePreferences(essentialOnly);
  };

  const saveCustomPreferences = () => {
    const updated = { ...preferences, updatedAt: new Date() };
    savePreferences(updated);
  };

  const updatePreference = (
    key: keyof Omit<CookiePreferences, "updatedAt">,
    value: boolean,
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Banner */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/90 fixed bottom-0 left-0 right-0 z-50 border-t p-4 shadow-lg backdrop-blur">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-start gap-4">
            <Cookie className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-semibold">
                We value your privacy
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                We use cookies to enhance your experience, analyze our traffic,
                and for security and marketing. By clicking &quot;Accept
                All&quot;, you consent to our use of cookies.{" "}
                <a
                  href={privacyPolicyUrl}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more
                </a>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={acceptAll} size="sm">
                  Accept All
                </Button>
                <Button
                  onClick={acceptEssentialOnly}
                  variant="outline"
                  size="sm"
                >
                  Essential Only
                </Button>
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                >
                  <Settings className="h-4 w-4" />
                  Customize
                </Button>
              </div>
            </div>
            <Button
              onClick={() => setShowBanner(false)}
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Cookie Settings
            </DialogTitle>
            <DialogDescription>
              Choose which cookies you want to accept. Essential cookies are
              always enabled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Label
                    htmlFor="essential"
                    className="text-base font-semibold"
                  >
                    Essential Cookies
                  </Label>
                  <span className="bg-primary/10 rounded-full px-2 py-0.5 text-xs text-primary">
                    Always Active
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  These cookies are necessary for the website to function and
                  cannot be switched off. They are usually only set in response
                  to actions made by you such as setting your privacy
                  preferences, logging in, or filling in forms.
                </p>
              </div>
              <Switch id="essential" checked={true} disabled className="mt-1" />
            </div>

            {/* Functional Cookies */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="functional" className="text-base font-semibold">
                  Functional Cookies
                </Label>
                <p className="mt-2 text-sm text-muted-foreground">
                  These cookies enable enhanced functionality and
                  personalization. They may be set by us or by third party
                  providers whose services we have added to our pages.
                </p>
              </div>
              <Switch
                id="functional"
                checked={preferences.functional}
                onCheckedChange={(checked) =>
                  updatePreference("functional", checked)
                }
                className="mt-1"
              />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="analytics" className="text-base font-semibold">
                  Analytics Cookies
                </Label>
                <p className="mt-2 text-sm text-muted-foreground">
                  These cookies allow us to count visits and traffic sources so
                  we can measure and improve the performance of our site. They
                  help us understand which pages are the most and least popular
                  and see how visitors move around the site.
                </p>
              </div>
              <Switch
                id="analytics"
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  updatePreference("analytics", checked)
                }
                className="mt-1"
              />
            </div>

            {/* Advertising Cookies */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label
                  htmlFor="advertising"
                  className="text-base font-semibold"
                >
                  Advertising Cookies
                </Label>
                <p className="mt-2 text-sm text-muted-foreground">
                  These cookies may be set through our site by our advertising
                  partners. They may be used to build a profile of your
                  interests and show you relevant adverts on other sites.
                </p>
              </div>
              <Switch
                id="advertising"
                checked={preferences.advertising}
                onCheckedChange={(checked) =>
                  updatePreference("advertising", checked)
                }
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={acceptEssentialOnly}>
                Essential Only
              </Button>
              <Button onClick={saveCustomPreferences}>Save Preferences</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
