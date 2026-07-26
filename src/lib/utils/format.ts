import { format } from "date-fns";

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatCount(n: number): string {
  return numberFormatter.format(n);
}

export function formatShortDate(iso: string): string {
  return format(new Date(iso), "MMM d");
}

export function formatFullDate(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy");
}

export function formatDateRange(fromIso: string, toIso: string): string {
  return `${formatShortDate(fromIso)} – ${formatShortDate(toIso)}`;
}

export function formatSignedDelta(delta: number): string {
  if (delta === 0) return "±0";
  return delta > 0 ? `+${formatCount(delta)}` : `-${formatCount(Math.abs(delta))}`;
}
