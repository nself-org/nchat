"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft, Database, Download, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComplianceSkeleton } from "@/components/ui/loading-skeletons";
import { SettingsLayout } from "@/components/settings";

// Lazy load heavy compliance components
const DataExportRequest = dynamic(
  () =>
    import("@/components/compliance").then((mod) => ({
      default: mod.DataExportRequest,
    })),
  { loading: () => <ComplianceSkeleton />, ssr: false },
);

const DataDeletionRequest = dynamic(
  () =>
    import("@/components/compliance").then((mod) => ({
      default: mod.DataDeletionRequest,
    })),
  { loading: () => <ComplianceSkeleton />, ssr: false },
);

const ConsentManager = dynamic(
  () =>
    import("@/components/compliance").then((mod) => ({
      default: mod.ConsentManager,
    })),
  { loading: () => <ComplianceSkeleton />, ssr: false },
);

export default function UserDataPage() {
  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your Data</h1>
            <p className="text-sm text-muted-foreground">
              Manage, export, or delete your personal data
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-4 w-4" />
                Export Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Download a copy of all your data
              </p>
              <Link href="#export">
                <Button variant="outline" size="sm" className="w-full">
                  Request Export
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trash2 className="h-4 w-4" />
                Delete Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Request deletion of your data
              </p>
              <Link href="#delete">
                <Button variant="outline" size="sm" className="w-full">
                  Request Deletion
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Consent Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Manage your consent preferences
              </p>
              <Link href="#consent">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Consent
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Sections */}
        <Tabs defaultValue="export" className="space-y-6">
          <TabsList>
            <TabsTrigger value="export">Data Export</TabsTrigger>
            <TabsTrigger value="delete">Data Deletion</TabsTrigger>
            <TabsTrigger value="consent">Consent</TabsTrigger>
          </TabsList>

          <TabsContent value="export" id="export">
            <DataExportRequest />
          </TabsContent>

          <TabsContent value="delete" id="delete">
            <DataDeletionRequest />
          </TabsContent>

          <TabsContent value="consent" id="consent">
            <ConsentManager />
          </TabsContent>
        </Tabs>
      </div>
    </SettingsLayout>
  );
}
