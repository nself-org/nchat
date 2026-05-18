/**
 * Admin Billing Dashboard Page
 * View billing stats, revenue, and manage subscriptions
 */

import { BillingDashboard } from "@/components/billing/BillingDashboard";

export default function AdminBillingPage() {
  return (
    <div className="container max-w-7xl py-8">
      <BillingDashboard />
    </div>
  );
}
