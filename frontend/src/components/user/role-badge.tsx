"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { type UserRole, getRoleColor, getRoleLabel } from "@/stores/user-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Crown, Shield, ShieldCheck, User, UserX } from "lucide-react";

// ============================================================================
// Variants
// ============================================================================

const roleBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
  {
    variants: {
      size: {
        xs: "px-1.5 py-0.5 text-[10px]",
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      variant: {
        filled: "",
        outline: "border bg-transparent",
        ghost: "bg-transparent",
      },
    },
    defaultVariants: {
      size: "sm",
      variant: "filled",
    },
  },
);

// ============================================================================
// Types
// ============================================================================

export interface RoleBadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof roleBadgeVariants> {
  role: UserRole;
  showIcon?: boolean;
  showTooltip?: boolean;
  permissions?: string[];
}

// ============================================================================
// Helper: Get role icon
// ============================================================================

const getRoleIcon = (role: UserRole, size: number = 12) => {
  const iconProps = { size, className: "flex-shrink-0" };

  switch (role) {
    case "owner":
      return <Crown {...iconProps} />;
    case "admin":
      return <ShieldCheck {...iconProps} />;
    case "moderator":
      return <Shield {...iconProps} />;
    case "member":
      return <User {...iconProps} />;
    case "guest":
      return <UserX {...iconProps} />;
    default:
      return <User {...iconProps} />;
  }
};

// ============================================================================
// Helper: Get role permissions
// ============================================================================

const getDefaultPermissions = (role: UserRole): string[] => {
  switch (role) {
    case "owner":
      return [
        "Full system access",
        "Manage all users",
        "Configure settings",
        "Delete workspace",
      ];
    case "admin":
      return [
        "Manage users",
        "Manage channels",
        "Configure settings",
        "View analytics",
      ];
    case "moderator":
      return [
        "Moderate messages",
        "Manage channel members",
        "Mute/ban users",
        "Pin messages",
      ];
    case "member":
      return [
        "Send messages",
        "Join public channels",
        "Create private channels",
        "Upload files",
      ];
    case "guest":
      return [
        "View messages",
        "Send messages (limited)",
        "Access specific channels",
      ];
    default:
      return [];
  }
};

// ============================================================================
// Component
// ============================================================================

const RoleBadge = React.forwardRef<HTMLSpanElement, RoleBadgeProps>(
  (
    {
      className,
      role,
      size,
      variant,
      showIcon = true,
      showTooltip = false,
      permissions,
      ...props
    },
    ref,
  ) => {
    const color = getRoleColor(role);
    const label = getRoleLabel(role);
    const rolePermissions = permissions ?? getDefaultPermissions(role);

    const iconSize =
      size === "xs" ? 10 : size === "sm" ? 12 : size === "lg" ? 16 : 14;

    const badge = (
      <span
        ref={ref}
        className={cn(roleBadgeVariants({ size, variant }), className)}
        style={{
          backgroundColor: variant === "filled" ? color : undefined,
          borderColor: variant === "outline" ? color : undefined,
          color:
            variant === "filled"
              ? "#fff"
              : variant === "outline" || variant === "ghost"
                ? color
                : undefined,
        }}
        {...props}
      >
        {showIcon && getRoleIcon(role, iconSize)}
        <span>{label}</span>
      </span>
    );

    if (showTooltip && rolePermissions.length > 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold">{label} Permissions</p>
                <ul className="space-y-0.5 text-xs">
                  {rolePermissions.map((permission, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-current opacity-50" />
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badge;
  },
);
RoleBadge.displayName = "RoleBadge";

export { RoleBadge, roleBadgeVariants };
