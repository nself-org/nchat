"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Webhook as WebhookIcon, AlertCircle, Settings2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import {
  WebhookList,
  CreateWebhookModal,
  WebhookSettingsModal,
  WebhookDeliveries,
  WebhookTestModal,
} from "@/components/webhooks";
import {
  Webhook,
  WebhookDelivery,
  CreateWebhookFormData,
  UpdateWebhookFormData,
  TestWebhookFormData,
} from "@/lib/webhooks";

// ============================================================================
// MOCK DATA (for development/demo)
// ============================================================================

const mockChannels = [
  { id: "1", name: "general", slug: "general", is_private: false },
  { id: "2", name: "announcements", slug: "announcements", is_private: false },
  { id: "3", name: "dev-team", slug: "dev-team", is_private: true },
  { id: "4", name: "alerts", slug: "alerts", is_private: false },
];

const mockWebhooks: Webhook[] = [
  {
    id: "1",
    name: "GitHub Notifications",
    avatar_url:
      "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    channel_id: "2",
    token: "abc123xyz789",
    url: "https://api.nchat.local/webhooks/1/abc123xyz789",
    status: "active",
    created_by: "owner",
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-15T14:30:00Z",
    last_used_at: "2024-01-20T09:15:00Z",
    channel: { id: "2", name: "announcements", slug: "announcements" },
    creator: {
      id: "owner",
      username: "owner",
      display_name: "Workspace Owner",
    },
  },
  {
    id: "2",
    name: "Server Alerts",
    avatar_url: undefined,
    channel_id: "4",
    token: "def456uvw012",
    url: "https://api.nchat.local/webhooks/2/def456uvw012",
    status: "active",
    created_by: "admin",
    created_at: "2024-01-12T08:00:00Z",
    updated_at: "2024-01-12T08:00:00Z",
    last_used_at: "2024-01-19T22:45:00Z",
    channel: { id: "4", name: "alerts", slug: "alerts" },
    creator: { id: "admin", username: "admin", display_name: "Admin User" },
  },
  {
    id: "3",
    name: "CI/CD Pipeline",
    avatar_url: undefined,
    channel_id: "3",
    token: "ghi789rst345",
    url: "https://api.nchat.local/webhooks/3/ghi789rst345",
    status: "paused",
    created_by: "owner",
    created_at: "2024-01-08T12:00:00Z",
    updated_at: "2024-01-18T16:00:00Z",
    last_used_at: "2024-01-17T11:30:00Z",
    channel: { id: "3", name: "dev-team", slug: "dev-team" },
    creator: {
      id: "owner",
      username: "owner",
      display_name: "Workspace Owner",
    },
  },
];

const mockDeliveries: WebhookDelivery[] = [
  {
    id: "d1",
    webhook_id: "1",
    status: "success",
    request_body: JSON.stringify({ content: "New commit pushed to main" }),
    response_status: 200,
    response_body: '{"success": true}',
    attempt_count: 1,
    created_at: "2024-01-20T09:15:00Z",
    delivered_at: "2024-01-20T09:15:01Z",
  },
  {
    id: "d2",
    webhook_id: "1",
    status: "success",
    request_body: JSON.stringify({ content: "Pull request merged" }),
    response_status: 200,
    response_body: '{"success": true}',
    attempt_count: 1,
    created_at: "2024-01-20T08:30:00Z",
    delivered_at: "2024-01-20T08:30:01Z",
  },
  {
    id: "d3",
    webhook_id: "2",
    status: "failed",
    request_body: JSON.stringify({ content: "CPU alert: 95%" }),
    response_status: 500,
    error_message: "Internal server error",
    attempt_count: 3,
    created_at: "2024-01-19T22:45:00Z",
    next_retry_at: "2024-01-19T23:00:00Z",
  },
  {
    id: "d4",
    webhook_id: "1",
    status: "success",
    request_body: JSON.stringify({ content: "Issue closed #123" }),
    response_status: 200,
    response_body: '{"success": true}',
    attempt_count: 1,
    created_at: "2024-01-19T16:00:00Z",
    delivered_at: "2024-01-19T16:00:02Z",
  },
  {
    id: "d5",
    webhook_id: "2",
    status: "success",
    request_body: JSON.stringify({ content: "Memory usage normal" }),
    response_status: 200,
    response_body: '{"success": true}',
    attempt_count: 1,
    created_at: "2024-01-19T14:00:00Z",
    delivered_at: "2024-01-19T14:00:01Z",
  },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function WebhooksManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const { config } = useAppConfig();
  const router = useRouter();

  // Feature flag check
  const webhooksEnabled = config?.integrations?.webhooks?.enabled ?? true; // Default to true for demo

  // State
  const [webhooks, setWebhooks] = useState<Webhook[]>(mockWebhooks);
  const [deliveries, setDeliveries] =
    useState<WebhookDelivery[]>(mockDeliveries);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [webhookToEdit, setWebhookToEdit] = useState<Webhook | null>(null);
  const [webhookToTest, setWebhookToTest] = useState<Webhook | null>(null);

  // Authorization check
  useEffect(() => {
    if (!authLoading && (!user || !["owner", "admin"].includes(user.role))) {
      router.push("/chat");
    }
  }, [user, authLoading, router]);

  // Handlers
  const handleCreateWebhook = useCallback(
    async (data: CreateWebhookFormData): Promise<Webhook | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const newWebhook: Webhook = {
          id: `wh_${Date.now()}`,
          name: data.name,
          avatar_url: data.avatarUrl,
          channel_id: data.channelId,
          token: `tok_${Math.random().toString(36).slice(2)}`,
          url: `https://api.nchat.local/webhooks/${Date.now()}/${Math.random().toString(36).slice(2)}`,
          status: "active",
          created_by: user?.id || "unknown",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          channel: mockChannels.find((c) => c.id === data.channelId),
          creator: {
            id: user?.id || "unknown",
            username: user?.username || "unknown",
            display_name: user?.displayName || "Unknown",
          },
        };

        setWebhooks((prev) => [newWebhook, ...prev]);
        setIsLoading(false);
        return newWebhook;
      } catch (_err) {
        setError("Failed to create webhook");
        setIsLoading(false);
        return null;
      }
    },
    [user],
  );

  const handleUpdateWebhook = useCallback(
    async (data: UpdateWebhookFormData): Promise<Webhook | null> => {
      setIsLoading(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const updatedChannel = data.channelId
          ? mockChannels.find((c) => c.id === data.channelId)
          : undefined;

        setWebhooks((prev) =>
          prev.map((w) =>
            w.id === data.id
              ? {
                  ...w,
                  name: data.name ?? w.name,
                  channel_id: data.channelId ?? w.channel_id,
                  avatar_url: data.avatarUrl ?? w.avatar_url,
                  status: data.status ?? w.status,
                  channel: updatedChannel ?? w.channel,
                  updated_at: new Date().toISOString(),
                }
              : w,
          ),
        );

        setIsLoading(false);
        return webhooks.find((w) => w.id === data.id) || null;
      } catch (_err) {
        setError("Failed to update webhook");
        setIsLoading(false);
        return null;
      }
    },
    [webhooks],
  );

  const handleDeleteWebhook = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
        setIsLoading(false);
        return true;
      } catch (_err) {
        setError("Failed to delete webhook");
        setIsLoading(false);
        return false;
      }
    },
    [],
  );

  const handleRegenerateUrl = useCallback(
    async (id: string): Promise<Webhook | null> => {
      setIsLoading(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const newToken = `tok_${Math.random().toString(36).slice(2)}`;
        const newUrl = `https://api.nchat.local/webhooks/${id}/${newToken}`;

        setWebhooks((prev) =>
          prev.map((w) =>
            w.id === id
              ? {
                  ...w,
                  token: newToken,
                  url: newUrl,
                  updated_at: new Date().toISOString(),
                }
              : w,
          ),
        );

        setIsLoading(false);
        return webhooks.find((w) => w.id === id) || null;
      } catch (_err) {
        setError("Failed to regenerate URL");
        setIsLoading(false);
        return null;
      }
    },
    [webhooks],
  );

  const handleToggleStatus = useCallback(async (webhook: Webhook) => {
    const newStatus = webhook.status === "active" ? "paused" : "active";
    setWebhooks((prev) =>
      prev.map((w) =>
        w.id === webhook.id
          ? { ...w, status: newStatus, updated_at: new Date().toISOString() }
          : w,
      ),
    );
  }, []);

  const handleTestWebhook = useCallback(
    async (data: TestWebhookFormData): Promise<WebhookDelivery | null> => {
      setIsLoading(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const newDelivery: WebhookDelivery = {
          id: `d_${Date.now()}`,
          webhook_id: data.webhookId,
          status: "success",
          request_body: data.content,
          response_status: 200,
          response_body: '{"success": true, "message_id": "msg_123"}',
          attempt_count: 1,
          created_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
        };

        setDeliveries((prev) => [newDelivery, ...prev]);
        setIsLoading(false);
        return newDelivery;
      } catch (_err) {
        setError("Failed to send test");
        setIsLoading(false);
        return null;
      }
    },
    [],
  );

  const handleRetryDelivery = useCallback(async (deliveryId: string) => {
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId ? { ...d, status: "retrying" as const } : d,
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: "success" as const,
              response_status: 200,
              response_body: '{"success": true}',
              error_message: undefined,
              delivered_at: new Date().toISOString(),
              attempt_count: d.attempt_count + 1,
            }
          : d,
      ),
    );
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  // Loading state
  if (authLoading || !user || !["owner", "admin"].includes(user.role)) {
    return null;
  }

  // Feature disabled state
  if (!webhooksEnabled) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <WebhookIcon className="text-muted-foreground/50 h-16 w-16" />
          <h2 className="mt-4 text-2xl font-bold">Webhooks Disabled</h2>
          <p className="mt-2 text-center text-muted-foreground">
            The webhooks feature is currently disabled. Enable it in your app
            configuration to start using webhooks.
          </p>
          <Button className="mt-6" onClick={() => router.push("/admin/config")}>
            <Settings2 className="mr-2 h-4 w-4" />
            Go to Configuration
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Stats
  const activeCount = webhooks.filter((w) => w.status === "active").length;
  const totalDeliveries = deliveries.length;
  const failedDeliveries = deliveries.filter(
    (d) => d.status === "failed",
  ).length;
  const successRate =
    totalDeliveries > 0
      ? Math.round(
          ((totalDeliveries - failedDeliveries) / totalDeliveries) * 100,
        )
      : 100;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Webhooks</h1>
            <p className="text-muted-foreground">
              Manage webhooks for external integrations
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Webhooks
              </CardTitle>
              <WebhookIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{webhooks.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeCount} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Deliveries
              </CardTitle>
              <Badge variant="outline">{totalDeliveries}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDeliveries}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
              <Badge variant={successRate >= 95 ? "default" : "destructive"}>
                {successRate}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
              <p className="text-xs text-muted-foreground">
                {failedDeliveries} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Failed Deliveries
              </CardTitle>
              {failedDeliveries > 0 && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{failedDeliveries}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="webhooks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="deliveries">Recent Deliveries</TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="space-y-4">
            <WebhookList
              webhooks={webhooks}
              isLoading={isLoading}
              error={error}
              selectedWebhook={selectedWebhook}
              channels={mockChannels}
              onCreateNew={() => setCreateModalOpen(true)}
              onEdit={(webhook) => {
                setWebhookToEdit(webhook);
                setSettingsModalOpen(true);
              }}
              onDelete={(webhook) => handleDeleteWebhook(webhook.id)}
              onTest={(webhook) => {
                setWebhookToTest(webhook);
                setTestModalOpen(true);
              }}
              onToggleStatus={handleToggleStatus}
              onSelect={setSelectedWebhook}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="deliveries" className="space-y-4">
            <WebhookDeliveries
              deliveries={deliveries}
              isLoading={isLoading}
              error={error}
              onRetry={handleRetryDelivery}
              onRefresh={handleRefresh}
              maxHeight="600px"
            />
          </TabsContent>
        </Tabs>

        {/* Create Webhook Modal */}
        <CreateWebhookModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          channels={mockChannels}
          onSubmit={handleCreateWebhook}
          isLoading={isLoading}
          error={error}
        />

        {/* Edit Webhook Modal */}
        <WebhookSettingsModal
          open={settingsModalOpen}
          onOpenChange={setSettingsModalOpen}
          webhook={webhookToEdit}
          channels={mockChannels}
          onUpdate={handleUpdateWebhook}
          onRegenerateUrl={handleRegenerateUrl}
          onDelete={async (id) => {
            const success = await handleDeleteWebhook(id);
            if (success) {
              setSettingsModalOpen(false);
              setWebhookToEdit(null);
            }
            return success;
          }}
          isLoading={isLoading}
          error={error}
        />

        {/* Test Webhook Modal */}
        <WebhookTestModal
          open={testModalOpen}
          onOpenChange={setTestModalOpen}
          webhook={webhookToTest}
          onTest={handleTestWebhook}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </AdminLayout>
  );
}
