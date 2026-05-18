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
import { Palette, Sun, Moon, Monitor } from "lucide-react";

export default function AppearancePage() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

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
