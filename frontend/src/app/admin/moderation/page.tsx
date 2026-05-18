/**
 * Admin Moderation Page (v0.7.0)
 * AI-Powered Content Moderation Dashboard
 *
 * Requires the moderation plugin from the nChat bundle
 * (NEXT_PUBLIC_MODERATION_ENABLED=true). When absent, renders an upsell CTA.
 */

"use client";

import {
  Shield,
  BarChart3,
  Settings,
  ListChecks,
  ExternalLink,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModerationDashboard } from "@/components/admin/moderation/ModerationDashboard";
import { ModerationQueue } from "@/components/admin/moderation/ModerationQueue";
import { ModerationSettings } from "@/components/admin/moderation/ModerationSettings";
import { useAdminAccess } from "@/lib/admin/use-admin";
import { nchatBundle } from "@/lib/features/bundle-detect";

export default function ModerationPage() {
  const { canModerate } = useAdminAccess();

  // Bundle guard — moderation plugin required
  if (!nchatBundle.moderation) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">
            Moderation requires the nChat bundle
          </h2>
          <p className="mb-6 max-w-md text-center text-muted-foreground">
            AI-assisted moderation, auto-ban thresholds, and the moderation
            queue are part of the nChat bundle ($0.99/mo). Install the
            moderation plugin to enable these tools.
          </p>
          <div className="flex flex-col items-center gap-3">
            <a
              href="https://nself.org/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get nChat Bundle
              <ExternalLink className="h-4 w-4" />
            </a>
            <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              nself plugin install moderation &amp;&amp; nself build &amp;&amp;
              nself start
            </code>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!canModerate) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to access the moderation tools.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Content Moderation</h1>
              <p className="text-muted-foreground">
                AI-powered moderation system with advanced detection and
                analytics
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:inline-grid lg:w-auto">
            <TabsTrigger value="dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="queue">
              <ListChecks className="mr-2 h-4 w-4" />
              Queue
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <ModerationDashboard />
          </TabsContent>

          <TabsContent value="queue" className="space-y-6">
            <ModerationQueue />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ModerationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
