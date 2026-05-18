"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ConsentManager,
  CookieSettings,
  LegalHold,
} from "@/components/compliance";

export default function PrivacySettingsPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/compliance">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Compliance
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="consent" className="space-y-6">
        <TabsList>
          <TabsTrigger value="consent">Consent Management</TabsTrigger>
          <TabsTrigger value="cookies">Cookie Settings</TabsTrigger>
          <TabsTrigger value="legal-holds">Legal Holds</TabsTrigger>
        </TabsList>

        <TabsContent value="consent">
          <ConsentManager />
        </TabsContent>

        <TabsContent value="cookies">
          <CookieSettings />
        </TabsContent>

        <TabsContent value="legal-holds">
          <LegalHold />
        </TabsContent>
      </Tabs>
    </div>
  );
}
