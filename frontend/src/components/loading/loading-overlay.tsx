"use client";

import { cn } from "@/lib/utils";
import { Spinner, type SpinnerProps } from "./spinner";

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isLoading?: boolean;
  /** Loading message */
  message?: string;
  /** Spinner size */
  spinnerSize?: SpinnerProps["size"];
  /** Spinner color */
  spinnerColor?: SpinnerProps["color"];
  /** Background opacity */
  opacity?: "light" | "medium" | "heavy" | "solid";
  /** Whether to blur the background */
  blur?: boolean;
  /** Position: covers parent container or full screen */
  fullScreen?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Children to render behind the overlay */
  children?: React.ReactNode;
}

const opacityClasses = {
  light: "bg-background/40",
  medium: "bg-background/60",
  heavy: "bg-background/80",
  solid: "bg-background",
};

/**
 * Semi-transparent overlay with centered loading spinner
 * Can be used over any container or full screen
 */
export function LoadingOverlay({
  isLoading = true,
  message,
  spinnerSize = "lg",
  spinnerColor = "default",
  opacity = "medium",
  blur = true,
  fullScreen = false,
  className,
  children,
}: LoadingOverlayProps) {
  if (!isLoading && !children) {
    return null;
  }

  return (
    <div className={cn("relative", fullScreen && "h-screen w-screen")}>
      {children}

      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 z-50 flex flex-col items-center justify-center",
            opacityClasses[opacity],
            blur && "backdrop-blur-sm",
            fullScreen && "fixed",
            className,
          )}
        >
          <Spinner size={spinnerSize} color={spinnerColor} />

          {message && (
            <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Card-level loading overlay
 * Designed to fit within card/panel components
 */
export function CardLoadingOverlay({
  isLoading = true,
  message,
  className,
}: Pick<LoadingOverlayProps, "isLoading" | "message" | "className">) {
  if (!isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center",
        "bg-background/60 rounded-lg backdrop-blur-[2px]",
        className,
      )}
    >
      <Spinner size="md" />
      {message && (
        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

/**
 * Inline loading overlay for smaller areas
 */
export function InlineLoadingOverlay({
  isLoading = true,
  className,
}: Pick<LoadingOverlayProps, "isLoading" | "className">) {
  if (!isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center",
        "bg-background/50",
        className,
      )}
    >
      <Spinner size="sm" />
    </div>
  );
}

/**
 * Modal loading overlay
 * Designed for use within dialog/modal components
 */
export function ModalLoadingOverlay({
  isLoading = true,
  message = "Processing...",
  className,
}: Pick<LoadingOverlayProps, "isLoading" | "message" | "className">) {
  if (!isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center",
        "bg-background/90 rounded-lg backdrop-blur-sm",
        className,
      )}
    >
      <Spinner size="lg" />
      <p className="mt-4 text-sm font-medium text-foreground">{message}</p>
    </div>
  );
}

/**
 * Loading overlay wrapper component
 * Convenience wrapper that positions children and overlay together
 */
export function WithLoadingOverlay({
  isLoading,
  message,
  opacity = "medium",
  blur = true,
  className,
  overlayClassName,
  children,
}: LoadingOverlayProps & { overlayClassName?: string }) {
  return (
    <div className={cn("relative", className)}>
      {children}

      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 z-50 flex flex-col items-center justify-center",
            opacityClasses[opacity],
            blur && "backdrop-blur-sm",
            overlayClassName,
          )}
        >
          <Spinner size="lg" />
          {message && (
            <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
