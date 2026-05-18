"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

interface RoleBadgeProps {
  name: string;
  color: string;
  icon?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * RoleBadge - Displays a role with its color and optional icon
 */
export function RoleBadge({
  name,
  color,
  icon,
  size = "md",
  showIcon = true,
  className,
  onClick,
}: RoleBadgeProps) {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs gap-1",
    md: "px-2 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  };

  const iconSizes = {
    sm: 10,
    md: 14,
    lg: 18,
  };

  const IconComponent = icon
    ? (Icons[icon as keyof typeof Icons] as React.ElementType)
    : null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-colors",
        sizeClasses[size],
        onClick && "cursor-pointer hover:opacity-80",
        className,
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
        borderWidth: 1,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                onClick();
              }
            }
          : undefined
      }
    >
      {showIcon && IconComponent && <IconComponent size={iconSizes[size]} />}
      {name}
    </span>
  );
}

/**
 * RoleBadgeGroup - Displays multiple role badges
 */
interface RoleBadgeGroupProps {
  roles: Array<{
    id: string;
    name: string;
    color: string;
    icon?: string;
  }>;
  size?: "sm" | "md" | "lg";
  showIcons?: boolean;
  maxDisplay?: number;
  className?: string;
  onRoleClick?: (roleId: string) => void;
}

export function RoleBadgeGroup({
  roles,
  size = "sm",
  showIcons = false,
  maxDisplay = 3,
  className,
  onRoleClick,
}: RoleBadgeGroupProps) {
  const displayRoles = roles.slice(0, maxDisplay);
  const remainingCount = roles.length - maxDisplay;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {displayRoles.map((role) => (
        <RoleBadge
          key={role.id}
          name={role.name}
          color={role.color}
          icon={role.icon}
          size={size}
          showIcon={showIcons}
          onClick={onRoleClick ? () => onRoleClick(role.id) : undefined}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}

export default RoleBadge;
