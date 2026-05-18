/**
 * PaywallGate Component
 *
 * Client-side component for enforcing paywall restrictions and displaying
 * upgrade prompts. Wraps content with entitlement checks.
 *
 * @module @/components/billing/PaywallGate
 * @version 1.0.0
 */

"use client";

import { ReactNode, useState, useEffect, useCallback } from "react";
import {
  Lock,
  Sparkles,
  Crown,
  Gauge,
  Shield,
  ArrowRight,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlanTier, PlanFeatures } from "@/types/subscription.types";
import type { PlanLimits } from "@/lib/billing/plan-config";
import {
  PaywallCheckResult,
  PaywallConfig,
  PaywallDisplayMode,
  PaywallType,
  PaywallUIConfig,
  PLAN_TIER_NAMES,
  FEATURE_DISPLAY_NAMES,
  LIMIT_DISPLAY_NAMES,
  LIMIT_UNITS,
  PaywallPromptConfig,
} from "@/lib/billing/paywall-types";
import {
  isFeatureAvailable,
  isWithinLimit,
  getUsagePercentage,
  getRemainingQuota,
  formatLimitValue,
  formatUsageInfo,
  buildUpgradePrompt,
  getPaywallIcon,
  getPaywallBadgeText,
  trackPaywallImpression,
  trackUpgradeClick,
} from "@/lib/billing/paywall-utils";

// ============================================================================
// Types
// ============================================================================

interface PaywallGateProps {
  /** Feature key to check */
  feature?: keyof PlanFeatures;
  /** Limit key to check */
  limit?: keyof PlanLimits;
  /** Current usage for limit checks */
  currentUsage?: number;
  /** Minimum required plan tier */
  minimumTier?: PlanTier;
  /** Current user's plan tier */
  planTier: PlanTier;
  /** User ID for analytics */
  userId?: string;
  /** Workspace ID */
  workspaceId?: string;
  /** Display mode when blocked */
  displayMode?: PaywallDisplayMode;
  /** Show premium badge */
  showBadge?: boolean;
  /** Custom badge text */
  badgeText?: string;
  /** Custom locked message */
  lockedMessage?: string;
  /** Custom upgrade message */
  upgradeMessage?: string;
  /** Show usage progress (for limits) */
  showProgress?: boolean;
  /** Warning threshold percentage */
  warningThreshold?: number;
  /** Children to render when access granted */
  children: ReactNode;
  /** Fallback content when access denied */
  fallback?: ReactNode;
  /** Called when upgrade is clicked */
  onUpgradeClick?: (targetPlan: PlanTier) => void;
  /** Called when dismissed */
  onDismiss?: () => void;
  /** Additional class name */
  className?: string;
}

interface PaywallOverlayProps {
  planTier: PlanTier;
  requiredPlan?: PlanTier;
  feature?: keyof PlanFeatures;
  limit?: keyof PlanLimits;
  usage?: { current: number; limit: number | null; percentage: number | null };
  message?: string;
  showProgress?: boolean;
  onUpgradeClick?: (plan: PlanTier) => void;
  onDismiss?: () => void;
  className?: string;
}

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planTier: PlanTier;
  requiredPlan?: PlanTier;
  feature?: keyof PlanFeatures;
  limit?: keyof PlanLimits;
  promptConfig?: PaywallPromptConfig;
  onUpgradeClick?: (plan: PlanTier) => void;
}

interface PaywallBadgeProps {
  type?: PaywallType;
  requiredPlan?: PlanTier;
  variant?: "default" | "premium" | "enterprise" | "locked";
  text?: string;
  showIcon?: boolean;
  className?: string;
}

interface UsageProgressProps {
  current: number;
  limit: number | null;
  unit: string;
  warningThreshold?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface PaywallToastProps {
  feature?: keyof PlanFeatures;
  limit?: keyof PlanLimits;
  requiredPlan?: PlanTier;
}

/**
 * PaywallToast component - separate component to avoid conditional hooks
 */
function PaywallToast({ feature, limit, requiredPlan }: PaywallToastProps) {
  useEffect(() => {
    // Would trigger toast notification here
    console.log("Paywall toast:", {
      feature,
      limit,
      requiredPlan,
    });
  }, [feature, limit, requiredPlan]);

  return null;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Badge indicating premium/locked status.
 */
export function PaywallBadge({
  type = "feature",
  requiredPlan,
  variant = "premium",
  text,
  showIcon = true,
  className,
}: PaywallBadgeProps) {
  const badgeText = text ?? getPaywallBadgeText(type, requiredPlan);
  const iconName = getPaywallIcon(type);

  const IconComponent =
    {
      sparkles: Sparkles,
      gauge: Gauge,
      crown: Crown,
      shield: Shield,
      lock: Lock,
      clock: Lock,
      settings: Lock,
    }[iconName] || Lock;

  const variantClasses = {
    default: "bg-muted text-muted-foreground",
    premium:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    enterprise:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    locked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {showIcon && <IconComponent className="h-3 w-3" />}
      {badgeText}
    </Badge>
  );
}

/**
 * Usage progress bar with warning states.
 */
export function UsageProgress({
  current,
  limit,
  unit,
  warningThreshold = 75,
  showLabel = true,
  size = "md",
  className,
}: UsageProgressProps) {
  const percentage = limit ? Math.min(100, (current / limit) * 100) : 0;
  const remaining = limit ? Math.max(0, limit - current) : null;

  const isWarning = percentage >= warningThreshold;
  const isCritical = percentage >= 90;
  const isExceeded = percentage >= 100;

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("space-y-1", className)}>
      <Progress
        value={percentage}
        className={cn(
          sizeClasses[size],
          isExceeded && "[&>div]:bg-red-500",
          isCritical && !isExceeded && "[&>div]:bg-amber-500",
          isWarning && !isCritical && "[&>div]:bg-yellow-500",
        )}
      />
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {current.toLocaleString()} /{" "}
            {limit?.toLocaleString() ?? "Unlimited"} {unit}
          </span>
          {remaining !== null && (
            <span
              className={cn(
                isCritical && "text-amber-600",
                isExceeded && "text-red-600",
              )}
            >
              {remaining.toLocaleString()} remaining
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Overlay shown when content is locked.
 */
export function PaywallOverlay({
  planTier,
  requiredPlan,
  feature,
  limit,
  usage,
  message,
  showProgress = true,
  onUpgradeClick,
  onDismiss,
  className,
}: PaywallOverlayProps) {
  const targetPlan = requiredPlan ?? "starter";
  const displayMessage =
    message ??
    (feature
      ? `${FEATURE_DISPLAY_NAMES[feature] ?? feature} requires ${PLAN_TIER_NAMES[targetPlan]} plan`
      : limit
        ? `You've reached your ${LIMIT_DISPLAY_NAMES[limit]} limit`
        : "Upgrade required");

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="rounded-full bg-muted p-3">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{displayMessage}</h3>
          {usage && showProgress && (
            <UsageProgress
              current={usage.current}
              limit={usage.limit}
              unit={limit ? LIMIT_UNITS[limit] : ""}
              className="w-48"
            />
          )}
          <p className="text-sm text-muted-foreground">
            Upgrade to {PLAN_TIER_NAMES[targetPlan]} to unlock this feature
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => onUpgradeClick?.(targetPlan)}>
            Upgrade to {PLAN_TIER_NAMES[targetPlan]}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {onDismiss && (
            <Button variant="ghost" size="icon" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Upgrade modal dialog.
 */
export function PaywallModal({
  open,
  onOpenChange,
  planTier,
  requiredPlan,
  feature,
  limit,
  promptConfig,
  onUpgradeClick,
}: PaywallModalProps) {
  const targetPlan = requiredPlan ?? "starter";

  const title =
    promptConfig?.title ??
    (feature
      ? `Unlock ${FEATURE_DISPLAY_NAMES[feature] ?? feature}`
      : limit
        ? `Increase Your ${LIMIT_DISPLAY_NAMES[limit]} Limit`
        : "Upgrade Your Plan");

  const description =
    promptConfig?.description ??
    (feature
      ? `${FEATURE_DISPLAY_NAMES[feature] ?? feature} is available on the ${PLAN_TIER_NAMES[targetPlan]} plan and above.`
      : limit
        ? `You've reached your ${LIMIT_DISPLAY_NAMES[limit]} limit. Upgrade to get more.`
        : `Upgrade to ${PLAN_TIER_NAMES[targetPlan]} to unlock this feature.`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        {promptConfig?.showComparison && (
          <div className="space-y-3 py-4">
            <h4 className="text-sm font-medium">What you'll get:</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                {feature
                  ? FEATURE_DISPLAY_NAMES[feature]
                  : limit
                    ? LIMIT_DISPLAY_NAMES[limit]
                    : "Premium features"}
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                Priority support
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                Advanced integrations
              </li>
            </ul>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => {
              onUpgradeClick?.(targetPlan);
              onOpenChange(false);
            }}
          >
            {promptConfig?.primaryCta?.text ??
              `Upgrade to ${PLAN_TIER_NAMES[targetPlan]}`}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            {promptConfig?.secondaryCta?.text ?? "Maybe later"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline upgrade prompt.
 */
export function InlineUpgradePrompt({
  planTier,
  requiredPlan,
  feature,
  limit,
  usage,
  onUpgradeClick,
  onDismiss,
  className,
}: {
  planTier: PlanTier;
  requiredPlan?: PlanTier;
  feature?: keyof PlanFeatures;
  limit?: keyof PlanLimits;
  usage?: { current: number; limit: number | null };
  onUpgradeClick?: (plan: PlanTier) => void;
  onDismiss?: () => void;
  className?: string;
}) {
  const targetPlan = requiredPlan ?? "starter";
  const percentage = usage?.limit
    ? Math.min(100, ((usage.current ?? 0) / usage.limit) * 100)
    : 0;
  const isCritical = percentage >= 90;

  return (
    <Alert
      variant={isCritical ? "destructive" : "default"}
      className={cn("relative", className)}
    >
      {isCritical ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      <AlertTitle>
        {limit
          ? isCritical
            ? `${LIMIT_DISPLAY_NAMES[limit]} Almost Full`
            : `Upgrade for More ${LIMIT_DISPLAY_NAMES[limit]}`
          : `Unlock ${FEATURE_DISPLAY_NAMES[feature ?? "voiceMessages"]}`}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {limit && usage
            ? `${usage.current.toLocaleString()} / ${usage.limit?.toLocaleString() ?? "Unlimited"} ${LIMIT_UNITS[limit]}`
            : `Available on ${PLAN_TIER_NAMES[targetPlan]} plan`}
        </span>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onUpgradeClick?.(targetPlan)}>
            Upgrade
          </Button>
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PaywallGate - Wrap content with paywall enforcement.
 *
 * @example
 * // Feature gate
 * <PaywallGate feature="videoCalls" planTier="free">
 *   <VideoCallButton />
 * </PaywallGate>
 *
 * @example
 * // Limit gate with usage
 * <PaywallGate limit="maxChannels" currentUsage={channels.length} planTier="free">
 *   <CreateChannelButton />
 * </PaywallGate>
 *
 * @example
 * // Tier gate
 * <PaywallGate minimumTier="professional" planTier="starter">
 *   <AdminDashboard />
 * </PaywallGate>
 */
export function PaywallGate({
  feature,
  limit,
  currentUsage = 0,
  minimumTier,
  planTier,
  userId,
  workspaceId,
  displayMode = "modal",
  showBadge = true,
  badgeText,
  lockedMessage,
  upgradeMessage,
  showProgress = true,
  warningThreshold = 75,
  children,
  fallback,
  onUpgradeClick,
  onDismiss,
  className,
}: PaywallGateProps) {
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Determine access
  const hasAccess = determineAccess({
    feature,
    limit,
    currentUsage,
    minimumTier,
    planTier,
  });

  // Calculate required plan
  const requiredPlan = calculateRequiredPlan({
    feature,
    limit,
    minimumTier,
  });

  // Calculate usage info for limits
  const usage = limit
    ? {
        current: currentUsage,
        limit: isWithinLimit(limit, planTier, 0) ? null : currentUsage,
        percentage: getUsagePercentage(limit, planTier, currentUsage),
      }
    : undefined;

  // Track impression
  useEffect(() => {
    if (!hasAccess && userId) {
      trackPaywallImpression(
        feature ?? limit ?? minimumTier ?? "unknown",
        { allowed: false, currentPlan: planTier, requiredPlan },
        { userId, planTier, workspaceId },
      );
    }
  }, [
    hasAccess,
    feature,
    limit,
    minimumTier,
    planTier,
    userId,
    workspaceId,
    requiredPlan,
  ]);

  // Handle upgrade click
  const handleUpgradeClick = useCallback(
    (plan: PlanTier) => {
      if (userId) {
        trackUpgradeClick(
          feature ?? limit ?? minimumTier ?? "unknown",
          plan,
          "paywall_gate",
        );
      }
      onUpgradeClick?.(plan);
      // Default: navigate to upgrade page
      if (typeof window !== "undefined" && !onUpgradeClick) {
        window.location.href = `/billing/upgrade?plan=${plan}`;
      }
    },
    [feature, limit, minimumTier, userId, onUpgradeClick],
  );

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  // Handle click on locked content
  const handleLockedClick = useCallback(() => {
    if (displayMode === "modal") {
      setShowModal(true);
    }
  }, [displayMode]);

  // If access granted, render children
  if (hasAccess) {
    // Show usage warning if approaching limit
    if (limit && showProgress) {
      const percentage = getUsagePercentage(limit, planTier, currentUsage);
      if (percentage !== null && percentage >= warningThreshold && !dismissed) {
        return (
          <div className={className}>
            <InlineUpgradePrompt
              planTier={planTier}
              requiredPlan={requiredPlan}
              limit={limit}
              usage={usage}
              onUpgradeClick={handleUpgradeClick}
              onDismiss={handleDismiss}
              className="mb-4"
            />
            {children}
          </div>
        );
      }
    }
    return <>{children}</>;
  }

  // Access denied - render based on display mode
  if (fallback) {
    return <>{fallback}</>;
  }

  switch (displayMode) {
    case "hidden":
      return null;

    case "disabled":
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("pointer-events-none opacity-50", className)}>
                {children}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {lockedMessage ??
                  `Requires ${PLAN_TIER_NAMES[requiredPlan ?? "starter"]} plan`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

    case "locked":
      return (
        <div
          className={cn("relative cursor-pointer", className)}
          onClick={handleLockedClick}
        >
          <div className="pointer-events-none opacity-30">{children}</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 shadow-lg">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {PLAN_TIER_NAMES[requiredPlan ?? "starter"]} required
              </span>
            </div>
          </div>
          {showBadge && (
            <PaywallBadge
              type={feature ? "feature" : limit ? "limit" : "tier"}
              requiredPlan={requiredPlan}
              text={badgeText}
              className="absolute right-2 top-2"
            />
          )}
          <PaywallModal
            open={showModal}
            onOpenChange={setShowModal}
            planTier={planTier}
            requiredPlan={requiredPlan}
            feature={feature}
            limit={limit}
            onUpgradeClick={handleUpgradeClick}
          />
        </div>
      );

    case "blurred":
      return (
        <div className={cn("relative", className)} onClick={handleLockedClick}>
          <div className="pointer-events-none blur-md">{children}</div>
          <PaywallOverlay
            planTier={planTier}
            requiredPlan={requiredPlan}
            feature={feature}
            limit={limit}
            usage={usage}
            message={lockedMessage}
            showProgress={showProgress}
            onUpgradeClick={handleUpgradeClick}
            onDismiss={handleDismiss}
          />
          <PaywallModal
            open={showModal}
            onOpenChange={setShowModal}
            planTier={planTier}
            requiredPlan={requiredPlan}
            feature={feature}
            limit={limit}
            onUpgradeClick={handleUpgradeClick}
          />
        </div>
      );

    case "inline":
      return (
        <InlineUpgradePrompt
          planTier={planTier}
          requiredPlan={requiredPlan}
          feature={feature}
          limit={limit}
          usage={usage}
          onUpgradeClick={handleUpgradeClick}
          onDismiss={handleDismiss}
          className={className}
        />
      );

    case "toast":
      // For toast mode, use a separate component to avoid conditional hook
      return (
        <PaywallToast
          feature={feature}
          limit={limit}
          requiredPlan={requiredPlan}
        />
      );

    case "modal":
    default:
      return (
        <>
          <div
            className={cn("relative cursor-pointer", className)}
            onClick={() => setShowModal(true)}
          >
            <div className="pointer-events-none opacity-50">{children}</div>
            {showBadge && (
              <PaywallBadge
                type={feature ? "feature" : limit ? "limit" : "tier"}
                requiredPlan={requiredPlan}
                text={badgeText}
                className="absolute right-2 top-2"
              />
            )}
          </div>
          <PaywallModal
            open={showModal}
            onOpenChange={setShowModal}
            planTier={planTier}
            requiredPlan={requiredPlan}
            feature={feature}
            limit={limit}
            onUpgradeClick={handleUpgradeClick}
          />
        </>
      );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function determineAccess({
  feature,
  limit,
  currentUsage,
  minimumTier,
  planTier,
}: {
  feature?: keyof PlanFeatures;
  limit?: keyof PlanLimits;
  currentUsage?: number;
  minimumTier?: PlanTier;
  planTier: PlanTier;
}): boolean {
  // Check feature access
  if (feature) {
    if (!isFeatureAvailable(feature, planTier)) {
      return false;
    }
  }

  // Check limit
  if (limit && currentUsage !== undefined) {
    if (!isWithinLimit(limit, planTier, currentUsage)) {
      return false;
    }
  }

  // Check tier
  if (minimumTier) {
    const tierOrder: PlanTier[] = [
      "free",
      "starter",
      "professional",
      "enterprise",
      "custom",
    ];
    const currentIndex = tierOrder.indexOf(planTier);
    const requiredIndex = tierOrder.indexOf(minimumTier);
    if (currentIndex < requiredIndex) {
      return false;
    }
  }

  return true;
}

function calculateRequiredPlan({
  feature,
  limit,
  minimumTier,
}: {
  feature?: keyof PlanFeatures;
  limit?: keyof PlanLimits;
  minimumTier?: PlanTier;
}): PlanTier {
  if (minimumTier) {
    return minimumTier;
  }

  if (feature) {
    const tiers: PlanTier[] = ["free", "starter", "professional", "enterprise"];
    for (const tier of tiers) {
      if (isFeatureAvailable(feature, tier)) {
        return tier;
      }
    }
    return "enterprise";
  }

  // For limits, suggest next tier
  return "starter";
}

// ============================================================================
// Exports
// ============================================================================

export default PaywallGate;
