import { cn } from "@/lib/utils/cn";

const GRADIENT_PAIRS: [string, string][] = [
  ["#F2545B", "#F0A202"],
  ["#6C5CE7", "#3B82F6"],
  ["#3B82F6", "#1F9D55"],
  ["#F0A202", "#EE4F57"],
  ["#6C5CE7", "#EE4F57"],
  ["#1F9D55", "#3B82F6"],
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

interface AvatarProps {
  username: string;
  size?: number;
  className?: string;
}

export function Avatar({ username, size = 36, className }: AvatarProps) {
  const hash = hashString(username);
  const [from, to] = GRADIENT_PAIRS[hash % GRADIENT_PAIRS.length];
  const initial = username.charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
