"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ROLE_ICON_OPTIONS } from "@/lib/admin/roles/role-defaults";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";
import { Check, Search } from "lucide-react";

interface RoleIconProps {
  value?: string;
  onChange: (icon: string | undefined) => void;
  color?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * RoleIcon - Icon picker for roles
 */
export function RoleIcon({
  value,
  onChange,
  color = "#6B7280",
  disabled = false,
  className,
}: RoleIconProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredIcons = React.useMemo(() => {
    if (!searchQuery) return ROLE_ICON_OPTIONS;
    const query = searchQuery.toLowerCase();
    return ROLE_ICON_OPTIONS.filter((icon) =>
      icon.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const handleIconClick = (icon: string) => {
    if (disabled) return;
    onChange(value === icon ? undefined : icon);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label>Role Icon</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search icons..."
            className="pl-9"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto rounded-md border p-2">
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
          {/* No icon option */}
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-md border-2 transition-all",
              "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2",
              !value ? "bg-primary/10 border-primary" : "border-transparent",
              disabled && "cursor-not-allowed opacity-50",
            )}
            onClick={() => handleIconClick("")}
            title="No icon"
          >
            <span className="text-xs text-muted-foreground">None</span>
            {!value && (
              <Check
                className="text-primary-foreground absolute -right-1 -top-1 rounded-full bg-primary p-0.5"
                size={14}
              />
            )}
          </button>

          {filteredIcons.map((iconName) => {
            const IconComponent = Icons[
              iconName as keyof typeof Icons
            ] as React.ElementType;
            if (!IconComponent) return null;

            const isSelected = value === iconName;

            return (
              <button
                key={iconName}
                type="button"
                disabled={disabled}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-md border-2 transition-all",
                  "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2",
                  isSelected
                    ? "bg-primary/10 border-primary"
                    : "border-transparent",
                  disabled && "cursor-not-allowed opacity-50",
                )}
                onClick={() => handleIconClick(iconName)}
                title={iconName}
              >
                <IconComponent
                  size={20}
                  style={{ color: isSelected ? color : undefined }}
                />
                {isSelected && (
                  <Check
                    className="text-primary-foreground absolute -right-1 -top-1 rounded-full bg-primary p-0.5"
                    size={14}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {filteredIcons.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No icons found matching "{searchQuery}"
        </p>
      )}

      {value && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Selected:</span>
          <RoleIconPreview icon={value} color={color} />
          <span className="font-mono">{value}</span>
        </div>
      )}
    </div>
  );
}

/**
 * RoleIconPreview - Shows a preview of the icon
 */
interface RoleIconPreviewProps {
  icon?: string;
  color?: string;
  size?: number;
  className?: string;
}

export function RoleIconPreview({
  icon,
  color = "#6B7280",
  size = 16,
  className,
}: RoleIconPreviewProps) {
  if (!icon) return null;

  const IconComponent = Icons[icon as keyof typeof Icons] as React.ElementType;
  if (!IconComponent) return null;

  return <IconComponent size={size} style={{ color }} className={className} />;
}

export default RoleIcon;
