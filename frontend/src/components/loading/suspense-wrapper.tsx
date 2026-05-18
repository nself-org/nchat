"use client";

import { Suspense, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CenteredSpinner } from "./spinner";

interface SuspenseWrapperProps {
  /** Fallback component or element to show while loading */
  fallback?: ReactNode;
  /** Children to render (typically lazy-loaded components) */
  children: ReactNode;
  /** Additional CSS classes for the fallback container */
  className?: string;
}

/**
 * Suspense wrapper with default loading fallback
 * Use to wrap lazy-loaded components
 */
export function SuspenseWrapper({
  fallback,
  children,
  className,
}: SuspenseWrapperProps) {
  const defaultFallback = (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        className,
      )}
    >
      <CenteredSpinner text="Loading..." />
    </div>
  );

  return <Suspense fallback={fallback ?? defaultFallback}>{children}</Suspense>;
}

interface LazyComponentWrapperProps<P extends object> {
  /** The lazy-loaded component */
  component: ComponentType<P>;
  /** Props to pass to the component */
  props?: P;
  /** Custom fallback */
  fallback?: ReactNode;
  /** Container className */
  className?: string;
}

/**
 * Wrapper for lazy-loaded components with typed props
 */
export function LazyComponentWrapper<P extends object>({
  component: Component,
  props = {} as P,
  fallback,
  className,
}: LazyComponentWrapperProps<P>) {
  return (
    <SuspenseWrapper fallback={fallback} className={className}>
      <Component {...props} />
    </SuspenseWrapper>
  );
}

interface PageSuspenseProps {
  /** Page content */
  children: ReactNode;
  /** Page-specific skeleton component */
  skeleton?: ReactNode;
  /** Minimum height for the loading container */
  minHeight?: string;
}

/**
 * Page-level suspense wrapper
 * Provides consistent loading experience for route segments
 */
export function PageSuspense({
  children,
  skeleton,
  minHeight = "100vh",
}: PageSuspenseProps) {
  const fallback = skeleton ?? (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      <CenteredSpinner size="xl" text="Loading page..." />
    </div>
  );

  return <Suspense fallback={fallback}>{children}</Suspense>;
}

interface SectionSuspenseProps {
  /** Section content */
  children: ReactNode;
  /** Section-specific skeleton */
  skeleton?: ReactNode;
  /** Minimum height for the section */
  minHeight?: string | number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Section-level suspense wrapper
 * For lazy-loading parts of a page
 */
export function SectionSuspense({
  children,
  skeleton,
  minHeight = 200,
  className,
}: SectionSuspenseProps) {
  const heightStyle =
    typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  const fallback = skeleton ?? (
    <div
      className={cn(
        "bg-muted/30 flex items-center justify-center rounded-lg",
        className,
      )}
      style={{ minHeight: heightStyle }}
    >
      <CenteredSpinner size="md" />
    </div>
  );

  return <Suspense fallback={fallback}>{children}</Suspense>;
}

interface ModalSuspenseProps {
  /** Modal content */
  children: ReactNode;
  /** Custom fallback */
  fallback?: ReactNode;
}

/**
 * Modal-level suspense wrapper
 * For lazy-loaded modal content
 */
export function ModalSuspense({ children, fallback }: ModalSuspenseProps) {
  const defaultFallback = (
    <div className="flex h-48 items-center justify-center">
      <CenteredSpinner size="lg" text="Loading..." />
    </div>
  );

  return <Suspense fallback={fallback ?? defaultFallback}>{children}</Suspense>;
}

interface ListSuspenseProps {
  /** List content */
  children: ReactNode;
  /** Number of skeleton items to show */
  skeletonCount?: number;
  /** Custom skeleton item renderer */
  renderSkeletonItem?: (index: number) => ReactNode;
  /** Gap between skeleton items */
  gap?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * List-level suspense wrapper
 * Shows skeleton items while list data loads
 */
export function ListSuspense({
  children,
  skeletonCount = 5,
  renderSkeletonItem,
  gap = 8,
  className,
}: ListSuspenseProps) {
  const defaultSkeletonItem = (index: number) => (
    <div
      key={index}
      className="h-12 w-full animate-pulse rounded-md bg-muted"
    />
  );

  const fallback = (
    <div className={cn("flex flex-col", className)} style={{ gap: `${gap}px` }}>
      {Array.from({ length: skeletonCount }).map((_, i) =>
        renderSkeletonItem ? renderSkeletonItem(i) : defaultSkeletonItem(i),
      )}
    </div>
  );

  return <Suspense fallback={fallback}>{children}</Suspense>;
}

/**
 * Higher-order component for adding suspense to lazy components
 */
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode,
) {
  return function SuspenseComponent(props: P) {
    return (
      <SuspenseWrapper fallback={fallback}>
        <Component {...props} />
      </SuspenseWrapper>
    );
  };
}
