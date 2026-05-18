/**
 * Framer Motion Animation Variants Library
 *
 * Centralized animation configurations for consistent UX across the app.
 * All animations respect user's motion preferences via `useReducedMotion`.
 */

import { Variants, Transition } from "framer-motion";

// ============================================================================
// Transitions
// ============================================================================

/**
 * Spring physics for natural, bouncy animations
 */
export const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const springSmooth: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 20,
};

/**
 * Ease transitions for predictable animations
 */
export const easeOut: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
};

export const easeInOut: Transition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.3,
};

export const easeFast: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.15,
};

export const easeSlow: Transition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.5,
};

// ============================================================================
// Message Animations
// ============================================================================

/**
 * Message send animation - slide in from bottom with fade
 */
export const messageEntry: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSmooth,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: easeFast,
  },
};

/**
 * Message hover state
 */
export const messageHover: Variants = {
  rest: {
    backgroundColor: "transparent",
  },
  hover: {
    backgroundColor: "var(--muted)",
    transition: easeFast,
  },
};

/**
 * Optimistic message (sending state)
 */
export const messageOptimistic: Variants = {
  initial: {
    opacity: 0.6,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: spring,
  },
};

// ============================================================================
// Reaction Animations
// ============================================================================

/**
 * Emoji reaction burst animation
 */
export const reactionBurst: Variants = {
  initial: {
    scale: 0,
    rotate: -20,
  },
  animate: {
    scale: [0, 1.3, 1],
    rotate: [0, 10, 0],
    transition: {
      duration: 0.4,
      times: [0, 0.6, 1],
      ease: "easeOut",
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: easeFast,
  },
};

/**
 * Reaction pill hover
 */
export const reactionPillHover: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: easeFast,
  },
  tap: {
    scale: 0.95,
    transition: easeFast,
  },
};

/**
 * Add reaction button
 */
export const addReactionButton: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: spring,
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: easeFast,
  },
};

// ============================================================================
// Modal & Dialog Animations
// ============================================================================

/**
 * Modal overlay fade
 */
export const modalOverlay: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: easeOut,
  },
  exit: {
    opacity: 0,
    transition: easeFast,
  },
};

/**
 * Modal content scale and fade
 */
export const modalContent: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: spring,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: easeFast,
  },
};

/**
 * Sheet slide from side
 */
export const sheetSlide = (
  side: "left" | "right" | "top" | "bottom" = "right",
): Variants => {
  const axis = side === "left" || side === "right" ? "x" : "y";
  const direction = side === "left" || side === "top" ? -100 : 100;

  if (axis === "x") {
    return {
      initial: { x: `${direction}%` },
      animate: { x: 0, transition: spring },
      exit: { x: `${direction}%`, transition: easeOut },
    };
  }
  return {
    initial: { y: `${direction}%` },
    animate: { y: 0, transition: spring },
    exit: { y: `${direction}%`, transition: easeOut },
  };
};

// ============================================================================
// Navigation & Page Transitions
// ============================================================================

/**
 * Page transition - fade and slide
 */
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: easeInOut,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: easeFast,
  },
};

/**
 * Channel switch animation
 */
export const channelSwitch: Variants = {
  initial: {
    opacity: 0,
    x: 30,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: springSmooth,
  },
  exit: {
    opacity: 0,
    x: -30,
    transition: easeFast,
  },
};

/**
 * Sidebar expand/collapse
 */
export const sidebarToggle: Variants = {
  collapsed: {
    width: 60,
    transition: spring,
  },
  expanded: {
    width: 256,
    transition: spring,
  },
};

// ============================================================================
// Loading & Skeleton Animations
// ============================================================================

/**
 * Skeleton pulse animation
 */
export const skeletonPulse: Variants = {
  initial: {
    opacity: 0.5,
  },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Shimmer effect for loading states
 */
export const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

/**
 * Spinner rotation
 */
export const spinner: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

/**
 * Staggered children entrance
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: easeOut,
  },
};

// ============================================================================
// UI Element Animations
// ============================================================================

/**
 * Button press animation
 */
export const buttonPress: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: easeFast,
  },
  tap: {
    scale: 0.98,
    transition: easeFast,
  },
};

/**
 * Tooltip fade and slide
 */
export const tooltip: Variants = {
  initial: {
    opacity: 0,
    y: 5,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: easeFast,
  },
  exit: {
    opacity: 0,
    y: 5,
    scale: 0.95,
    transition: { duration: 0.1 },
  },
};

/**
 * Dropdown menu cascade
 */
export const dropdownMenu: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: -10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...easeOut,
      staggerChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: easeFast,
  },
};

export const dropdownItem: Variants = {
  initial: {
    opacity: 0,
    x: -10,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
};

/**
 * Badge notification bounce
 */
export const badgeBounce: Variants = {
  initial: {
    scale: 0,
  },
  animate: {
    scale: [0, 1.2, 1],
    transition: {
      duration: 0.4,
      times: [0, 0.7, 1],
    },
  },
};

/**
 * Floating action button
 */
export const fabFloat: Variants = {
  rest: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.1,
    y: -2,
    transition: spring,
  },
  tap: {
    scale: 0.95,
    y: 0,
  },
};

// ============================================================================
// Notification & Toast Animations
// ============================================================================

/**
 * Toast slide in from top
 */
export const toastSlide: Variants = {
  initial: {
    opacity: 0,
    y: -100,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring,
  },
  exit: {
    opacity: 0,
    y: -100,
    scale: 0.95,
    transition: easeOut,
  },
};

/**
 * Notification badge pulse
 */
export const notificationPulse: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ============================================================================
// Form & Input Animations
// ============================================================================

/**
 * Input focus state
 */
export const inputFocus: Variants = {
  rest: {
    borderColor: "var(--border)",
  },
  focus: {
    borderColor: "var(--primary)",
    boxShadow: "0 0 0 3px rgba(var(--primary-rgb), 0.1)",
    transition: easeFast,
  },
};

/**
 * Form field error shake
 */
export const errorShake: Variants = {
  initial: {
    x: 0,
  },
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
    },
  },
};

/**
 * Success checkmark
 */
export const successCheckmark: Variants = {
  initial: {
    scale: 0,
    rotate: -180,
  },
  animate: {
    scale: 1,
    rotate: 0,
    transition: springBouncy,
  },
};

// ============================================================================
// Scroll Animations
// ============================================================================

/**
 * Scroll reveal from bottom
 */
export const scrollReveal: Variants = {
  initial: {
    opacity: 0,
    y: 50,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: easeOut,
  },
};

/**
 * Parallax scroll effect
 */
export const parallax = (distance: number = 50) => ({
  initial: {
    y: 0,
  },
  animate: {
    y: distance,
  },
});

// ============================================================================
// Theme Transition
// ============================================================================

/**
 * Theme switch animation
 */
export const themeSwitch: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  animate: {
    scale: [1, 0.95, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

// ============================================================================
// Mobile Gestures
// ============================================================================

/**
 * Pull to refresh
 */
export const pullToRefresh: Variants = {
  initial: {
    y: 0,
  },
  pulling: {
    y: 80,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
  refreshing: {
    y: 60,
    transition: spring,
  },
  complete: {
    y: 0,
    transition: spring,
  },
};

/**
 * Swipe to dismiss
 */
export const swipeToDismiss = (
  direction: "left" | "right" = "right",
): Variants => ({
  initial: {
    x: 0,
  },
  swiping: (x: number) => ({
    x,
    transition: { type: "spring", stiffness: 1000, damping: 50 },
  }),
  dismissed: {
    x: direction === "right" ? "100%" : "-100%",
    opacity: 0,
    transition: easeOut,
  },
  reset: {
    x: 0,
    transition: spring,
  },
});

/**
 * Drag reorder
 */
export const dragReorder: Variants = {
  rest: {
    scale: 1,
    boxShadow: "0 0 0 rgba(0,0,0,0)",
  },
  dragging: {
    scale: 1.05,
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    cursor: "grabbing",
    zIndex: 1000,
    transition: easeFast,
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a custom fade variant
 */
export const fade = (duration: number = 0.2): Variants => ({
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration } },
  exit: { opacity: 0, transition: { duration: duration * 0.7 } },
});

/**
 * Create a custom slide variant
 */
export const slide = (
  direction: "up" | "down" | "left" | "right" = "up",
  distance: number = 20,
): Variants => {
  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const value =
    direction === "left" || direction === "up" ? -distance : distance;

  if (axis === "x") {
    return {
      initial: { x: value, opacity: 0 },
      animate: { x: 0, opacity: 1, transition: springSmooth },
      exit: { x: value, opacity: 0, transition: easeFast },
    };
  }
  return {
    initial: { y: value, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: springSmooth },
    exit: { y: value, opacity: 0, transition: easeFast },
  };
};

/**
 * Create a custom scale variant
 */
export const scale = (from: number = 0.8, to: number = 1): Variants => ({
  initial: { scale: from, opacity: 0 },
  animate: { scale: to, opacity: 1, transition: spring },
  exit: { scale: from, opacity: 0, transition: easeFast },
});

/**
 * Combine multiple variants
 */
export const combine = (...variants: Variants[]): Variants => {
  return variants.reduce((acc, variant) => {
    Object.keys(variant).forEach((key) => {
      acc[key] = { ...acc[key], ...variant[key] };
    });
    return acc;
  }, {} as Variants);
};
