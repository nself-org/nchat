"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Users,
  CreditCard,
  Database,
  Trash2,
  BarChart3,
  Crown,
  AlertTriangle,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { TeamSettings } from "@/components/admin/team/TeamSettings";
import { InviteMembers } from "@/components/admin/team/InviteMembers";
import { TeamMembers } from "@/components/admin/team/TeamMembers";
import { TeamBilling } from "@/components/admin/team/TeamBilling";
import { TeamDangerZone } from "@/components/admin/team/TeamDangerZone";

import { useTeamStore } from "@/stores/team-store";
import { teamManager } from "@/lib/team/team-manager";

import { logger } from "@/lib/logger";

export default function TeamManagementPage() {
  const { team, setTeam, setLoadingTeam } = useTeamStore();
  const [activeTab, setActiveTab] = useState("settings");

  // For demo purposes, using a hardcoded team ID
  // In production, this would come from the authenticated user's context
  const teamId = "team-1";

  useEffect(() => {
    const loadTeam = async () => {
      setLoadingTeam(true);
      try {
        const teamData = await teamManager.getTeam(teamId);
        setTeam(teamData);
      } catch (error) {
        logger.error("Failed to load team:", error);
      } finally {
        setLoadingTeam(false);
      }
    };

    loadTeam();
  }, [teamId]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Team Management
            </h1>
            <p className="text-muted-foreground">
              Manage your workspace settings, members, and billing
            </p>
          </div>
          {team && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {team.slug}
              </Badge>
              <Badge className="text-sm">
                {team.memberCount}{" "}
                {team.memberCount === 1 ? "Member" : "Members"}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team?.memberCount || 0}</div>
            <p className="text-xs text-muted-foreground">Across all roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Channels</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team?.channelCount || 0}</div>
            <p className="text-xs text-muted-foreground">Active channels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {team?.messageCount
                ? Math.round(team.messageCount / 1000) + "K"
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Total messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {team?.storageUsed
                ? teamManager.formatFileSize(team.storageUsed)
                : "0 GB"}
            </div>
            <p className="text-xs text-muted-foreground">Of available quota</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger value="invite" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Invite</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Danger Zone</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <TeamSettings teamId={teamId} />
        </TabsContent>

        <TabsContent value="members">
          <TeamMembers teamId={teamId} />
        </TabsContent>

        <TabsContent value="invite">
          <InviteMembers teamId={teamId} />
        </TabsContent>

        <TabsContent value="billing">
          <TeamBilling teamId={teamId} />
        </TabsContent>

        <TabsContent value="danger">
          <TeamDangerZone teamId={teamId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
