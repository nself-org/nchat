/**
 * Admin Storage Management Page
 *
 * Complete storage management dashboard for administrators.
 */

import { Metadata } from "next";
import { StorageManagement } from "@/components/admin/StorageManagement";

export const metadata: Metadata = {
  title: "Storage Management | Admin",
  description: "Manage team storage, quotas, and usage",
};

export default function AdminStoragePage() {
  return (
    <div className="container mx-auto py-6">
      <StorageManagement />
    </div>
  );
}
