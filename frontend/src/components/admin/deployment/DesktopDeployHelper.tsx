"use client";

/**
 * Desktop Deployment Helper Component
 *
 * Admin interface for managing desktop application deployments.
 * Provides tools for:
 * - Building desktop applications
 * - Configuring code signing
 * - Managing releases
 * - Monitoring deployment status
 */

import React, { useState } from "react";
import {
  Download,
  Upload,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Terminal,
  Key,
  Package,
  FileCode,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface BuildStatus {
  platform: "electron" | "tauri";
  target: "mac" | "win" | "linux" | "all";
  status: "idle" | "building" | "success" | "failed";
  progress: number;
  logs: string[];
  artifacts: string[];
  error?: string;
}

interface CodeSigningConfig {
  macos: {
    appleId: string;
    applePassword: string;
    teamId: string;
    signingIdentity: string;
  };
  windows: {
    certificatePath: string;
    certificatePassword: string;
  };
  linux: {
    gpgKeyId: string;
    gpgPassphrase: string;
  };
}

export default function DesktopDeployHelper() {
  const [activeTab, setActiveTab] = useState("overview");
  const [buildStatus, setBuildStatus] = useState<BuildStatus>({
    platform: "electron",
    target: "all",
    status: "idle",
    progress: 0,
    logs: [],
    artifacts: [],
  });

  const [signingConfig, setSigningConfig] = useState<CodeSigningConfig>({
    macos: {
      appleId: "",
      applePassword: "",
      teamId: "",
      signingIdentity: "",
    },
    windows: {
      certificatePath: "",
      certificatePassword: "",
    },
    linux: {
      gpgKeyId: "",
      gpgPassphrase: "",
    },
  });

  const [buildOptions, setBuildOptions] = useState({
    platform: "electron" as "electron" | "tauri",
    target: "all" as "mac" | "win" | "linux" | "all",
    environment: "production" as "development" | "staging" | "production",
    version: "",
    sign: true,
    publish: false,
    clean: false,
  });

  const [showLogs, setShowLogs] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview"]),
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleBuild = () => {
    setBuildStatus({
      ...buildStatus,
      status: "building",
      progress: 0,
      logs: ["Starting build process..."],
    });

    // Simulate build process
    const logMessages = [
      "Checking dependencies...",
      "Building Next.js frontend...",
      "Compiling TypeScript...",
      "Bundling application...",
      "Signing application...",
      "Creating installers...",
      "Build complete!",
    ];

    let progress = 0;
    logMessages.forEach((msg, index) => {
      setTimeout(
        () => {
          progress = ((index + 1) / logMessages.length) * 100;
          setBuildStatus((prev) => ({
            ...prev,
            progress,
            logs: [...prev.logs, msg],
            status: index === logMessages.length - 1 ? "success" : "building",
            artifacts:
              index === logMessages.length - 1
                ? [
                    "nchat-1.0.0-mac-x64.dmg",
                    "nchat-1.0.0-mac-arm64.dmg",
                    "nchat-1.0.0-win-x64.exe",
                    "nchat-1.0.0-linux-x64.AppImage",
                  ]
                : prev.artifacts,
          }));
        },
        (index + 1) * 1000,
      );
    });
  };

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
  };

  const getBuildCommand = () => {
    const script =
      buildOptions.platform === "electron"
        ? "./scripts/deploy-desktop-electron.sh"
        : "./scripts/deploy-desktop-tauri.sh";

    const args = [
      `--platform ${buildOptions.target}`,
      `--env ${buildOptions.environment}`,
      buildOptions.version ? `--version ${buildOptions.version}` : "",
      buildOptions.sign ? "" : "--no-sign",
      buildOptions.publish ? "" : "--no-publish",
      buildOptions.clean ? "--clean" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `${script} ${args}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Desktop Deployment</h1>
        <p className="mt-2 text-muted-foreground">
          Build, sign, and deploy nchat desktop applications for macOS, Windows,
          and Linux
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button
            onClick={handleBuild}
            disabled={buildStatus.status === "building"}
          >
            <Play className="mr-2 h-4 w-4" />
            Build Application
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Configure Signing
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Publish Release
          </Button>
          <Button variant="outline">
            <Terminal className="mr-2 h-4 w-4" />
            View Logs
          </Button>
        </CardContent>
      </Card>

      {/* Build Status */}
      {buildStatus.status !== "idle" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {buildStatus.status === "building" && (
                <Play className="h-5 w-5 animate-pulse" />
              )}
              {buildStatus.status === "success" && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {buildStatus.status === "failed" && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Build Status
            </CardTitle>
            <CardDescription>
              {buildOptions.platform.charAt(0).toUpperCase() +
                buildOptions.platform.slice(1)}{" "}
              build for {buildOptions.target}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(buildStatus.progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${buildStatus.progress}%` }}
                />
              </div>
            </div>

            {/* Logs */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
                className="mb-2"
              >
                {showLogs ? (
                  <ChevronDown className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                Build Logs
              </Button>
              {showLogs && (
                <div className="bg-muted/50 max-h-64 overflow-y-auto rounded-lg p-4 font-mono text-xs">
                  {buildStatus.logs.map((log, index) => (
                    <div key={index} className="text-muted-foreground">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Artifacts */}
            {buildStatus.artifacts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Build Artifacts</h4>
                <div className="grid gap-2">
                  {buildStatus.artifacts.map((artifact, index) => (
                    <div
                      key={index}
                      className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        <span className="font-mono text-sm">{artifact}</span>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="build">Build</TabsTrigger>
          <TabsTrigger value="signing">Code Signing</TabsTrigger>
          <TabsTrigger value="releases">Releases</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Support</CardTitle>
              <CardDescription>
                Desktop application frameworks and targets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Electron */}
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Electron</h4>
                    <Badge>Chromium + Node.js</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mature ecosystem with rich features. Bundle size ~150-200
                    MB.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">macOS (x64 + arm64)</Badge>
                    <Badge variant="outline">Windows (x64 + ia32)</Badge>
                    <Badge variant="outline">Linux (x64)</Badge>
                  </div>
                </div>

                {/* Tauri */}
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Tauri</h4>
                    <Badge>WebView + Rust</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Small bundle size and fast performance. Bundle size ~10-20
                    MB.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">macOS (universal)</Badge>
                    <Badge variant="outline">Windows (x64)</Badge>
                    <Badge variant="outline">Linux (x64)</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Electron Requirements */}
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Electron Requirements
                </h4>
                <ul className="ml-6 space-y-1 text-sm text-muted-foreground">
                  <li>• Node.js &gt;= 20.0.0</li>
                  <li>• npm &gt;= 9.0.0</li>
                  <li>• Git</li>
                  <li>• Xcode Command Line Tools (macOS)</li>
                </ul>
              </div>

              {/* Tauri Requirements */}
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Tauri Requirements
                </h4>
                <ul className="ml-6 space-y-1 text-sm text-muted-foreground">
                  <li>• Node.js &gt;= 20.0.0</li>
                  <li>• Rust &gt;= 1.70</li>
                  <li>• Cargo tauri-cli</li>
                  <li>• Platform-specific dependencies (see docs)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Build Tab */}
        <TabsContent value="build" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Build Configuration</CardTitle>
              <CardDescription>
                Configure build options and parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={buildOptions.platform}
                    onValueChange={(value: "electron" | "tauri") =>
                      setBuildOptions({ ...buildOptions, platform: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electron">Electron</SelectItem>
                      <SelectItem value="tauri">Tauri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target</Label>
                  <Select
                    value={buildOptions.target}
                    onValueChange={(value: "mac" | "win" | "linux" | "all") =>
                      setBuildOptions({ ...buildOptions, target: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="mac">macOS</SelectItem>
                      <SelectItem value="win">Windows</SelectItem>
                      <SelectItem value="linux">Linux</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select
                    value={buildOptions.environment}
                    onValueChange={(
                      value: "development" | "staging" | "production",
                    ) =>
                      setBuildOptions({ ...buildOptions, environment: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Version (optional)</Label>
                  <Input
                    placeholder="1.0.0"
                    value={buildOptions.version}
                    onChange={(e) =>
                      setBuildOptions({
                        ...buildOptions,
                        version: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Code Signing</Label>
                    <p className="text-sm text-muted-foreground">
                      Sign application with certificates
                    </p>
                  </div>
                  <Switch
                    checked={buildOptions.sign}
                    onCheckedChange={(checked) =>
                      setBuildOptions({ ...buildOptions, sign: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Publish Release</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload to GitHub Releases
                    </p>
                  </div>
                  <Switch
                    checked={buildOptions.publish}
                    onCheckedChange={(checked) =>
                      setBuildOptions({ ...buildOptions, publish: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Clean Build</Label>
                    <p className="text-sm text-muted-foreground">
                      Remove previous build artifacts
                    </p>
                  </div>
                  <Switch
                    checked={buildOptions.clean}
                    onCheckedChange={(checked) =>
                      setBuildOptions({ ...buildOptions, clean: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Build Command</Label>
                <div className="flex gap-2">
                  <code className="flex-1 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-sm">
                    {getBuildCommand()}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyCommand(getBuildCommand())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Ensure all required dependencies are installed and code
                  signing certificates are configured before building.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Code Signing Tab */}
        <TabsContent value="signing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Code Signing Configuration
              </CardTitle>
              <CardDescription>
                Configure certificates and credentials for code signing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* macOS Signing */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">macOS Code Signing</h4>
                  <Badge>Apple Developer</Badge>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label>Apple ID</Label>
                    <Input
                      type="email"
                      placeholder="your-apple-id@example.com"
                      value={signingConfig.macos.appleId}
                      onChange={(e) =>
                        setSigningConfig({
                          ...signingConfig,
                          macos: {
                            ...signingConfig.macos,
                            appleId: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>App-Specific Password</Label>
                    <Input
                      type="password"
                      placeholder="xxxx-xxxx-xxxx-xxxx"
                      value={signingConfig.macos.applePassword}
                      onChange={(e) =>
                        setSigningConfig({
                          ...signingConfig,
                          macos: {
                            ...signingConfig.macos,
                            applePassword: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Team ID</Label>
                    <Input
                      placeholder="TEAM123456"
                      value={signingConfig.macos.teamId}
                      onChange={(e) =>
                        setSigningConfig({
                          ...signingConfig,
                          macos: {
                            ...signingConfig.macos,
                            teamId: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Signing Identity</Label>
                    <Input
                      placeholder="Developer ID Application: Your Name (TEAM123456)"
                      value={signingConfig.macos.signingIdentity}
                      onChange={(e) =>
                        setSigningConfig({
                          ...signingConfig,
                          macos: {
                            ...signingConfig.macos,
                            signingIdentity: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Windows Signing */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Windows Code Signing</h4>
                  <Badge>Code Signing Certificate</Badge>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label>Certificate Path</Label>
                    <Input
                      placeholder="/path/to/certificate.pfx"
                      value={signingConfig.windows.certificatePath}
                      onChange={(e) =>
                        setSigningConfig({
                          ...signingConfig,
                          windows: {
                            ...signingConfig.windows,
                            certificatePath: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Certificate Password</Label>
                    <Input
                      type="password"
                      placeholder="certificate-password"
                      value={signingConfig.windows.certificatePassword}
                      onChange={(e) =>
                        setSigningConfig({
                          ...signingConfig,
                          windows: {
                            ...signingConfig.windows,
                            certificatePassword: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Linux Signing */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Linux Package Signing</h4>
                  <Badge variant="outline">Optional</Badge>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label>GPG Key ID</Label>
                    <Input
                      placeholder="your-gpg-key-id"
                      value={signingConfig.linux.gpgKeyId}
                      onChange={(e) =>
                        setSigningConfig({
                          ...signingConfig,
                          linux: {
                            ...signingConfig.linux,
                            gpgKeyId: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GPG Passphrase</Label>
                    <Input
                      type="password"
                      placeholder="gpg-passphrase"
                      value={signingConfig.linux.gpgPassphrase}
                      onChange={(e) =>
                        setSigningConfig({
                          ...signingConfig,
                          linux: {
                            ...signingConfig.linux,
                            gpgPassphrase: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button>Save Configuration</Button>
                <Button variant="outline">Test Signing</Button>
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Documentation
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Security Notice</AlertTitle>
                <AlertDescription>
                  Never commit certificates or passwords to version control. Use
                  environment variables or secure secrets management.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Releases Tab */}
        <TabsContent value="releases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Release Management</CardTitle>
              <CardDescription>
                View and manage desktop application releases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Coming Soon</AlertTitle>
                <AlertDescription>
                  Release management features will be available in a future
                  update. For now, manage releases through GitHub Releases.
                </AlertDescription>
              </Alert>

              <div className="mt-4">
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on GitHub
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Documentation Links */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="justify-start">
              <FileCode className="mr-2 h-4 w-4" />
              Desktop Deployment Guide
            </Button>
            <Button variant="outline" className="justify-start">
              <Key className="mr-2 h-4 w-4" />
              Code Signing Guide
            </Button>
            <Button variant="outline" className="justify-start">
              <Package className="mr-2 h-4 w-4" />
              Build Scripts Reference
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
