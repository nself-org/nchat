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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  Upload,
  Smartphone,
  Apple,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  FileText,
  HelpCircle,
} from "lucide-react";

interface DeploymentStatus {
  platform: "ios" | "android";
  status:
    | "not-started"
    | "building"
    | "uploading"
    | "processing"
    | "complete"
    | "error";
  progress: number;
  message: string;
  version?: string;
  buildNumber?: string;
  url?: string;
  error?: string;
}

interface MobileDeployHelperProps {
  onDeploy?: (platform: "ios" | "android", track: string) => Promise<void>;
  className?: string;
}

export function MobileDeployHelper({
  onDeploy,
  className,
}: MobileDeployHelperProps) {
  const [iosStatus, setIosStatus] = useState<DeploymentStatus>({
    platform: "ios",
    status: "not-started",
    progress: 0,
    message: "Ready to deploy",
  });

  const [androidStatus, setAndroidStatus] = useState<DeploymentStatus>({
    platform: "android",
    status: "not-started",
    progress: 0,
    message: "Ready to deploy",
  });

  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Simulate checking deployment status on mount
  useEffect(() => {
    checkDeploymentStatus();
  }, []);

  const checkDeploymentStatus = async () => {
    try {
      // In a real implementation, this would check actual deployment status
      // from your CI/CD system or deployment tracking service
      const response = await fetch("/api/admin/deployment/status");
      if (response.ok) {
        const data = await response.json();
        if (data.ios) setIosStatus(data.ios);
        if (data.android) setAndroidStatus(data.android);
      }
    } catch (error) {
      // Silently fail - deployment status is optional
    }
  };

  const handleDeploy = async (platform: "ios" | "android", track: string) => {
    const setStatus = platform === "ios" ? setIosStatus : setAndroidStatus;

    setStatus({
      platform,
      status: "building",
      progress: 10,
      message: "Building application...",
    });

    try {
      if (onDeploy) {
        await onDeploy(platform, track);
      }

      // Simulate deployment progress
      setStatus({
        platform,
        status: "uploading",
        progress: 50,
        message: "Uploading to store...",
      });

      // This would be replaced with actual deployment logic
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setStatus({
        platform,
        status: "processing",
        progress: 80,
        message: "Processing upload...",
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      setStatus({
        platform,
        status: "complete",
        progress: 100,
        message: "Deployment complete!",
        version: "1.0.0",
        buildNumber: Date.now().toString(),
      });
    } catch (error) {
      setStatus({
        platform,
        status: "error",
        progress: 0,
        message: "Deployment failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusIcon = (status: DeploymentStatus["status"]) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "building":
      case "uploading":
      case "processing":
        return <Clock className="h-5 w-5 animate-pulse text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: DeploymentStatus["status"]) => {
    const variants: Record<
      DeploymentStatus["status"],
      "default" | "secondary" | "destructive" | "outline"
    > = {
      "not-started": "secondary",
      building: "default",
      uploading: "default",
      processing: "default",
      complete: "default",
      error: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.replace("-", " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ios">iOS</TabsTrigger>
          <TabsTrigger value="android">Android</TabsTrigger>
          <TabsTrigger value="guides">Guides</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mobile App Deployment</CardTitle>
              <CardDescription>
                Deploy your mobile applications to App Store and Google Play
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* iOS Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Apple className="h-5 w-5" />
                    <h3 className="font-semibold">iOS App Store</h3>
                  </div>
                  {getStatusBadge(iosStatus.status)}
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-4">
                  {getStatusIcon(iosStatus.status)}
                  <div className="flex-1 space-y-2">
                    <p className="text-sm">{iosStatus.message}</p>
                    {iosStatus.status !== "not-started" &&
                      iosStatus.status !== "complete" &&
                      iosStatus.status !== "error" && (
                        <Progress value={iosStatus.progress} className="h-2" />
                      )}
                    {iosStatus.version && (
                      <p className="text-xs text-muted-foreground">
                        Version: {iosStatus.version} ({iosStatus.buildNumber})
                      </p>
                    )}
                    {iosStatus.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{iosStatus.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDeploy("ios", "testflight")}
                    disabled={
                      iosStatus.status === "building" ||
                      iosStatus.status === "uploading" ||
                      iosStatus.status === "processing"
                    }
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Deploy to TestFlight
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDeploy("ios", "production")}
                    disabled={
                      iosStatus.status === "building" ||
                      iosStatus.status === "uploading" ||
                      iosStatus.status === "processing"
                    }
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Deploy to App Store
                  </Button>
                </div>
              </div>

              {/* Android Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5" />
                    <h3 className="font-semibold">Google Play Store</h3>
                  </div>
                  {getStatusBadge(androidStatus.status)}
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-4">
                  {getStatusIcon(androidStatus.status)}
                  <div className="flex-1 space-y-2">
                    <p className="text-sm">{androidStatus.message}</p>
                    {androidStatus.status !== "not-started" &&
                      androidStatus.status !== "complete" &&
                      androidStatus.status !== "error" && (
                        <Progress
                          value={androidStatus.progress}
                          className="h-2"
                        />
                      )}
                    {androidStatus.version && (
                      <p className="text-xs text-muted-foreground">
                        Version: {androidStatus.version} (
                        {androidStatus.buildNumber})
                      </p>
                    )}
                    {androidStatus.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {androidStatus.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDeploy("android", "internal")}
                    disabled={
                      androidStatus.status === "building" ||
                      androidStatus.status === "uploading" ||
                      androidStatus.status === "processing"
                    }
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Deploy to Internal Testing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDeploy("android", "beta")}
                    disabled={
                      androidStatus.status === "building" ||
                      androidStatus.status === "uploading" ||
                      androidStatus.status === "processing"
                    }
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Deploy to Beta
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <a
                  href="https://appstoreconnect.apple.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open App Store Connect
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <a
                  href="https://play.google.com/console"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Google Play Console
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveTab("guides")}
              >
                <FileText className="mr-2 h-4 w-4" />
                View Deployment Guides
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* iOS Tab */}
        <TabsContent value="ios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>iOS Deployment</CardTitle>
              <CardDescription>
                Deploy to TestFlight or App Store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prerequisites */}
              <div className="space-y-3">
                <h3 className="font-semibold">Prerequisites</h3>
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Apple Developer Account ($99/year)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>App created in App Store Connect</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Xcode installed on macOS</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>App-specific password generated</span>
                  </div>
                </div>
              </div>

              {/* Deployment Command */}
              <div className="space-y-3">
                <h3 className="font-semibold">Deployment Command</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border bg-muted p-3">
                    <code className="text-sm">
                      ./scripts/deploy-mobile-ios.sh --testflight
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          "./scripts/deploy-mobile-ios.sh --testflight",
                          "ios-testflight",
                        )
                      }
                    >
                      {copied === "ios-testflight" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-muted p-3">
                    <code className="text-sm">
                      ./scripts/deploy-mobile-ios.sh --production
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          "./scripts/deploy-mobile-ios.sh --production",
                          "ios-production",
                        )
                      }
                    >
                      {copied === "ios-production" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="space-y-3">
                <h3 className="font-semibold">
                  Required Environment Variables
                </h3>
                <div className="space-y-2">
                  {[
                    { key: "APPLE_TEAM_ID", description: "Your Apple Team ID" },
                    { key: "APPLE_ID", description: "Your Apple ID email" },
                    {
                      key: "APP_SPECIFIC_PASSWORD",
                      description: "App-specific password",
                    },
                  ].map(({ key, description }) => (
                    <div key={key} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-semibold">
                            {key}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {description}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(`export ${key}=""`, key)
                          }
                        >
                          {copied === key ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Steps */}
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Next Steps</AlertTitle>
                <AlertDescription>
                  After deployment, check App Store Connect for processing
                  status (10-30 minutes). Then configure TestFlight or submit
                  for App Review.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Android Tab */}
        <TabsContent value="android" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Android Deployment</CardTitle>
              <CardDescription>
                Deploy to Google Play testing tracks or production
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prerequisites */}
              <div className="space-y-3">
                <h3 className="font-semibold">Prerequisites</h3>
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Google Play Developer Account ($25 one-time)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>App created in Play Console</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Release keystore created</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Android SDK and build tools installed</span>
                  </div>
                </div>
              </div>

              {/* Deployment Commands */}
              <div className="space-y-3">
                <h3 className="font-semibold">Deployment Commands</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border bg-muted p-3">
                    <code className="text-sm">
                      ./scripts/deploy-mobile-android.sh --internal
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          "./scripts/deploy-mobile-android.sh --internal",
                          "android-internal",
                        )
                      }
                    >
                      {copied === "android-internal" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-muted p-3">
                    <code className="text-sm">
                      ./scripts/deploy-mobile-android.sh --beta
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          "./scripts/deploy-mobile-android.sh --beta",
                          "android-beta",
                        )
                      }
                    >
                      {copied === "android-beta" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-muted p-3">
                    <code className="text-sm">
                      ./scripts/deploy-mobile-android.sh --production
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          "./scripts/deploy-mobile-android.sh --production",
                          "android-production",
                        )
                      }
                    >
                      {copied === "android-production" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="space-y-3">
                <h3 className="font-semibold">
                  Required Environment Variables
                </h3>
                <div className="space-y-2">
                  {[
                    {
                      key: "ANDROID_KEYSTORE_PATH",
                      description: "Path to release keystore",
                    },
                    {
                      key: "ANDROID_KEYSTORE_PASSWORD",
                      description: "Keystore password",
                    },
                    { key: "ANDROID_KEY_ALIAS", description: "Key alias name" },
                    {
                      key: "ANDROID_KEY_PASSWORD",
                      description: "Key password",
                    },
                  ].map(({ key, description }) => (
                    <div key={key} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-semibold">
                            {key}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {description}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(`export ${key}=""`, key)
                          }
                        >
                          {copied === key ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Steps */}
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Next Steps</AlertTitle>
                <AlertDescription>
                  After building, manually upload the AAB file to Google Play
                  Console. Internal testing is available immediately, Beta
                  requires Pre-launch report (1-2 hours).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guides Tab */}
        <TabsContent value="guides" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Guides</CardTitle>
              <CardDescription>
                Comprehensive guides and troubleshooting resources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                asChild
              >
                <a href="/docs/guides/deployment/mobile-deployment.md">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Complete Mobile Deployment Guide
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                asChild
              >
                <a href="/docs/guides/deployment/mobile-deployment-troubleshooting.md">
                  <span className="flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Troubleshooting Guide
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                asChild
              >
                <a
                  href="https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    iOS App Distribution Guide
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                asChild
              >
                <a
                  href="https://developer.android.com/distribute/best-practices/launch/launch-checklist"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Google Play Launch Checklist
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Common Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  Create iOS Release Keystore
                </h4>
                <div className="flex items-center justify-between rounded-lg border bg-muted p-3">
                  <code className="text-xs">
                    Managed by Xcode automatically
                  </code>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  Create Android Release Keystore
                </h4>
                <div className="flex items-center justify-between rounded-lg border bg-muted p-3">
                  <code className="text-xs">
                    keytool -genkey -v -keystore release.keystore -alias
                    upload-key -keyalg RSA -keysize 2048 -validity 10000
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(
                        "keytool -genkey -v -keystore release.keystore -alias upload-key -keyalg RSA -keysize 2048 -validity 10000",
                        "keytool",
                      )
                    }
                  >
                    {copied === "keytool" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
