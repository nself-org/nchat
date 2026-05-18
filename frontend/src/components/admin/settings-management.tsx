"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SettingsManagement() {
  const [settings, setSettings] = useState({
    appName: "nChat",
    appTagline: "Team Communication Platform",
    allowRegistration: true,
    maxFileSize: 100,
    messageRetentionDays: 0,
  });

  const handleSave = () => {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Settings</CardTitle>
        <CardDescription>Configure application-wide settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appName">Application Name</Label>
            <Input
              id="appName"
              value={settings.appName}
              onChange={(e) =>
                setSettings({ ...settings, appName: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appTagline">Tagline</Label>
            <Input
              id="appTagline"
              value={settings.appTagline}
              onChange={(e) =>
                setSettings({ ...settings, appTagline: e.target.value })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allowRegistration">Allow Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to sign up
              </p>
            </div>
            <Switch
              id="allowRegistration"
              checked={settings.allowRegistration}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowRegistration: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
            <Input
              id="maxFileSize"
              type="number"
              value={settings.maxFileSize}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxFileSize: parseInt(e.target.value),
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="messageRetention">Message Retention (days)</Label>
            <Input
              id="messageRetention"
              type="number"
              value={settings.messageRetentionDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  messageRetentionDays: parseInt(e.target.value),
                })
              }
            />
            <p className="text-sm text-muted-foreground">
              0 means messages are kept forever
            </p>
          </div>
        </div>

        <Button onClick={handleSave}>Save Settings</Button>
      </CardContent>
    </Card>
  );
}
