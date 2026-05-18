/**
 * User Storage Settings Page
 *
 * Personal storage usage and management for users.
 */

import { Metadata } from "next";
import { StorageUsage } from "@/components/settings/StorageUsage";

export const metadata: Metadata = {
  title: "Storage | Settings",
  description: "Manage your storage quota and usage",
};

export default function StorageSettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Storage</h1>
        <p className="text-muted-foreground">
          Monitor and manage your personal storage usage
        </p>
      </div>

      <StorageUsage />
    </div>
  );
}
