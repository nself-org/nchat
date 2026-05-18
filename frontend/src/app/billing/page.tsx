/**
 * Billing Page
 * Main billing and subscription management page
 */

"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PricingTable } from "@/components/billing/PricingTable";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { CryptoPayment } from "@/components/billing/CryptoPayment";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlanTier, BillingInterval, UsageLimits } from "@/types/billing";

// Mock data
const mockUsage: UsageLimits = {
  plan: "free",
  current: {
    userId: "user-1",
    period: "2026-02",
    users: 8,
    channels: 4,
    messages: 8234,
    storageGB: 3.2,
    integrations: 1,
    bots: 1,
    aiMinutes: 0,
    aiQueries: 45,
    callMinutes: 120,
    recordingGB: 0,
  },
  limits: {
    maxUsers: 10,
    maxChannels: 5,
    maxMessagesPerMonth: 10000,
    maxStorageGB: 5,
    maxFileUploadMB: 10,
    maxIntegrations: 2,
    maxBots: 1,
    maxAdmins: 1,
    customBranding: false,
    advancedAnalytics: false,
    prioritySupport: false,
    sla: false,
    ssoIntegration: false,
    auditLogs: false,
    dataExport: true,
    apiAccess: false,
    webhooks: false,
    customDomain: false,
    whiteLabel: false,
    aiSummarization: false,
    aiModerationMinutes: null,
    aiSearchQueries: 100,
    videoConferencing: true,
    screenSharing: false,
    voiceMessages: true,
    maxCallParticipants: 4,
    recordingStorage: false,
    guestAccess: false,
    tokenGating: false,
    cryptoPayments: false,
    nftIntegration: false,
  },
  warnings: [
    {
      feature: "Users",
      current: 8,
      limit: 10,
      percentage: 80,
      severity: "info",
    },
    {
      feature: "Messages",
      current: 8234,
      limit: 10000,
      percentage: 82.34,
      severity: "info",
    },
  ],
  exceeded: false,
};

export default function BillingPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [selectedInterval, setSelectedInterval] =
    useState<BillingInterval>("month");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "crypto">("card");
  const [showCheckout, setShowCheckout] = useState(false);

  const handleSelectPlan = (planId: PlanTier, interval: BillingInterval) => {
    setSelectedPlan(planId);
    setSelectedInterval(interval);
    setShowCheckout(true);
  };

  const handleUpgrade = () => {
    // Scroll to pricing table
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  const handlePaymentComplete = (txHash: string) => {
    console.log("Payment completed:", txHash);
    setShowCheckout(false);
    // In production, poll for subscription status update
  };

  return (
    <div className="container max-w-7xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscriptions</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your subscription, usage, and payment methods
        </p>
      </div>

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
          <TabsTrigger value="plans" id="pricing">
            Plans & Pricing
          </TabsTrigger>
          <TabsTrigger value="history">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          <UsageTracker limits={mockUsage} onUpgrade={handleUpgrade} />
        </TabsContent>

        <TabsContent value="plans">
          <PricingTable
            currentPlan={mockUsage.plan}
            onSelectPlan={handleSelectPlan}
          />
        </TabsContent>

        <TabsContent value="history">
          <div className="py-12 text-center text-muted-foreground">
            <p>No billing history yet</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Your Subscription</DialogTitle>
            <DialogDescription>
              Choose your payment method to subscribe
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <Tabs
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as any)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="card">Credit Card (Stripe)</TabsTrigger>
                <TabsTrigger value="crypto">Cryptocurrency</TabsTrigger>
              </TabsList>

              <TabsContent value="card" className="mt-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You'll be redirected to Stripe to complete your payment
                    securely.
                  </p>
                  <button
                    onClick={() => {
                      // In production, call /api/billing/checkout
                      alert("Stripe checkout would open here");
                    }}
                    className="text-primary-foreground hover:bg-primary/90 w-full rounded-md bg-primary px-4 py-2"
                  >
                    Continue to Stripe
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="crypto" className="mt-6">
                <CryptoPayment
                  planId={selectedPlan}
                  interval={selectedInterval}
                  onPaymentComplete={handlePaymentComplete}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
