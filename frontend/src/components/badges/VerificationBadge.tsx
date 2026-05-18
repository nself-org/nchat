"use client";

/**
 * VerificationBadge Component
 *
 * Specialized badge component for displaying verification status.
 * Typically shown next to a user's name to indicate verification level.
 */

import React from "react";
import {
  Badge as BadgeType,
  BADGE_DEFINITIONS,
  idmeGroupToBadge,
} from "@/lib/badges/badge-types";
import { UserBadge, BadgeSize } from "./UserBadge";
import type { IdMeGroup } from "@/services/auth/providers/idme.provider";

export type VerificationLevel =
  | "none"
  | "email"
  | "phone"
  | "idme"
  | "government";

export interface VerificationBadgeProps {
  level: VerificationLevel;
  idmeGroups?: IdMeGroup[];
  size?: BadgeSize;
  showTooltip?: boolean;
  className?: string;
}

// Verification level to badge mapping
const verificationBadgeMap: Record<VerificationLevel, string | null> = {
  none: null,
  email: "verified",
  phone: "verified",
  idme: "verified",
  government: "government",
};

// Get the appropriate badge for ID.me groups
function getIdMeBadge(groups: IdMeGroup[]): BadgeType | null {
  // Priority order for ID.me badges
  const priorityOrder: IdMeGroup[] = [
    "government",
    "military",
    "veteran",
    "first-responder",
    "nurse",
    "hospital",
    "teacher",
    "student",
  ];

  for (const group of priorityOrder) {
    if (groups.includes(group)) {
      const badgeId = idmeGroupToBadge[group];
      if (badgeId && BADGE_DEFINITIONS[badgeId]) {
        return BADGE_DEFINITIONS[badgeId];
      }
    }
  }

  return null;
}

/**
 * Get verification badge based on level and ID.me groups
 */
function getVerificationBadge(
  level: VerificationLevel,
  idmeGroups?: IdMeGroup[],
): BadgeType | null {
  // If ID.me verified, try to get specific badge
  if (level === "idme" && idmeGroups && idmeGroups.length > 0) {
    const idmeBadge = getIdMeBadge(idmeGroups);
    if (idmeBadge) return idmeBadge;
  }

  // Government level always shows government badge
  if (level === "government") {
    return BADGE_DEFINITIONS.government;
  }

  // Get badge from level mapping
  const badgeId = verificationBadgeMap[level];
  if (badgeId && BADGE_DEFINITIONS[badgeId]) {
    return BADGE_DEFINITIONS[badgeId];
  }

  return null;
}

export function VerificationBadge({
  level,
  idmeGroups,
  size = "sm",
  showTooltip = true,
  className = "",
}: VerificationBadgeProps) {
  const badge = getVerificationBadge(level, idmeGroups);

  if (!badge) {
    return null;
  }

  return (
    <UserBadge
      badge={badge}
      size={size}
      showLabel={false}
      showTooltip={showTooltip}
      className={className}
    />
  );
}

/**
 * VerificationStatusIndicator - Inline verification status
 */
export function VerificationStatusIndicator({
  isVerified,
  verificationLevel = "email",
  idmeGroups,
  size = "xs",
  className = "",
}: {
  isVerified: boolean;
  verificationLevel?: VerificationLevel;
  idmeGroups?: IdMeGroup[];
  size?: BadgeSize;
  className?: string;
}) {
  if (!isVerified) {
    return null;
  }

  return (
    <VerificationBadge
      level={verificationLevel}
      idmeGroups={idmeGroups}
      size={size}
      className={className}
    />
  );
}

/**
 * VerificationInfo - Full verification status with text
 */
export function VerificationInfo({
  level,
  idmeGroups,
  showBadge = true,
  className = "",
}: {
  level: VerificationLevel;
  idmeGroups?: IdMeGroup[];
  showBadge?: boolean;
  className?: string;
}) {
  const badge = getVerificationBadge(level, idmeGroups);

  const statusText: Record<VerificationLevel, string> = {
    none: "Not verified",
    email: "Email verified",
    phone: "Phone verified",
    idme: "ID.me verified",
    government: "Government verified",
  };

  const statusColors: Record<VerificationLevel, string> = {
    none: "text-gray-500",
    email: "text-green-600",
    phone: "text-green-600",
    idme: "text-blue-600",
    government: "text-blue-800",
  };

  // Get specific ID.me group text if available
  let displayText = statusText[level];
  if (level === "idme" && idmeGroups && idmeGroups.length > 0) {
    const groupLabels: Record<IdMeGroup, string> = {
      military: "Military verified",
      veteran: "Veteran verified",
      "military-family": "Military family verified",
      "first-responder": "First responder verified",
      nurse: "Healthcare worker verified",
      hospital: "Healthcare worker verified",
      government: "Government employee verified",
      teacher: "Educator verified",
      student: "Student verified",
    };
    displayText = groupLabels[idmeGroups[0]] || displayText;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showBadge && badge && (
        <VerificationBadge
          level={level}
          idmeGroups={idmeGroups}
          size="sm"
          showTooltip={false}
        />
      )}
      <span className={`text-sm font-medium ${statusColors[level]}`}>
        {displayText}
      </span>
    </div>
  );
}

/**
 * IdMeVerificationBadges - Display all ID.me verification badges
 */
export function IdMeVerificationBadges({
  groups,
  size = "sm",
  maxVisible = 3,
  className = "",
}: {
  groups: IdMeGroup[];
  size?: BadgeSize;
  maxVisible?: number;
  className?: string;
}) {
  if (!groups || groups.length === 0) {
    return null;
  }

  const badges = groups
    .map((group) => {
      const badgeId = idmeGroupToBadge[group];
      return badgeId ? BADGE_DEFINITIONS[badgeId] : null;
    })
    .filter((b): b is BadgeType => b !== null)
    .slice(0, maxVisible);

  const hiddenCount = groups.length - badges.length;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {badges.map((badge) => (
        <UserBadge
          key={badge.id}
          badge={badge}
          size={size}
          showLabel={false}
          showTooltip={true}
        />
      ))}
      {hiddenCount > 0 && (
        <span
          className="text-xs text-gray-500"
          title={`${hiddenCount} more verification${hiddenCount > 1 ? "s" : ""}`}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

export default VerificationBadge;
