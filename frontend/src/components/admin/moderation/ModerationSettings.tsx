/**
 * Moderation Settings Component
 * Configure AI moderation policies and thresholds
 */

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Settings, Shield, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ModerationPolicy } from "@/lib/moderation/ai-moderator";

import { logger } from "@/lib/logger";

export function ModerationSettings() {
  const { toast } = useToast();
  const [policy, setPolicy] = useState<ModerationPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customWord, setCustomWord] = useState("");

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/moderation/analyze");
      const data = await response.json();

      if (data.success && data.policy) {
        setPolicy(data.policy);
      }
    } catch (error) {
      logger.error("Failed to fetch policy:", error);
      toast({
        title: "Error",
        description: "Failed to load moderation settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePolicy = async () => {
    if (!policy) return;

    setSaving(true);
    try {
      const response = await fetch("/api/moderation/analyze", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Moderation settings saved successfully",
        });
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (error) {
      logger.error("Failed to save policy:", error);
      toast({
        title: "Error",
        description: "Failed to save moderation settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePolicy = (updates: Partial<ModerationPolicy>) => {
    if (policy) {
      setPolicy({ ...policy, ...updates });
    }
  };

  const updateThreshold = (
    key: keyof ModerationPolicy["thresholds"],
    value: number,
  ) => {
    if (policy) {
      setPolicy({
        ...policy,
        thresholds: {
          ...policy.thresholds,
          [key]: value,
        },
      });
    }
  };

  const addBlockedWord = () => {
    if (!policy || !customWord.trim()) return;

    if (!policy.customBlockedWords.includes(customWord.trim())) {
      updatePolicy({
        customBlockedWords: [...policy.customBlockedWords, customWord.trim()],
      });
      setCustomWord("");
    }
  };

  const removeBlockedWord = (word: string) => {
    if (!policy) return;

    updatePolicy({
      customBlockedWords: policy.customBlockedWords.filter((w) => w !== word),
    });
  };

  const addAllowedWord = () => {
    if (!policy || !customWord.trim()) return;

    if (!policy.customAllowedWords.includes(customWord.trim())) {
      updatePolicy({
        customAllowedWords: [...policy.customAllowedWords, customWord.trim()],
      });
      setCustomWord("");
    }
  };

  const removeAllowedWord = (word: string) => {
    if (!policy) return;

    updatePolicy({
      customAllowedWords: policy.customAllowedWords.filter((w) => w !== word),
    });
  };

  if (loading || !policy) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Moderation Settings</h2>
          <p className="text-muted-foreground">
            Configure AI moderation policies
          </p>
        </div>
        <Button onClick={savePolicy} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="detection">
        <TabsList>
          <TabsTrigger value="detection">
            <Shield className="mr-2 h-4 w-4" />
            Detection
          </TabsTrigger>
          <TabsTrigger value="thresholds">
            <Settings className="mr-2 h-4 w-4" />
            Thresholds
          </TabsTrigger>
          <TabsTrigger value="actions">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Auto Actions
          </TabsTrigger>
          <TabsTrigger value="words">Custom Words</TabsTrigger>
        </TabsList>

        {/* Detection Features */}
        <TabsContent value="detection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Detection Features</CardTitle>
              <CardDescription>
                Enable or disable specific AI detection modules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="toxicity">Toxicity Detection</Label>
                  <p className="text-sm text-muted-foreground">
                    Detect toxic, insulting, and threatening content
                  </p>
                </div>
                <Switch
                  id="toxicity"
                  checked={policy.enableToxicityDetection}
                  onCheckedChange={(checked) =>
                    updatePolicy({ enableToxicityDetection: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="nsfw">NSFW Detection</Label>
                  <p className="text-sm text-muted-foreground">
                    Detect not-safe-for-work content and images
                  </p>
                </div>
                <Switch
                  id="nsfw"
                  checked={policy.enableNSFWDetection}
                  onCheckedChange={(checked) =>
                    updatePolicy({ enableNSFWDetection: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="spam">Spam Detection</Label>
                  <p className="text-sm text-muted-foreground">
                    Detect spam, promotional content, and flooding
                  </p>
                </div>
                <Switch
                  id="spam"
                  checked={policy.enableSpamDetection}
                  onCheckedChange={(checked) =>
                    updatePolicy({ enableSpamDetection: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="profanity">Profanity Filter</Label>
                  <p className="text-sm text-muted-foreground">
                    Filter profane and inappropriate language
                  </p>
                </div>
                <Switch
                  id="profanity"
                  checked={policy.enableProfanityFilter}
                  onCheckedChange={(checked) =>
                    updatePolicy({ enableProfanityFilter: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="learning">False Positive Learning</Label>
                  <p className="text-sm text-muted-foreground">
                    Learn from false positives to improve accuracy
                  </p>
                </div>
                <Switch
                  id="learning"
                  checked={policy.enableFalsePositiveLearning}
                  onCheckedChange={(checked) =>
                    updatePolicy({ enableFalsePositiveLearning: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thresholds */}
        <TabsContent value="thresholds" className="space-y-4">
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
                  <Label>Toxicity Threshold</Label>
                  <span className="text-sm font-medium">
                    {Math.round(policy.thresholds.toxicity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[policy.thresholds.toxicity * 100]}
                  onValueChange={([value]) =>
                    updateThreshold("toxicity", value / 100)
                  }
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>NSFW Threshold</Label>
                  <span className="text-sm font-medium">
                    {Math.round(policy.thresholds.nsfw * 100)}%
                  </span>
                </div>
                <Slider
                  value={[policy.thresholds.nsfw * 100]}
                  onValueChange={([value]) =>
                    updateThreshold("nsfw", value / 100)
                  }
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Spam Threshold</Label>
                  <span className="text-sm font-medium">
                    {Math.round(policy.thresholds.spam * 100)}%
                  </span>
                </div>
                <Slider
                  value={[policy.thresholds.spam * 100]}
                  onValueChange={([value]) =>
                    updateThreshold("spam", value / 100)
                  }
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Profanity Threshold</Label>
                  <span className="text-sm font-medium">
                    {Math.round(policy.thresholds.profanity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[policy.thresholds.profanity * 100]}
                  onValueChange={([value]) =>
                    updateThreshold("profanity", value / 100)
                  }
                  max={100}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Action Thresholds</CardTitle>
              <CardDescription>
                When to trigger different moderation actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Flag Threshold</Label>
                  <span className="text-sm font-medium">
                    {Math.round(policy.thresholds.flagThreshold * 100)}%
                  </span>
                </div>
                <Slider
                  value={[policy.thresholds.flagThreshold * 100]}
                  onValueChange={([value]) =>
                    updateThreshold("flagThreshold", value / 100)
                  }
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Hide Threshold</Label>
                  <span className="text-sm font-medium">
                    {Math.round(policy.thresholds.hideThreshold * 100)}%
                  </span>
                </div>
                <Slider
                  value={[policy.thresholds.hideThreshold * 100]}
                  onValueChange={([value]) =>
                    updateThreshold("hideThreshold", value / 100)
                  }
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Mute Threshold</Label>
                  <span className="text-sm font-medium">
                    {Math.round(policy.thresholds.muteThreshold * 100)}%
                  </span>
                </div>
                <Slider
                  value={[policy.thresholds.muteThreshold * 100]}
                  onValueChange={([value]) =>
                    updateThreshold("muteThreshold", value / 100)
                  }
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ban Threshold</Label>
                  <span className="text-sm font-medium">
                    {Math.round(policy.thresholds.banThreshold * 100)}%
                  </span>
                </div>
                <Slider
                  value={[policy.thresholds.banThreshold * 100]}
                  onValueChange={([value]) =>
                    updateThreshold("banThreshold", value / 100)
                  }
                  max={100}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto Actions */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Actions</CardTitle>
              <CardDescription>
                Enable automatic moderation actions based on AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoFlag">Auto Flag</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically flag suspicious content for review
                  </p>
                </div>
                <Switch
                  id="autoFlag"
                  checked={policy.autoFlag}
                  onCheckedChange={(checked) =>
                    updatePolicy({ autoFlag: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoHide">Auto Hide</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically hide high-risk content
                  </p>
                </div>
                <Switch
                  id="autoHide"
                  checked={policy.autoHide}
                  onCheckedChange={(checked) =>
                    updatePolicy({ autoHide: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoWarn">Auto Warn</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically warn users for policy violations
                  </p>
                </div>
                <Switch
                  id="autoWarn"
                  checked={policy.autoWarn}
                  onCheckedChange={(checked) =>
                    updatePolicy({ autoWarn: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoMute">Auto Mute</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically mute users with severe violations
                  </p>
                </div>
                <Switch
                  id="autoMute"
                  checked={policy.autoMute}
                  onCheckedChange={(checked) =>
                    updatePolicy({ autoMute: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoBan">Auto Ban</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically ban users with critical violations
                  </p>
                </div>
                <Switch
                  id="autoBan"
                  checked={policy.autoBan}
                  onCheckedChange={(checked) =>
                    updatePolicy({ autoBan: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Words */}
        <TabsContent value="words" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blocked Words</CardTitle>
              <CardDescription>Custom words to always block</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add blocked word..."
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBlockedWord()}
                />
                <Button onClick={addBlockedWord}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {policy.customBlockedWords.map((word) => (
                  <Badge key={word} variant="destructive">
                    {word}
                    <button
                      onClick={() => removeBlockedWord(word)}
                      className="ml-2 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Allowed Words</CardTitle>
              <CardDescription>
                Words to allow even if flagged by AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add allowed word..."
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAllowedWord()}
                />
                <Button onClick={addAllowedWord}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {policy.customAllowedWords.map((word) => (
                  <Badge key={word} variant="secondary">
                    {word}
                    <button
                      onClick={() => removeAllowedWord(word)}
                      className="ml-2"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
