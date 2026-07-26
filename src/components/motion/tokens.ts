import type { Transition, Variants } from "framer-motion";

/**
 * The three motion tiers used across Orbly. Keep durations within these
 * bands rather than inventing new ones per component.
 */
export const DURATION = {
  fast: 0.15, // micro interactions: button press, toggle, hover
  standard: 0.26, // tab switches, row enter/exit, filtering
  large: 0.48, // page-level transitions, modal open, hero sequences
} as const;

export const EASE = [0.22, 1, 0.36, 1] as const;

export const springStandard: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 28,
  mass: 0.9,
};

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.7,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.standard, ease: EASE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.standard, ease: EASE } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045,
    },
  },
};

export const rowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.fast, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE } },
};
