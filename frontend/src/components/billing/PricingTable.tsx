/**
 * Pricing Table Component
 * Display subscription plans with pricing
 */

"use client";

import { useState } from "react";
import { Check, Zap, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Plan, PlanTier, BillingInterval } from "@/types/billing";
import {
  PLANS,
  calculateAnnualSavings,
  formatPrice,
} from "@/config/billing-plans";
import { cn } from "@/lib/utils";

interface PricingTableProps {
  currentPlan?: PlanTier;
  onSelectPlan?: (planId: PlanTier, interval: BillingInterval) => void;
  showAnnualSavings?: boolean;
  className?: string;
}

export function PricingTable({
  currentPlan = "free",
  onSelectPlan,
  showAnnualSavings = true,
  className,
}: PricingTableProps) {
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month");
  const plans = Object.values(PLANS);

  const handleSelectPlan = (planId: PlanTier) => {
    if (planId === "enterprise") {
      // Redirect to contact sales
      window.location.href = "/contact-sales";
      return;
    }

    if (onSelectPlan) {
      onSelectPlan(planId, billingInterval);
    }
  };

  const getPlanIcon = (planId: PlanTier) => {
    switch (planId) {
      case "starter":
        return <Zap className="h-6 w-6" />;
      case "pro":
        return <Sparkles className="h-6 w-6" />;
      case "business":
        return <Shield className="h-6 w-6" />;
      case "enterprise":
        return <Shield className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const getButtonText = (plan: Plan) => {
    if (plan.id === currentPlan) return "Current Plan";
    if (plan.id === "free") return "Get Started";
    if (plan.id === "enterprise") return "Contact Sales";
    return "Upgrade";
  };

  const isCurrentPlan = (planId: PlanTier) => planId === currentPlan;

  return (
    <div className={cn("space-y-8", className)}>
      {/* Billing Interval Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="billing-interval" className="text-sm">
          Monthly
        </Label>
        <Switch
          id="billing-interval"
          checked={billingInterval === "year"}
          onCheckedChange={(checked) =>
            setBillingInterval(checked ? "year" : "month")
          }
        />
        <Label htmlFor="billing-interval" className="text-sm">
          Yearly
          {showAnnualSavings && (
            <span className="ml-2 text-xs text-green-600">Save up to 17%</span>
          )}
        </Label>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const price =
            billingInterval === "month"
              ? plan.price.monthly
              : plan.price.yearly / 12;
          const annualSavings = calculateAnnualSavings(plan);
          const isPopular = plan.popular || plan.recommended;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                isPopular && "border-primary shadow-lg",
                isCurrentPlan(plan.id) && "border-2 border-green-500",
              )}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="px-3">
                    {plan.recommended ? "Recommended" : "Popular"}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  {getPlanIcon(plan.id)}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                {/* Pricing */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-sm text-muted-foreground">
                        /month
                      </span>
                    )}
                  </div>
                  {billingInterval === "year" && price > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Billed {formatPrice(plan.price.yearly)} annually
                    </p>
                  )}
                  {showAnnualSavings &&
                    billingInterval === "year" &&
                    annualSavings > 0 && (
                      <p className="mt-1 text-xs text-green-600">
                        Save {formatPrice(annualSavings)} per year
                      </p>
                    )}
                </div>

                {/* Key Features */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Key Features:</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-green-600" />
                      <span>
                        {plan.features.maxUsers === null
                          ? "Unlimited users"
                          : `Up to ${plan.features.maxUsers} users`}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-green-600" />
                      <span>
                        {plan.features.maxStorageGB === null
                          ? "Unlimited storage"
                          : `${plan.features.maxStorageGB}GB storage`}
                      </span>
                    </li>
                    {plan.features.videoConferencing && (
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-600" />
                        <span>
                          Video calls ({plan.features.maxCallParticipants}{" "}
                          participants)
                        </span>
                      </li>
                    )}
                    {plan.features.customBranding && (
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-600" />
                        <span>Custom branding</span>
                      </li>
                    )}
                    {plan.features.advancedAnalytics && (
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-600" />
                        <span>Advanced analytics</span>
                      </li>
                    )}
                    {plan.features.prioritySupport && (
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-600" />
                        <span>Priority support</span>
                      </li>
                    )}
                    {plan.features.tokenGating && (
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-600" />
                        <span>NFT token gating</span>
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  disabled={isCurrentPlan(plan.id)}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {getButtonText(plan)}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Link */}
      <div className="text-center">
        <Button variant="link" asChild>
          <a href="/billing/compare">View detailed feature comparison →</a>
        </Button>
      </div>
    </div>
  );
}
