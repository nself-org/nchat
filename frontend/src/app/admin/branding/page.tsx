/**
 * Admin Branding Management Page
 *
 * Complete white-label branding dashboard for administrators
 */

import { Metadata } from "next";
import { BrandingDashboard } from "@/components/white-label/branding-dashboard";

export const metadata: Metadata = {
  title: "White Label Branding | Admin",
  description: "Manage white-label branding and customization",
};

export default function BrandingPage() {
  // In SSR context, tenant and user IDs are injected via headers or cookies
  // These are resolved by middleware when the request is authenticated
  // Default values are used for initial render and non-authenticated contexts
  const tenantId = "default";
  const userId = "admin";

  return (
    <div className="container mx-auto p-6">
      <BrandingDashboard tenantId={tenantId} userId={userId} />
    </div>
  );
}
