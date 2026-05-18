/**
 * Badge Components Index
 *
 * Central export for all badge-related components.
 */

export { UserBadge, type UserBadgeProps, type BadgeSize } from "./UserBadge";
export {
  BadgeList,
  BadgeListCompact,
  BadgeListFull,
  BadgeGrid,
  type BadgeListProps,
} from "./BadgeList";
export {
  VerificationBadge,
  VerificationStatusIndicator,
  VerificationInfo,
  IdMeVerificationBadges,
  type VerificationBadgeProps,
  type VerificationLevel,
} from "./VerificationBadge";

// Re-export badge types for convenience
export * from "@/lib/badges/badge-types";
export {
  badgeManager,
  type BadgeRule,
  type BadgeRuleContext,
} from "@/lib/badges/badge-manager";
