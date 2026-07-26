/**
 * The Orbly mark: three arcs of a ring, each in one of the brand's three
 * accent colors, standing in for the people who surround "you" (the
 * implied center point). Original geometry — not derived from any
 * third-party logo.
 */
interface LogoProps {
  size?: number;
  className?: string;
  /** When true, renders all arcs in currentColor instead of brand colors (for monochrome contexts). */
  monochrome?: boolean;
}

const ARCS = [
  { d: "M16,5 A11,11 0 0,1 26.83,17.91", color: "#F2545B" }, // rose
  { d: "M25.53,21.5 A11,11 0 0,1 8.93,24.43", color: "#6C5CE7" }, // violet
  { d: "M6.47,21.5 A11,11 0 0,1 12.24,5.66", color: "#3B82F6" }, // blue
];

export function Logo({ size = 28, className, monochrome = false }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Orbly"
    >
      {ARCS.map((arc) => (
        <path
          key={arc.d}
          d={arc.d}
          stroke={monochrome ? "currentColor" : arc.color}
          strokeWidth={3.4}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
