"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useScrollAnimation, useParallax } from "@/hooks/use-scroll-animation";
import { scrollReveal, staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  threshold?: number;
}

/**
 * Scroll reveal component
 * Animates children when they come into view
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  once = true,
  threshold = 0.2,
}: ScrollRevealProps) {
  const { ref, isInView } = useScrollAnimation({ once, threshold });

  return (
    <motion.div
      ref={ref}
      variants={scrollReveal}
      initial="initial"
      animate={isInView ? "animate" : "initial"}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered scroll reveal
 * Reveals children with a stagger effect
 */
export function StaggeredScrollReveal({
  children,
  className,
  once = true,
  threshold = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
  threshold?: number;
}) {
  const { ref, isInView } = useScrollAnimation({ once, threshold });

  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="initial"
      animate={isInView ? "animate" : "initial"}
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={staggerItem}>{child}</motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Parallax container
 * Creates a parallax scrolling effect
 */
export function ParallaxContainer({
  children,
  className,
  offset = 50,
}: {
  children: React.ReactNode;
  className?: string;
  offset?: number;
}) {
  const { ref, y } = useParallax(offset);

  return (
    <motion.div
      ref={ref}
      style={{
        y,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Fade in on scroll
 */
export function FadeInOnScroll({
  children,
  className,
  direction = "up",
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
  once?: boolean;
}) {
  const { ref, isInView } = useScrollAnimation({ once });

  const variants = {
    initial: {
      opacity: 0,
      x: direction === "left" ? -50 : direction === "right" ? 50 : 0,
      y: direction === "up" ? 50 : direction === "down" ? -50 : 0,
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="initial"
      animate={isInView ? "animate" : "initial"}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scale in on scroll
 */
export function ScaleInOnScroll({
  children,
  className,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
}) {
  const { ref, isInView } = useScrollAnimation({ once });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
