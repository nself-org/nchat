"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useScroll, useTransform, MotionValue } from "framer-motion";

/**
 * Hook to detect if an element is in view
 */
export function useScrollAnimation(options?: {
  threshold?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: options?.once ?? true,
    amount: options?.threshold ?? 0.2,
  });

  return { ref, isInView };
}

/**
 * Hook for parallax scrolling effects
 */
export function useParallax(distance: number = 50) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  return { ref, y };
}

/**
 * Hook for scroll-triggered progress
 */
export function useScrollProgress(
  target?: React.RefObject<HTMLElement | null>,
) {
  const { scrollYProgress } = useScroll({
    target: target,
  });

  return scrollYProgress;
}

/**
 * Hook to detect scroll direction
 */
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(
    null,
  );
  const [prevScrollY, setPrevScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > prevScrollY) {
        setScrollDirection("down");
      } else if (currentScrollY < prevScrollY) {
        setScrollDirection("up");
      }

      setPrevScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prevScrollY]);

  return scrollDirection;
}

/**
 * Hook for auto-hiding header on scroll
 */
export function useAutoHideOnScroll(threshold: number = 100) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show header when scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < threshold) {
        setIsVisible(true);
      }
      // Hide header when scrolling down past threshold
      else if (currentScrollY > threshold && currentScrollY > lastScrollY) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, threshold]);

  return isVisible;
}

/**
 * Hook for scroll snap points
 */
export function useScrollSnap(
  containerRef: React.RefObject<HTMLElement>,
  snapPoints: number[],
) {
  const [activeSnapPoint, setActiveSnapPoint] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop;
      const containerHeight = container.clientHeight;

      // Find closest snap point
      const closest = snapPoints.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev * containerHeight - scrollPosition);
        const currDiff = Math.abs(curr * containerHeight - scrollPosition);
        return currDiff < prevDiff ? curr : prev;
      });

      const index = snapPoints.indexOf(closest);
      if (index !== activeSnapPoint) {
        setActiveSnapPoint(index);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef, snapPoints, activeSnapPoint]);

  return activeSnapPoint;
}
