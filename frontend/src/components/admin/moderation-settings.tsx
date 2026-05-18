"use client";

/**
 * Moderation Settings Component
 * Configure moderation rules and thresholds
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { ModerationConfig } from "@/lib/moderation/moderation-service";

import { logger } from "@/lib/logger";

export function ModerationSettings() {
  const [config, setConfig] = useState<ModerationConfig>({
    toxicThreshold: 0.7,
    nsfwThreshold: 0.7,
    spamThreshold: 0.6,
    profanityThreshold: 0.5,
    autoFlag: true,
    autoHide: false,
    autoWarn: false,
    autoMute: false,
    enableToxicityDetection: true,
    enableNSFWDetection: true,
    enableSpamDetection: true,
    enableProfanityFilter: true,
  });

  const [customBlockedWords, setCustomBlockedWords] = useState("");
  const [customAllowedWords, setCustomAllowedWords] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to app config or database
      // For now, just show success
      toast.success("Moderation settings saved");

      // In production, you'd call an API endpoint:
      // await fetch('/api/admin/moderation/config', {
      //   method: 'POST',
      //   body: JSON.stringify({ config, customBlockedWords, customAllowedWords })
      // })
    } catch (error) {
      logger.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Moderation Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure AI-powered moderation rules and thresholds
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detection Features</CardTitle>
          <CardDescription>
            Enable or disable specific detection modules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Toxic Content Detection</Label>
              <div className="text-sm text-muted-foreground">
                AI-powered detection of toxic language and harassment
              </div>
            </div>
            <Switch
              checked={config.enableToxicityDetection}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enableToxicityDetection: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>NSFW Image Detection</Label>
              <div className="text-sm text-muted-foreground">
                Detect inappropriate images automatically
              </div>
            </div>
            <Switch
              checked={config.enableNSFWDetection}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enableNSFWDetection: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Spam Detection</Label>
              <div className="text-sm text-muted-foreground">
                Detect spam messages and repetitive content
              </div>
            </div>
            <Switch
              checked={config.enableSpamDetection}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enableSpamDetection: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Profanity Filter</Label>
              <div className="text-sm text-muted-foreground">
                Block profanity and inappropriate language
              </div>
            </div>
            <Switch
              checked={config.enableProfanityFilter}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enableProfanityFilter: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detection Thresholds</CardTitle>
          <CardDescription>
            Adjust sensitivity for each detection type (0-100%)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Toxic Content Threshold</Label>
              <span className="text-sm font-medium">
                {Math.round(config.toxicThreshold * 100)}%
              </span>
            </div>
            <Slider
              value={[config.toxicThreshold * 100]}
              onValueChange={([value]) =>
                setConfig({ ...config, toxicThreshold: value / 100 })
              }
              min={0}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Higher values = less sensitive (fewer false positives)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>NSFW Threshold</Label>
              <span className="text-sm font-medium">
                {Math.round(config.nsfwThreshold * 100)}%
              </span>
            </div>
            <Slider
              value={[config.nsfwThreshold * 100]}
              onValueChange={([value]) =>
                setConfig({ ...config, nsfwThreshold: value / 100 })
              }
              min={0}
              max={100}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Spam Threshold</Label>
              <span className="text-sm font-medium">
                {Math.round(config.spamThreshold * 100)}%
              </span>
            </div>
            <Slider
              value={[config.spamThreshold * 100]}
              onValueChange={([value]) =>
                setConfig({ ...config, spamThreshold: value / 100 })
              }
              min={0}
              max={100}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Profanity Threshold</Label>
              <span className="text-sm font-medium">
                {Math.round(config.profanityThreshold * 100)}%
              </span>
            </div>
            <Slider
              value={[config.profanityThreshold * 100]}
              onValueChange={([value]) =>
                setConfig({ ...config, profanityThreshold: value / 100 })
              }
              min={0}
              max={100}
              step={5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automated Actions</CardTitle>
          <CardDescription>
            Configure automatic responses to detected violations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Flag for Review</Label>
              <div className="text-sm text-muted-foreground">
                Automatically add to moderation queue
              </div>
            </div>
            <Switch
              checked={config.autoFlag}
              onCheckedChange={(checked) =>
                setConfig({ ...config, autoFlag: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Hide Content</Label>
              <div className="text-sm text-muted-foreground">
                Hide high-risk content until reviewed
              </div>
            </div>
            <Switch
              checked={config.autoHide}
              onCheckedChange={(checked) =>
                setConfig({ ...config, autoHide: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Warn Users</Label>
              <div className="text-sm text-muted-foreground">
                Send warning to users for violations
              </div>
            </div>
            <Switch
              checked={config.autoWarn}
              onCheckedChange={(checked) =>
                setConfig({ ...config, autoWarn: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Mute Users</Label>
              <div className="text-sm text-muted-foreground">
                Temporarily mute users for severe violations
              </div>
            </div>
            <Switch
              checked={config.autoMute}
              onCheckedChange={(checked) =>
                setConfig({ ...config, autoMute: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Word Lists</CardTitle>
          <CardDescription>Add custom words to block or allow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Blocked Words</Label>
            <Textarea
              placeholder="Enter words to block, one per line..."
              value={customBlockedWords}
              onChange={(e) => setCustomBlockedWords(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              These words will be automatically filtered from messages
            </p>
          </div>

          <div className="space-y-2">
            <Label>Allowed Words (Whitelist)</Label>
            <Textarea
              placeholder="Enter words to allow, one per line..."
              value={customAllowedWords}
              onChange={(e) => setCustomAllowedWords(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Words that should never be filtered (exceptions)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
