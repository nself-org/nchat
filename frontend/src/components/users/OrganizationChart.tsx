"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type ExtendedUserProfile } from "./UserCard";
import { UserAvatar } from "@/components/user/user-avatar";
import { RoleBadge } from "@/components/user/role-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface OrgNode {
  user: ExtendedUserProfile;
  directReports: OrgNode[];
  isExpanded?: boolean;
}

export interface OrganizationChartProps extends React.HTMLAttributes<HTMLDivElement> {
  rootNode: OrgNode;
  onUserClick?: (user: ExtendedUserProfile) => void;
  onMessage?: (user: ExtendedUserProfile) => void;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

// ============================================================================
// OrgChartNode Component
// ============================================================================

interface OrgChartNodeProps {
  node: OrgNode;
  onUserClick?: (user: ExtendedUserProfile) => void;
  onMessage?: (user: ExtendedUserProfile) => void;
  onToggleExpand?: (userId: string) => void;
  level?: number;
}

function OrgChartNode({
  node,
  onUserClick,
  onMessage,
  onToggleExpand,
  level = 0,
}: OrgChartNodeProps) {
  const hasReports = node.directReports.length > 0;
  const isExpanded = node.isExpanded ?? true;

  return (
    <div className="flex flex-col items-center">
      {/* User card */}
      <Card
        className={cn(
          "w-56 cursor-pointer transition-shadow hover:shadow-md",
          level === 0 && "border-primary",
        )}
        onClick={() => onUserClick?.(node.user)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <UserAvatar
              user={node.user}
              size="md"
              presence={node.user.presence}
            />
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-medium">
                {node.user.displayName}
              </h4>
              <p className="truncate text-xs text-muted-foreground">
                {node.user.title || `@${node.user.username}`}
              </p>
              <div className="mt-1">
                <RoleBadge role={node.user.role} size="xs" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expand/collapse button */}
      {hasReports && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.(node.user.id);
          }}
          className="hover:bg-muted/80 mt-2 rounded-full bg-muted p-1 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Connector line */}
      {hasReports && isExpanded && <div className="h-6 w-0.5 bg-border" />}

      {/* Direct reports */}
      {hasReports && isExpanded && (
        <div className="flex items-start gap-4">
          {/* Horizontal connector */}
          {node.directReports.length > 1 && (
            <div
              className="absolute h-0.5 bg-border"
              style={{
                width: `calc(100% - ${56 * 4}px)`,
                left: "50%",
                transform: "translateX(-50%)",
                marginTop: "-24px",
              }}
            />
          )}

          {node.directReports.map((report, index) => (
            <div key={report.user.id} className="flex flex-col items-center">
              {/* Vertical connector to horizontal line */}
              <div className="h-6 w-0.5 bg-border" />
              <OrgChartNode
                node={report}
                onUserClick={onUserClick}
                onMessage={onMessage}
                onToggleExpand={onToggleExpand}
                level={level + 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const OrganizationChart = React.forwardRef<
  HTMLDivElement,
  OrganizationChartProps
>(
  (
    {
      className,
      rootNode,
      onUserClick,
      onMessage,
      zoomLevel: controlledZoom,
      onZoomChange,
      ...props
    },
    ref,
  ) => {
    const [internalZoom, setInternalZoom] = React.useState(1);
    const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(
      new Set(),
    );

    const zoom = controlledZoom ?? internalZoom;
    const setZoom = onZoomChange ?? setInternalZoom;

    // Initialize all nodes as expanded
    React.useEffect(() => {
      const collectIds = (node: OrgNode): string[] => {
        return [node.user.id, ...node.directReports.flatMap(collectIds)];
      };
      setExpandedNodes(new Set(collectIds(rootNode)));
    }, [rootNode]);

    const handleToggleExpand = (userId: string) => {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return next;
      });
    };

    const handleZoomIn = () => {
      setZoom(Math.min(zoom + ZOOM_STEP, MAX_ZOOM));
    };

    const handleZoomOut = () => {
      setZoom(Math.max(zoom - ZOOM_STEP, MIN_ZOOM));
    };

    const handleResetZoom = () => {
      setZoom(1);
    };

    // Apply expanded state to nodes
    const applyExpandedState = (node: OrgNode): OrgNode => ({
      ...node,
      isExpanded: expandedNodes.has(node.user.id),
      directReports: node.directReports.map(applyExpandedState),
    });

    const displayNode = applyExpandedState(rootNode);

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        {/* Zoom controls */}
        <div className="bg-background/80 absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border p-2 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-sm">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleResetZoom}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Chart content */}
        <ScrollArea className="h-full w-full">
          <div
            className="min-w-max p-8"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
            }}
          >
            <OrgChartNode
              node={displayNode}
              onUserClick={onUserClick}
              onMessage={onMessage}
              onToggleExpand={handleToggleExpand}
            />
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  },
);
OrganizationChart.displayName = "OrganizationChart";

export { OrganizationChart };
