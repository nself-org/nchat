"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Upload,
  Download,
  Play,
  RotateCcw,
  FileCode,
  Users,
  Table,
} from "lucide-react";
import { useState } from "react";

interface Migration {
  id: string;
  name: string;
  status: "applied" | "pending" | "failed";
  appliedAt?: string;
}

export function DatabaseManager() {
  const [migrations, setMigrations] = useState<Migration[]>([
    {
      id: "001",
      name: "create_users_table",
      status: "applied",
      appliedAt: "2026-01-25 10:30:00",
    },
    {
      id: "002",
      name: "create_channels_table",
      status: "applied",
      appliedAt: "2026-01-26 14:15:00",
    },
    {
      id: "003",
      name: "create_messages_table",
      status: "applied",
      appliedAt: "2026-01-27 09:45:00",
    },
    {
      id: "004",
      name: "add_message_reactions",
      status: "pending",
    },
  ]);

  const [dbStats, setDbStats] = useState({
    size: "256 MB",
    tables: 15,
    connections: 12,
    maxConnections: 100,
  });

  const handleRunMigrations = async () => {
    // In production: execute `nself db migrate up` via API
    // REMOVED: console.log('Running migrations...')
  };

  const handleBackup = async () => {
    // In production: execute `nself db backup` via API
    // REMOVED: console.log('Creating backup...')
  };

  const handleSeed = async () => {
    // In production: execute `nself db seed` via API
    // REMOVED: console.log('Seeding database...')
  };

  const pendingCount = migrations.filter((m) => m.status === "pending").length;
  const appliedCount = migrations.filter((m) => m.status === "applied").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Database Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage migrations, backups, and database operations
          </p>
        </div>
      </div>

      {/* Database Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Database Size</CardDescription>
            <CardTitle className="text-2xl">{dbStats.size}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tables</CardDescription>
            <CardTitle className="text-2xl">{dbStats.tables}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Connections</CardDescription>
            <CardTitle className="text-2xl">
              {dbStats.connections}/{dbStats.maxConnections}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Migrations</CardDescription>
            <CardTitle className="text-2xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Migrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Database Migrations</CardTitle>
              <CardDescription>
                {appliedCount} applied, {pendingCount} pending
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <FileCode className="mr-2 h-4 w-4" />
                Create Migration
              </Button>
              <Button
                size="sm"
                onClick={handleRunMigrations}
                disabled={pendingCount === 0}
              >
                <Play className="mr-2 h-4 w-4" />
                Run Migrations ({pendingCount})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {migrations.map((migration) => (
              <div
                key={migration.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      migration.status === "applied"
                        ? "default"
                        : migration.status === "pending"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {migration.status}
                  </Badge>
                  <div>
                    <p className="font-medium">
                      {migration.id}_{migration.name}
                    </p>
                    {migration.appliedAt && (
                      <p className="text-xs text-muted-foreground">
                        Applied: {migration.appliedAt}
                      </p>
                    )}
                  </div>
                </div>
                {migration.status === "applied" && (
                  <Button size="sm" variant="ghost">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Database Operations</CardTitle>
          <CardDescription>Common database management tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" onClick={handleBackup}>
            <Download className="mr-2 h-4 w-4" />
            Create Backup
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Restore Backup
          </Button>
          <Button variant="outline" onClick={handleSeed}>
            <Users className="mr-2 h-4 w-4" />
            Seed Data
          </Button>
          <Button variant="outline">
            <Table className="mr-2 h-4 w-4" />
            Generate Types
          </Button>
          <Button variant="outline">
            <Database className="mr-2 h-4 w-4" />
            Database Shell
          </Button>
          <Button variant="outline">
            <FileCode className="mr-2 h-4 w-4" />
            View Schema
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import Data
          </Button>
        </CardContent>
      </Card>

      {/* Recent Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Backups</CardTitle>
          <CardDescription>Last 5 database backups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              {
                name: "nchat_20260131_093000.sql",
                size: "145 MB",
                date: "2026-01-31 09:30",
              },
              {
                name: "nchat_20260130_093000.sql",
                size: "142 MB",
                date: "2026-01-30 09:30",
              },
              {
                name: "nchat_20260129_093000.sql",
                size: "138 MB",
                date: "2026-01-29 09:30",
              },
            ].map((backup) => (
              <div
                key={backup.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{backup.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {backup.size} • {backup.date}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
