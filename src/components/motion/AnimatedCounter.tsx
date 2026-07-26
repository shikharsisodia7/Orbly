"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { formatCount } from "@/lib/utils/format";

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({ value, className, duration = 0.9 }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const from = hasMountedRef.current ? display : 0;
    hasMountedRef.current = true;

    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, prefersReducedMotion]);

  const shown = prefersReducedMotion ? value : display;
  return <span className={className}>{formatCount(shown)}</span>;
}
