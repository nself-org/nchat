"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { pageTransition, channelSwitch, fade } from "@/lib/animations";

interface PageTransitionProps {
  children: React.ReactNode;
  mode?: "fade" | "slide" | "channel";
  className?: string;
}

/**
 * Page transition wrapper component
 * Animates page changes with smooth transitions
 */
export function PageTransition({
  children,
  mode = "fade",
  className,
}: PageTransitionProps) {
  const pathname = usePathname();

  const variants = React.useMemo(() => {
    switch (mode) {
      case "slide":
        return pageTransition;
      case "channel":
        return channelSwitch;
      case "fade":
      default:
        return fade(0.3);
    }
  }, [mode]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Channel transition wrapper
 * Specialized for channel switching animations
 */
export function ChannelTransition({
  children,
  channelId,
  className,
}: {
  children: React.ReactNode;
  channelId: string;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={channelId}
        variants={channelSwitch}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Layout animation wrapper
 * For smooth layout shifts
 */
export function LayoutAnimation({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div layout className={className}>
      {children}
    </motion.div>
  );
}
