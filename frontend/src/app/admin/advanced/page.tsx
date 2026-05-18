/**
 * Advanced Admin Dashboard Page
 *
 * Comprehensive admin dashboard featuring:
 * - Bulk operations for users and channels
 * - Automation rules management
 * - System health monitoring
 * - Enhanced audit logs
 * - Real-time analytics
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Zap,
  Users,
  Hash,
  FileText,
  Activity,
  Settings,
  ChevronRight,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

// Import our new components
import { BulkUserOperations } from "@/components/admin/bulk/BulkUserOperations";
import { BulkChannelOperations } from "@/components/admin/bulk/BulkChannelOperations";
import { AutomationManager } from "@/components/admin/automation/AutomationManager";
import { SystemHealthDashboard } from "@/components/admin/monitoring/SystemHealthDashboard";
import { EnhancedAuditLog } from "@/components/admin/audit/EnhancedAuditLog";

// Mock data for demonstration
const mockUsers = [
  {
    id: "1",
    username: "alice",
    displayName: "Alice Johnson",
    email: "alice@example.com",
    role: { id: "member", name: "Member", permissions: [] },
    isActive: true,
    isBanned: false,
    createdAt: "2024-01-15T10:00:00Z",
    lastSeenAt: "2024-01-29T14:30:00Z",
    messagesCount: 450,
    channelsCount: 12,
  },
  {
    id: "2",
    username: "bob",
    displayName: "Bob Smith",
    email: "bob@example.com",
    role: { id: "moderator", name: "Moderator", permissions: [] },
    isActive: true,
    isBanned: false,
    createdAt: "2024-01-10T09:00:00Z",
    lastSeenAt: "2024-01-29T16:00:00Z",
    messagesCount: 678,
    channelsCount: 15,
  },
];

const mockChannels = [
  {
    id: "1",
    name: "general",
    slug: "general",
    description: "General discussion",
    type: "public",
    isPrivate: false,
    isArchived: false,
    createdAt: "2024-01-01T00:00:00Z",
    creator: { id: "1", username: "alice", displayName: "Alice Johnson" },
    membersCount: 156,
    messagesCount: 4521,
  },
  {
    id: "2",
    name: "engineering",
    slug: "engineering",
    description: "Engineering team channel",
    type: "private",
    isPrivate: true,
    isArchived: false,
    createdAt: "2024-01-02T00:00:00Z",
    creator: { id: "2", username: "bob", displayName: "Bob Smith" },
    membersCount: 24,
    messagesCount: 1856,
  },
];

export default function AdvancedAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && (!user || !["owner", "admin"].includes(user.role))) {
      router.push("/chat");
    }
  }, [user, loading, router]);

  if (loading || !user || !["owner", "admin"].includes(user.role)) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Advanced Administration</h1>
          <p className="text-muted-foreground">
            Powerful tools for bulk operations, automation, and system
            monitoring
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <QuickStatCard
            title="Bulk Ops"
            value="12"
            icon={<Users className="h-4 w-4" />}
            description="Active operations"
            href="/admin/advanced?tab=bulk-users"
          />
          <QuickStatCard
            title="Automation"
            value="8"
            icon={<Zap className="h-4 w-4" />}
            description="Active rules"
            href="/admin/advanced?tab=automation"
          />
          <QuickStatCard
            title="System Health"
            value="98%"
            icon={<Activity className="h-4 w-4" />}
            description="Uptime"
            href="/admin/advanced?tab=monitoring"
            variant="success"
          />
          <QuickStatCard
            title="Audit Events"
            value="1,247"
            icon={<FileText className="h-4 w-4" />}
            description="Last 7 days"
            href="/admin/advanced?tab=audit"
          />
          <QuickStatCard
            title="CPU Usage"
            value="45%"
            icon={<Activity className="h-4 w-4" />}
            description="Current"
            href="/admin/advanced?tab=monitoring"
          />
          <QuickStatCard
            title="Disk Space"
            value="62%"
            icon={<Settings className="h-4 w-4" />}
            description="Used"
            href="/admin/advanced?tab=monitoring"
          />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="bulk-users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="bulk-users">
              <Users className="mr-2 h-4 w-4" />
              Bulk Users
            </TabsTrigger>
            <TabsTrigger value="bulk-channels">
              <Hash className="mr-2 h-4 w-4" />
              Bulk Channels
            </TabsTrigger>
            <TabsTrigger value="automation">
              <Zap className="mr-2 h-4 w-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="monitoring">
              <Activity className="mr-2 h-4 w-4" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="audit">
              <FileText className="mr-2 h-4 w-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bulk-users" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Perform bulk operations on user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">Total Users</p>
                        <p className="text-sm text-muted-foreground">
                          156 active accounts
                        </p>
                      </div>
                      <Badge>156</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">Pending Invites</p>
                        <p className="text-sm text-muted-foreground">
                          Awaiting acceptance
                        </p>
                      </div>
                      <Badge variant="secondary">8</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">Suspended</p>
                        <p className="text-sm text-muted-foreground">
                          Temporary suspensions
                        </p>
                      </div>
                      <Badge variant="destructive">2</Badge>
                    </div>
                  </div>
                  <Link href="/admin/users">
                    <Button variant="outline" className="mt-4 w-full">
                      View All Users
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <BulkUserOperations
                users={mockUsers}
                selectedUserIds={selectedUserIds}
                onOperationComplete={() => {
                  // Refresh data
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="bulk-channels" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Channel Management</CardTitle>
                  <CardDescription>
                    Perform bulk operations on channels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">Total Channels</p>
                        <p className="text-sm text-muted-foreground">
                          Public and private
                        </p>
                      </div>
                      <Badge>24</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">Public Channels</p>
                        <p className="text-sm text-muted-foreground">
                          Accessible to all
                        </p>
                      </div>
                      <Badge variant="secondary">18</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">Archived</p>
                        <p className="text-sm text-muted-foreground">
                          No longer active
                        </p>
                      </div>
                      <Badge variant="outline">3</Badge>
                    </div>
                  </div>
                  <Link href="/admin/channels">
                    <Button variant="outline" className="mt-4 w-full">
                      View All Channels
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <BulkChannelOperations
                channels={mockChannels}
                selectedChannelIds={selectedChannelIds}
                onOperationComplete={() => {
                  // Refresh data
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <AutomationManager />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <SystemHealthDashboard />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <EnhancedAuditLog />
          </TabsContent>
        </Tabs>

        {/* Feature Highlights */}
        <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <CardHeader>
            <CardTitle>New in v0.5.0</CardTitle>
            <CardDescription>
              Enhanced administrative capabilities for enterprise deployments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                title="Bulk Operations"
                description="Perform actions on multiple users or channels simultaneously with progress tracking and error handling."
                icon={<Users className="h-5 w-5" />}
              />
              <FeatureCard
                title="Automation Engine"
                description="Schedule automated tasks like archiving inactive channels, deleting old messages, and sending reports."
                icon={<Zap className="h-5 w-5" />}
              />
              <FeatureCard
                title="Real-time Monitoring"
                description="Monitor system health, resource usage, and service status with live charts and alerts."
                icon={<Activity className="h-5 w-5" />}
              />
              <FeatureCard
                title="Advanced Audit Logs"
                description="Search, filter, and export detailed audit trails with enhanced security and compliance features."
                icon={<FileText className="h-5 w-5" />}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface QuickStatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  href: string;
  variant?: "default" | "success" | "warning" | "error";
}

function QuickStatCard({
  title,
  value,
  icon,
  description,
  href,
  variant = "default",
}: QuickStatCardProps) {
  const colorClasses = {
    default: "border-border",
    success: "border-green-500/20 bg-green-500/5",
    warning: "border-yellow-500/20 bg-yellow-500/5",
    error: "border-red-500/20 bg-red-500/5",
  };

  return (
    <Link href={href}>
      <Card
        className={`cursor-pointer transition-colors hover:border-primary ${colorClasses[variant]}`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex-shrink-0">{icon}</div>
      <div>
        <h4 className="mb-1 font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
