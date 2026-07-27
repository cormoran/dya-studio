import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageTransitionProps {
  children: ReactNode;
  /** Whether this page is the visible one. */
  isActive: boolean;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

// The page is animated in place rather than through AnimatePresence: pages stay
// mounted while their tab is inactive (so they keep their state), and a keyed
// AnimatePresence would remount — and therefore reset — them on every switch.
export function PageTransition({ children, isActive }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate={isActive ? "enter" : "exit"}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
