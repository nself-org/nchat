"use client";

import { useState } from "react";
import { Mail, Link as LinkIcon, Users, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteEmail } from "./InviteEmail";
import { InviteLink } from "./InviteLink";
import { BulkInvite } from "./BulkInvite";
import { PendingInvites } from "./PendingInvites";
import { useUserManagementStore } from "@/stores/user-management-store";

interface InviteUsersProps {
  defaultTab?: "email" | "link" | "bulk";
}

export function InviteUsers({ defaultTab = "email" }: InviteUsersProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const { invites, invitesTotal, inviteLinks } = useUserManagementStore();

  const pendingInvitesCount = invites.filter(
    (i) => i.status === "pending",
  ).length;
  const activeLinksCount = inviteLinks.filter((l) => l.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invite Users</h1>
          <p className="text-muted-foreground">
            Invite new users to join your workspace
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Invites</CardDescription>
            <CardTitle className="text-2xl">{pendingInvitesCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Awaiting acceptance
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Links</CardDescription>
            <CardTitle className="text-2xl">{activeLinksCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Invite links active
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invites Sent</CardDescription>
            <CardTitle className="text-2xl">{invitesTotal}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">All time</div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Methods */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Link</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-4">
          <InviteEmail />
        </TabsContent>

        <TabsContent value="link" className="mt-4">
          <InviteLink />
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <BulkInvite />
        </TabsContent>
      </Tabs>

      {/* Pending Invites */}
      <PendingInvites />
    </div>
  );
}

export default InviteUsers;
