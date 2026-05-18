"use client";

import { Shield, Crown, Star, User, UserMinus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

interface RoleSelectProps {
  value: UserRole;
  onChange: (value: UserRole) => void;
  disabled?: boolean;
  disabledRoles?: UserRole[];
  className?: string;
}

const roleConfig: Record<
  UserRole,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  owner: {
    label: "Owner",
    description: "Full access to all features and settings",
    icon: Crown,
    color: "text-yellow-600",
  },
  admin: {
    label: "Admin",
    description: "Manage users, channels, and settings",
    icon: Shield,
    color: "text-red-600",
  },
  moderator: {
    label: "Moderator",
    description: "Moderate content and manage channels",
    icon: Star,
    color: "text-blue-600",
  },
  member: {
    label: "Member",
    description: "Standard access to channels",
    icon: User,
    color: "text-green-600",
  },
  guest: {
    label: "Guest",
    description: "Limited read-only access",
    icon: UserMinus,
    color: "text-gray-600",
  },
};

export function RoleSelect({
  value,
  onChange,
  disabled = false,
  disabledRoles = ["owner"],
  className,
}: RoleSelectProps) {
  const roles: UserRole[] = ["owner", "admin", "moderator", "member", "guest"];

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as UserRole)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder="Select a role">
          {value && (
            <div className="flex items-center">
              {(() => {
                const config = roleConfig[value];
                const Icon = config.icon;
                return (
                  <>
                    <Icon className={cn("mr-2 h-4 w-4", config.color)} />
                    <span>{config.label}</span>
                  </>
                );
              })()}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => {
          const config = roleConfig[role];
          const Icon = config.icon;
          const isDisabled = disabledRoles.includes(role);

          return (
            <SelectItem
              key={role}
              value={role}
              disabled={isDisabled}
              className="py-2"
            >
              <div className="flex items-start">
                <Icon className={cn("mr-2 mt-0.5 h-4 w-4", config.color)} />
                <div>
                  <div className="font-medium">{config.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {config.description}
                  </div>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
      <Icon className={cn("mr-1 h-3 w-3", config.color)} />
      <span>{config.label}</span>
    </div>
  );
}
