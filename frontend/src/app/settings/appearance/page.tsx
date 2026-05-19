"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Palette, Sun, Moon, Monitor } from "lucide-react";

export default function AppearancePage() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="container max-w-2xl py-8">
        <h1 className="mb-8 flex items-center gap-3 text-3xl font-bold">
          <Palette className="h-8 w-8" />
          Appearance Settings
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-8 flex items-center gap-3 text-3xl font-bold">
        <Palette className="h-8 w-8" />
        Appearance Settings
      </h1>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Select your preferred color scheme
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Hidden select for test automation — kept in sync with RadioGroup */}
            <select
              data-testid="select-theme"
              value={theme ?? "system"}
              onChange={(e) => setTheme(e.target.value)}
              className="sr-only"
              aria-label="Select theme"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>

            <RadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value)}
              className="space-y-3"
            >
              <div className="hover:bg-muted/50 flex cursor-pointer items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="light" id="light" />
                <Sun className="h-5 w-5 text-yellow-500" />
                <Label htmlFor="light" className="flex-1 cursor-pointer">
                  <div className="font-medium">Light</div>
                  <div className="text-sm text-muted-foreground">
                    A clean, bright interface
                  </div>
                </Label>
              </div>
              <div className="hover:bg-muted/50 flex cursor-pointer items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="dark" id="dark" />
                <Moon className="h-5 w-5 text-blue-500" />
                <Label htmlFor="dark" className="flex-1 cursor-pointer">
                  <div className="font-medium">Dark</div>
                  <div className="text-sm text-muted-foreground">
                    Easy on the eyes in low light
                  </div>
                </Label>
              </div>
              <div className="hover:bg-muted/50 flex cursor-pointer items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="system" id="system" />
                <Monitor className="h-5 w-5 text-gray-500" />
                <Label htmlFor="system" className="flex-1 cursor-pointer">
                  <div className="font-medium">System</div>
                  <div className="text-sm text-muted-foreground">
                    Match your device settings
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Animations</CardTitle>
            <CardDescription>
              Control interface animation effects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="toggle-animations" className="font-medium">
                  Enable Animations
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show motion effects and transitions
                </p>
              </div>
              <Switch
                id="toggle-animations"
                data-testid="toggle-animations"
                checked={animationsEnabled}
                onCheckedChange={setAnimationsEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="toggle-compact-mode" className="font-medium">
                  Compact Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Reduce spacing for a denser layout
                </p>
              </div>
              <Switch
                id="toggle-compact-mode"
                data-testid="toggle-compact-mode"
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Template</CardTitle>
            <CardDescription>
              The visual style is controlled by the platform template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              To change the platform template (Slack, Discord, Telegram,
              WhatsApp, or nself default), set the{" "}
              <code className="rounded bg-muted px-1">
                NEXT_PUBLIC_PLATFORM_TEMPLATE
              </code>{" "}
              environment variable.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
