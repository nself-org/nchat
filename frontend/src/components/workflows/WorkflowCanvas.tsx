"use client";

/**
 * WorkflowCanvas - Drag-drop canvas for workflow steps
 *
 * Handles rendering of workflow nodes and edges, pan/zoom, and interactions
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";
import { WorkflowNode } from "./WorkflowNode";
import { WorkflowEdge } from "./WorkflowEdge";
import type { Position, StepType } from "@/lib/workflows/workflow-types";

interface WorkflowCanvasProps {
  className?: string;
}

export function WorkflowCanvas({ className }: WorkflowCanvasProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState<Position>({ x: 0, y: 0 });

  const {
    workflow,
    canvas,
    draggedStepType,
    isConnecting,
    connectionStart,
    setPan,
    addStep,
    endDrag,
    clearSelection,
    cancelConnection,
  } = useWorkflowBuilderStore();

  // Handle mouse wheel for zoom
  React.useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const store = useWorkflowBuilderStore.getState();
        store.setZoom(store.canvas.zoom + delta);
      }
    };

    canvasEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvasEl.removeEventListener("wheel", handleWheel);
  }, []);

  // Handle pan start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle mouse or Alt+Left click
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvas.pan.x, y: e.clientY - canvas.pan.y });
    } else if (e.button === 0 && e.target === canvasRef.current) {
      // Left click on canvas background
      clearSelection();
      if (isConnecting) {
        cancelConnection();
      }
    }
  };

  // Handle pan move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  // Handle pan end
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedStepType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const position: Position = {
      x: (e.clientX - rect.left - canvas.pan.x) / canvas.zoom,
      y: (e.clientY - rect.top - canvas.pan.y) / canvas.zoom,
    };

    addStep(draggedStepType, position);
    endDrag();
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  if (!workflow) return null;

  return (
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
    <div
      ref={canvasRef}
      className={cn(
        "bg-muted/20 relative overflow-hidden",
        isPanning && "cursor-grabbing",
        className,
      )}
      role="application"
      aria-label="Workflow canvas"
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Grid background */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{
          backgroundImage: `
            radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * canvas.zoom}px ${20 * canvas.zoom}px`,
          backgroundPosition: `${canvas.pan.x}px ${canvas.pan.y}px`,
        }}
      >
        {/* Edges */}
        <g
          transform={`translate(${canvas.pan.x}, ${canvas.pan.y}) scale(${canvas.zoom})`}
        >
          {workflow.edges.map((edge) => {
            const sourceStep = workflow.steps.find(
              (s) => s.id === edge.sourceId,
            );
            const targetStep = workflow.steps.find(
              (s) => s.id === edge.targetId,
            );

            if (!sourceStep || !targetStep) return null;

            return (
              <WorkflowEdge
                key={edge.id}
                edge={edge}
                sourcePosition={{
                  x: sourceStep.position.x + 120,
                  y: sourceStep.position.y + 40,
                }}
                targetPosition={{
                  x: targetStep.position.x,
                  y: targetStep.position.y + 40,
                }}
                isSelected={canvas.selectedEdgeId === edge.id}
              />
            );
          })}

          {/* Connection line being drawn */}
          {isConnecting && connectionStart && (
            <ConnectionLine
              startStep={workflow.steps.find(
                (s) => s.id === connectionStart.stepId,
              )}
              canvasRef={canvasRef}
              zoom={canvas.zoom}
              pan={canvas.pan}
            />
          )}
        </g>
      </svg>

      {/* Nodes */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {workflow.steps.map((step) => (
          <WorkflowNode
            key={step.id}
            step={step}
            isSelected={canvas.selectedStepIds.includes(step.id)}
          />
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="bg-card/80 absolute bottom-4 right-4 rounded px-2 py-1 text-xs text-muted-foreground">
        {Math.round(canvas.zoom * 100)}%
      </div>
    </div>
  );
}

// Connection line component for drawing connections
function ConnectionLine({
  startStep,
  canvasRef,
  zoom,
  pan,
}: {
  startStep?: { position: Position } | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: Position;
}) {
  const [mousePos, setMousePos] = React.useState<Position>({ x: 0, y: 0 });

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [canvasRef, zoom, pan]);

  if (!startStep) return null;

  const startX = startStep.position.x + 120;
  const startY = startStep.position.y + 40;

  return (
    <path
      d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${mousePos.x - 50} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth="2"
      strokeDasharray="5,5"
      className="pointer-events-none"
    />
  );
}

export default WorkflowCanvas;
