/**
 * AI Configuration Panel
 * Manage AI providers, models, API keys, rate limits, and budgets
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Save,
  Key,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import { logger } from "@/lib/logger";

// ============================================================================
// Component
// ============================================================================

export default function AIConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/ai/config");
      const json = await res.json();

      if (json.success) {
        setConfig(json.data);
      }
    } catch (error) {
      logger.error("Error fetching config:", error);
      toast.error("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const json = await res.json();

      if (json.success) {
        toast.success("Configuration saved successfully");
        setHasChanges(false);
      } else {
        toast.error(json.error || "Failed to save configuration");
      }
    } catch (error) {
      logger.error("Error saving config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    setConfig((prev: any) => {
      const newConfig = { ...prev };
      const keys = path.split(".");
      let current = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
    setHasChanges(true);
  };

  if (loading || !config) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Configuration
          </h1>
          <p className="text-muted-foreground">
            Manage AI providers, models, rate limits, and budgets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConfig}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={saveConfig}
            disabled={!hasChanges || saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Alert */}
      {hasChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Changes" to apply them.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* OpenAI Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>OpenAI</CardTitle>
                  <Switch
                    checked={config.openai.enabled}
                    onCheckedChange={(checked) =>
                      updateConfig("openai.enabled", checked)
                    }
                  />
                </div>
                <CardDescription>Configure OpenAI API settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="openai-key"
                      type="password"
                      value={config.openai.apiKey || ""}
                      placeholder="sk-..."
                      disabled
                    />
                    <Button variant="outline" size="icon">
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set via OPENAI_API_KEY environment variable
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-model">Default Model</Label>
                  <Select
                    value={config.openai.defaultModel}
                    onValueChange={(value) =>
                      updateConfig("openai.defaultModel", value)
                    }
                  >
                    <SelectTrigger id="openai-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">
                        GPT-3.5 Turbo
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-fallback">Fallback Model</Label>
                  <Select
                    value={config.openai.fallbackModel}
                    onValueChange={(value) =>
                      updateConfig("openai.fallbackModel", value)
                    }
                  >
                    <SelectTrigger id="openai-fallback">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5-turbo">
                        GPT-3.5 Turbo
                      </SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openai-timeout">Timeout (ms)</Label>
                    <Input
                      id="openai-timeout"
                      type="number"
                      value={config.openai.timeout}
                      onChange={(e) =>
                        updateConfig("openai.timeout", parseInt(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-retries">Max Retries</Label>
                    <Input
                      id="openai-retries"
                      type="number"
                      value={config.openai.maxRetries}
                      onChange={(e) =>
                        updateConfig(
                          "openai.maxRetries",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anthropic Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Anthropic (Claude)</CardTitle>
                  <Switch
                    checked={config.anthropic.enabled}
                    onCheckedChange={(checked) =>
                      updateConfig("anthropic.enabled", checked)
                    }
                  />
                </div>
                <CardDescription>
                  Configure Anthropic API settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="anthropic-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="anthropic-key"
                      type="password"
                      value={config.anthropic.apiKey || ""}
                      placeholder="sk-ant-..."
                      disabled
                    />
                    <Button variant="outline" size="icon">
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set via ANTHROPIC_API_KEY environment variable
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anthropic-model">Default Model</Label>
                  <Select
                    value={config.anthropic.defaultModel}
                    onValueChange={(value) =>
                      updateConfig("anthropic.defaultModel", value)
                    }
                  >
                    <SelectTrigger id="anthropic-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-5-sonnet-20241022">
                        Claude 3.5 Sonnet
                      </SelectItem>
                      <SelectItem value="claude-3-5-haiku-20241022">
                        Claude 3.5 Haiku
                      </SelectItem>
                      <SelectItem value="claude-3-opus-20240229">
                        Claude 3 Opus
                      </SelectItem>
                      <SelectItem value="claude-3-sonnet-20240229">
                        Claude 3 Sonnet
                      </SelectItem>
                      <SelectItem value="claude-3-haiku-20240307">
                        Claude 3 Haiku
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anthropic-fallback">Fallback Model</Label>
                  <Select
                    value={config.anthropic.fallbackModel}
                    onValueChange={(value) =>
                      updateConfig("anthropic.fallbackModel", value)
                    }
                  >
                    <SelectTrigger id="anthropic-fallback">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-haiku-20240307">
                        Claude 3 Haiku
                      </SelectItem>
                      <SelectItem value="claude-3-5-haiku-20241022">
                        Claude 3.5 Haiku
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="anthropic-timeout">Timeout (ms)</Label>
                    <Input
                      id="anthropic-timeout"
                      type="number"
                      value={config.anthropic.timeout}
                      onChange={(e) =>
                        updateConfig(
                          "anthropic.timeout",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="anthropic-retries">Max Retries</Label>
                    <Input
                      id="anthropic-retries"
                      type="number"
                      value={config.anthropic.maxRetries}
                      onChange={(e) =>
                        updateConfig(
                          "anthropic.maxRetries",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rate Limits Tab */}
        <TabsContent value="rate-limits" className="space-y-4">
          {Object.entries(config.rateLimits).map(
            ([endpoint, limits]: [string, any]) => (
              <Card key={endpoint}>
                <CardHeader>
                  <CardTitle className="capitalize">{endpoint}</CardTitle>
                  <CardDescription>
                    Configure rate limits for {endpoint} endpoints
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Per User</h4>
                      <div className="space-y-2">
                        <Label>Max Requests</Label>
                        <Input
                          type="number"
                          value={limits.userMaxRequests}
                          onChange={(e) =>
                            updateConfig(
                              `rateLimits.${endpoint}.userMaxRequests`,
                              parseInt(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Window (ms)</Label>
                        <Input
                          type="number"
                          value={limits.userWindowMs}
                          onChange={(e) =>
                            updateConfig(
                              `rateLimits.${endpoint}.userWindowMs`,
                              parseInt(e.target.value),
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Per Organization</h4>
                      <div className="space-y-2">
                        <Label>Max Requests</Label>
                        <Input
                          type="number"
                          value={limits.orgMaxRequests}
                          onChange={(e) =>
                            updateConfig(
                              `rateLimits.${endpoint}.orgMaxRequests`,
                              parseInt(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Window (ms)</Label>
                        <Input
                          type="number"
                          value={limits.orgWindowMs}
                          onChange={(e) =>
                            updateConfig(
                              `rateLimits.${endpoint}.orgWindowMs`,
                              parseInt(e.target.value),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </TabsContent>

        {/* Budgets Tab */}
        <TabsContent value="budgets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Limits</CardTitle>
              <CardDescription>
                Set spending limits to control AI costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="daily-limit">Daily Limit ($)</Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    step="0.01"
                    value={config.budgets.dailyLimit || ""}
                    onChange={(e) =>
                      updateConfig(
                        "budgets.dailyLimit",
                        parseFloat(e.target.value),
                      )
                    }
                    placeholder="100.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly-limit">Monthly Limit ($)</Label>
                  <Input
                    id="monthly-limit"
                    type="number"
                    step="0.01"
                    value={config.budgets.monthlyLimit || ""}
                    onChange={(e) =>
                      updateConfig(
                        "budgets.monthlyLimit",
                        parseFloat(e.target.value),
                      )
                    }
                    placeholder="1000.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Alert Thresholds (%)</Label>
                <div className="flex gap-2">
                  {config.budgets.alertThresholds.map(
                    (threshold: number, index: number) => (
                      <Badge key={index} variant="secondary">
                        {threshold}%
                      </Badge>
                    ),
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Alerts will be sent when spending reaches these percentages
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Response Cache</CardTitle>
                  <CardDescription>
                    Configure caching to reduce API costs
                  </CardDescription>
                </div>
                <Switch
                  checked={config.cache.enabled}
                  onCheckedChange={(checked) =>
                    updateConfig("cache.enabled", checked)
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Summarization TTL (seconds)</Label>
                  <Input
                    type="number"
                    value={config.cache.summarizationTtl}
                    onChange={(e) =>
                      updateConfig(
                        "cache.summarizationTtl",
                        parseInt(e.target.value),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Search TTL (seconds)</Label>
                  <Input
                    type="number"
                    value={config.cache.searchTtl}
                    onChange={(e) =>
                      updateConfig("cache.searchTtl", parseInt(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chat TTL (seconds)</Label>
                  <Input
                    type="number"
                    value={config.cache.chatTtl}
                    onChange={(e) =>
                      updateConfig("cache.chatTtl", parseInt(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Embeddings TTL (seconds)</Label>
                  <Input
                    type="number"
                    value={config.cache.embeddingsTtl}
                    onChange={(e) =>
                      updateConfig(
                        "cache.embeddingsTtl",
                        parseInt(e.target.value),
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium">System Status: Operational</p>
              <p className="text-sm text-muted-foreground">
                All AI providers and services are running normally
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
