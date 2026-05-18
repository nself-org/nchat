"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type UserBadge } from "./UserCard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Award,
  Star,
  Shield,
  Zap,
  Heart,
  Trophy,
  Medal,
  Crown,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserBadgesProps extends React.HTMLAttributes<HTMLDivElement> {
  badges: UserBadge[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

// ============================================================================
// Helper: Get default badge icon
// ============================================================================

function getBadgeIcon(badgeName: string): React.ReactNode {
  const name = badgeName.toLowerCase();
  const iconProps = { className: "h-3.5 w-3.5" };

  if (name.includes("star") || name.includes("featured"))
    return <Star {...iconProps} />;
  if (name.includes("shield") || name.includes("verified"))
    return <Shield {...iconProps} />;
  if (name.includes("bolt") || name.includes("power") || name.includes("early"))
    return <Zap {...iconProps} />;
  if (
    name.includes("heart") ||
    name.includes("love") ||
    name.includes("helpful")
  )
    return <Heart {...iconProps} />;
  if (name.includes("trophy") || name.includes("winner"))
    return <Trophy {...iconProps} />;
  if (name.includes("medal") || name.includes("achievement"))
    return <Medal {...iconProps} />;
  if (
    name.includes("crown") ||
    name.includes("founder") ||
    name.includes("owner")
  )
    return <Crown {...iconProps} />;
  return <Award {...iconProps} />;
}

// ============================================================================
// Component
// ============================================================================

const UserBadges = React.forwardRef<HTMLDivElement, UserBadgesProps>(
  (
    {
      className,
      badges,
      maxVisible = 5,
      size = "md",
      showTooltip = true,
      ...props
    },
    ref,
  ) => {
    if (badges.length === 0) return null;

    const visibleBadges = badges.slice(0, maxVisible);
    const hiddenBadges = badges.slice(maxVisible);

    const sizeClasses = {
      sm: "h-6 px-2 text-xs gap-1",
      md: "h-7 px-2.5 text-xs gap-1.5",
      lg: "h-8 px-3 text-sm gap-2",
    };

    const BadgeItem = ({ badge }: { badge: UserBadge }) => {
      const badgeContent = (
        <span
          className={cn(
            "inline-flex items-center rounded-full font-medium",
            "bg-muted text-muted-foreground",
            "hover:bg-primary/10 transition-colors hover:text-primary",
            sizeClasses[size],
          )}
          style={{
            backgroundColor: badge.color ? `${badge.color}20` : undefined,
            color: badge.color || undefined,
          }}
        >
          {badge.icon ? <span>{badge.icon}</span> : getBadgeIcon(badge.name)}
          <span>{badge.name}</span>
        </span>
      );

      if (!showTooltip || !badge.description) {
        return badgeContent;
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{badge.name}</p>
              {badge.description && (
                <p className="text-xs text-muted-foreground">
                  {badge.description}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    };

    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap gap-2", className)}
        {...props}
      >
        {visibleBadges.map((badge) => (
          <BadgeItem key={badge.id} badge={badge} />
        ))}
        {hiddenBadges.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className={cn("rounded-full font-medium", sizeClasses[size])}
              >
                +{hiddenBadges.length} more
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>All Badges ({badges.length})</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-96">
                <div className="space-y-3 pr-4">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-muted/50 flex items-start gap-3 rounded-lg p-3"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: badge.color
                            ? `${badge.color}20`
                            : "hsl(var(--muted))",
                          color: badge.color || undefined,
                        }}
                      >
                        {badge.icon ? (
                          <span className="text-lg">{badge.icon}</span>
                        ) : (
                          getBadgeIcon(badge.name)
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{badge.name}</h4>
                        {badge.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {badge.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  },
);
UserBadges.displayName = "UserBadges";

export { UserBadges };
