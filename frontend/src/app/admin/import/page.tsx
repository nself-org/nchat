"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  ArrowLeft,
  FileJson,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImportWizard } from "@/components/import-export/import-wizard";
import { SlackImport } from "@/components/import-export/slack-import";
import { DiscordImport } from "@/components/import-export/discord-import";

// ============================================================================
// TYPES
// ============================================================================

type ImportMode = "wizard" | "slack" | "discord" | null;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ImportPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<ImportMode>(null);
  const [importComplete, setImportComplete] = React.useState(false);
  const [importStats, setImportStats] = React.useState<Record<string, number>>(
    {},
  );

  const handleImportComplete = (result: {
    success: boolean;
    stats: Record<string, number>;
  }) => {
    if (result.success) {
      setImportComplete(true);
      setImportStats(result.stats);
    }
  };

  const handleCancel = () => {
    setMode(null);
  };

  const handleStartOver = () => {
    setMode(null);
    setImportComplete(false);
    setImportStats({});
  };

  // Show import complete screen
  if (importComplete) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="pt-8">
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Import Complete!</h2>
                <p className="mt-2 text-muted-foreground">
                  Your data has been successfully imported into nchat.
                </p>
              </div>

              {Object.keys(importStats).length > 0 && (
                <div className="mx-auto grid max-w-md grid-cols-3 gap-4">
                  {importStats.usersImported !== undefined && (
                    <div className="rounded-lg bg-muted p-4 text-center">
                      <p className="text-2xl font-bold">
                        {importStats.usersImported}
                      </p>
                      <p className="text-sm text-muted-foreground">Users</p>
                    </div>
                  )}
                  {importStats.channelsImported !== undefined && (
                    <div className="rounded-lg bg-muted p-4 text-center">
                      <p className="text-2xl font-bold">
                        {importStats.channelsImported}
                      </p>
                      <p className="text-sm text-muted-foreground">Channels</p>
                    </div>
                  )}
                  {importStats.messagesImported !== undefined && (
                    <div className="rounded-lg bg-muted p-4 text-center">
                      <p className="text-2xl font-bold">
                        {importStats.messagesImported}
                      </p>
                      <p className="text-sm text-muted-foreground">Messages</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleStartOver}>
                  Import More Data
                </Button>
                <Button onClick={() => router.push("/chat")}>Go to Chat</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show specific import mode
  if (mode) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Import Options
          </Button>
        </div>

        {mode === "wizard" && (
          <ImportWizard
            onComplete={handleImportComplete}
            onCancel={handleCancel}
          />
        )}
        {mode === "slack" && (
          <SlackImport
            onImportComplete={handleImportComplete}
            onCancel={handleCancel}
          />
        )}
        {mode === "discord" && (
          <DiscordImport
            onImportComplete={handleImportComplete}
            onCancel={handleCancel}
          />
        )}
      </div>
    );
  }

  // Show import selection screen
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground"
          >
            Admin
          </Link>
          <span className="text-muted-foreground">/</span>
          <span>Import</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 rounded-lg p-3">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Import Data</h1>
            <p className="text-muted-foreground">
              Import users, channels, and messages from external sources
            </p>
          </div>
        </div>
      </div>

      {/* Import Options */}
      <Tabs defaultValue="quick" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick">Quick Import</TabsTrigger>
          <TabsTrigger value="wizard">Import Wizard</TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-4">
          <Alert>
            <MessageSquare className="h-4 w-4" />
            <AlertTitle>Quick Import</AlertTitle>
            <AlertDescription>
              Choose a platform-specific import option for a streamlined
              experience. These imports are optimized for their respective
              platforms and handle data mapping automatically.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Slack Import */}
            <Card
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => setMode("slack")}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-[#4A154B] p-3">
                    <svg
                      className="h-8 w-8 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Import from Slack</CardTitle>
                    <CardDescription>
                      Import your Slack workspace export
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>- Users and profiles</li>
                  <li>- Public and private channels</li>
                  <li>- Messages and threads</li>
                  <li>- File attachments</li>
                  <li>- Emoji reactions</li>
                </ul>
              </CardContent>
            </Card>

            {/* Discord Import */}
            <Card
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => setMode("discord")}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-[#5865F2] p-3">
                    <svg
                      className="h-8 w-8 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Import from Discord</CardTitle>
                    <CardDescription>
                      Import your Discord server export
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>- Server members</li>
                  <li>- Text channels</li>
                  <li>- Messages and threads</li>
                  <li>- File attachments</li>
                  <li>- Reactions and embeds</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="wizard" className="space-y-4">
          <Alert>
            <FileJson className="h-4 w-4" />
            <AlertTitle>Import Wizard</AlertTitle>
            <AlertDescription>
              Use the step-by-step import wizard for more control over the
              import process. This option supports any source and allows you to
              configure field mappings manually.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Step-by-Step Import</CardTitle>
              <CardDescription>
                The import wizard guides you through the entire import process:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="mb-6 list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                <li>
                  Select your import source (Slack, Discord, or JSON file)
                </li>
                <li>Upload your export file</li>
                <li>Configure field mappings</li>
                <li>Preview the data that will be imported</li>
                <li>Complete the import</li>
              </ol>
              <Button onClick={() => setMode("wizard")}>
                Start Import Wizard
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium">Slack Export</h4>
              <p className="text-muted-foreground">
                Export your Slack workspace from Settings {">"} Workspace
                Settings {">"} Import/Export Data. Download the ZIP file and
                upload it here.
              </p>
            </div>
            <div>
              <h4 className="mb-2 font-medium">Discord Export</h4>
              <p className="text-muted-foreground">
                Use DiscordChatExporter to export your server. Export channels
                as JSON format and upload them here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
