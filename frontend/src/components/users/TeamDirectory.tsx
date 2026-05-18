"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { UserCard, type ExtendedUserProfile } from "./UserCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Users, ChevronDown, ChevronRight, Building2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  color?: string;
  department?: string;
  leaderId?: string;
  members: ExtendedUserProfile[];
}

export interface TeamDirectoryProps extends React.HTMLAttributes<HTMLDivElement> {
  teams: Team[];
  isLoading?: boolean;
  onUserClick?: (user: ExtendedUserProfile) => void;
  onMessage?: (user: ExtendedUserProfile) => void;
  onTeamClick?: (team: Team) => void;
  showDepartments?: boolean;
  defaultExpandedTeams?: string[];
}

// ============================================================================
// Component
// ============================================================================

const TeamDirectory = React.forwardRef<HTMLDivElement, TeamDirectoryProps>(
  (
    {
      className,
      teams,
      isLoading = false,
      onUserClick,
      onMessage,
      onTeamClick,
      showDepartments = true,
      defaultExpandedTeams = [],
      ...props
    },
    ref,
  ) => {
    const [expandedTeams, setExpandedTeams] = React.useState<Set<string>>(
      new Set(defaultExpandedTeams),
    );

    // Group teams by department
    const teamsByDepartment = React.useMemo(() => {
      if (!showDepartments) return { "All Teams": teams };

      const grouped: Record<string, Team[]> = {};
      teams.forEach((team) => {
        const dept = team.department || "Other";
        if (!grouped[dept]) {
          grouped[dept] = [];
        }
        grouped[dept].push(team);
      });
      return grouped;
    }, [teams, showDepartments]);

    const toggleTeam = (teamId: string) => {
      setExpandedTeams((prev) => {
        const next = new Set(prev);
        if (next.has(teamId)) {
          next.delete(teamId);
        } else {
          next.add(teamId);
        }
        return next;
      });
    };

    const getTeamLeader = (team: Team) => {
      if (!team.leaderId) return null;
      return team.members.find((m) => m.id === team.leaderId);
    };

    const getOnlineCount = (team: Team) => {
      return team.members.filter((m) => m.presence === "online").length;
    };

    if (isLoading) {
      return (
        <div ref={ref} className={cn("space-y-4", className)} {...props}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-40 rounded bg-muted" />
                <div className="h-4 w-60 rounded bg-muted" />
              </CardHeader>
            </Card>
          ))}
        </div>
      );
    }

    if (teams.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center py-12 text-center",
            className,
          )}
          {...props}
        >
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No teams found</h3>
          <p className="text-sm text-muted-foreground">
            Teams will appear here once they are created.
          </p>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("space-y-8", className)} {...props}>
        {Object.entries(teamsByDepartment).map(([department, deptTeams]) => (
          <div key={department}>
            {showDepartments && (
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">{department}</h2>
                <Badge variant="secondary" className="ml-2">
                  {deptTeams.length} {deptTeams.length === 1 ? "team" : "teams"}
                </Badge>
              </div>
            )}

            <div className="space-y-4">
              {deptTeams.map((team) => {
                const isExpanded = expandedTeams.has(team.id);
                const leader = getTeamLeader(team);
                const onlineCount = getOnlineCount(team);

                return (
                  <Collapsible
                    key={team.id}
                    open={isExpanded}
                    onOpenChange={() => toggleTeam(team.id)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12 rounded-lg">
                              <AvatarImage
                                src={team.avatarUrl}
                                alt={team.name}
                              />
                              <AvatarFallback
                                className="rounded-lg text-lg font-semibold"
                                style={{ backgroundColor: team.color }}
                              >
                                {team.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">
                                  {team.name}
                                </CardTitle>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              {team.description && (
                                <CardDescription className="mt-1 line-clamp-1">
                                  {team.description}
                                </CardDescription>
                              )}
                              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  <span>{team.members.length} members</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-green-500" />
                                  <span>{onlineCount} online</span>
                                </div>
                                {leader && (
                                  <div className="flex items-center gap-1">
                                    <span>Lead:</span>
                                    <span className="font-medium">
                                      {leader.displayName}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {onTeamClick && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTeamClick(team);
                                }}
                              >
                                View Team
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="border-t pt-0">
                          <ScrollArea className="max-h-96">
                            <div className="space-y-1 pt-4">
                              {/* Team leader first */}
                              {leader && (
                                <div className="mb-4">
                                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                                    Team Lead
                                  </p>
                                  <UserCard
                                    user={leader}
                                    variant="compact"
                                    onViewProfile={() => onUserClick?.(leader)}
                                    onMessage={() => onMessage?.(leader)}
                                    showActions={false}
                                  />
                                </div>
                              )}
                              {/* Other members */}
                              <p className="mb-2 text-xs font-medium text-muted-foreground">
                                Members
                              </p>
                              {team.members
                                .filter((m) => m.id !== team.leaderId)
                                .map((member) => (
                                  <UserCard
                                    key={member.id}
                                    user={member}
                                    variant="compact"
                                    onViewProfile={() => onUserClick?.(member)}
                                    onMessage={() => onMessage?.(member)}
                                    showActions={false}
                                  />
                                ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  },
);
TeamDirectory.displayName = "TeamDirectory";

export { TeamDirectory };
