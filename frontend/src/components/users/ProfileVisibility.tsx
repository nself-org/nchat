"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Users,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type VisibilityLevel = "public" | "contacts" | "private";
export type ActivityVisibility = "everyone" | "contacts" | "nobody";

export interface ProfileVisibilitySettings {
  email: VisibilityLevel;
  phone: VisibilityLevel;
  location: VisibilityLevel;
  timezone: VisibilityLevel;
  lastSeen: ActivityVisibility;
  onlineStatus: ActivityVisibility;
}

export interface ProfileVisibilityProps extends React.HTMLAttributes<HTMLDivElement> {
  visibility: ProfileVisibilitySettings;
  onVisibilityChange: (
    key: keyof ProfileVisibilitySettings,
    value: string,
  ) => void;
  disabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const VISIBILITY_OPTIONS: {
  value: VisibilityLevel;
  label: string;
  icon: typeof Globe;
}[] = [
  { value: "public", label: "Everyone", icon: Globe },
  { value: "contacts", label: "Contacts only", icon: Users },
  { value: "private", label: "Only me", icon: Lock },
];

const ACTIVITY_OPTIONS: {
  value: ActivityVisibility;
  label: string;
  icon: typeof Eye;
}[] = [
  { value: "everyone", label: "Everyone", icon: Eye },
  { value: "contacts", label: "Contacts only", icon: Users },
  { value: "nobody", label: "Nobody", icon: EyeOff },
];

const VISIBILITY_FIELDS: {
  key: keyof Pick<
    ProfileVisibilitySettings,
    "email" | "phone" | "location" | "timezone"
  >;
  label: string;
  description: string;
  icon: typeof Mail;
}[] = [
  {
    key: "email",
    label: "Email address",
    description: "Who can see your email address",
    icon: Mail,
  },
  {
    key: "phone",
    label: "Phone number",
    description: "Who can see your phone number",
    icon: Phone,
  },
  {
    key: "location",
    label: "Location",
    description: "Who can see your location",
    icon: MapPin,
  },
  {
    key: "timezone",
    label: "Timezone",
    description: "Who can see your timezone and local time",
    icon: Clock,
  },
];

const ACTIVITY_FIELDS: {
  key: keyof Pick<ProfileVisibilitySettings, "lastSeen" | "onlineStatus">;
  label: string;
  description: string;
  icon: typeof Eye;
}[] = [
  {
    key: "lastSeen",
    label: "Last seen",
    description: "Who can see when you were last active",
    icon: Clock,
  },
  {
    key: "onlineStatus",
    label: "Online status",
    description: "Who can see when you are online",
    icon: Eye,
  },
];

// ============================================================================
// Component
// ============================================================================

const ProfileVisibility = React.forwardRef<
  HTMLDivElement,
  ProfileVisibilityProps
>(
  (
    { className, visibility, onVisibilityChange, disabled = false, ...props },
    ref,
  ) => {
    return (
      <div ref={ref} className={cn("space-y-6", className)} {...props}>
        {/* Contact Information */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">Contact Information</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Control who can see your contact details
            </p>
          </div>

          {VISIBILITY_FIELDS.map((field) => {
            const Icon = field.icon;
            return (
              <div
                key={field.key}
                className="flex items-center justify-between gap-4 py-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{field.label}</Label>
                    <p className="truncate text-xs text-muted-foreground">
                      {field.description}
                    </p>
                  </div>
                </div>
                <Select
                  value={visibility[field.key]}
                  onValueChange={(value) =>
                    onVisibilityChange(field.key, value)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((option) => {
                      const OptionIcon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <OptionIcon className="h-3.5 w-3.5" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        {/* Activity Status */}
        <div className="space-y-4 border-t pt-4">
          <div>
            <h4 className="text-sm font-medium">Activity Status</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Control who can see your activity status
            </p>
          </div>

          {ACTIVITY_FIELDS.map((field) => {
            const Icon = field.icon;
            return (
              <div
                key={field.key}
                className="flex items-center justify-between gap-4 py-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{field.label}</Label>
                    <p className="truncate text-xs text-muted-foreground">
                      {field.description}
                    </p>
                  </div>
                </div>
                <Select
                  value={visibility[field.key]}
                  onValueChange={(value) =>
                    onVisibilityChange(field.key, value)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_OPTIONS.map((option) => {
                      const OptionIcon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <OptionIcon className="h-3.5 w-3.5" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        {/* Privacy note */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <p>
            <strong>Note:</strong> Workspace admins may still be able to see
            some of this information for administrative purposes.
          </p>
        </div>
      </div>
    );
  },
);
ProfileVisibility.displayName = "ProfileVisibility";

export { ProfileVisibility };
