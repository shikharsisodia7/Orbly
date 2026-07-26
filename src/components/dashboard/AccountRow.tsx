import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

interface AccountRowProps {
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  badge?: ReactNode;
  subtext?: ReactNode;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  actions?: ReactNode;
}

export function AccountRow({
  normalizedUsername,
  displayUsername,
  profileUrl,
  badge,
  subtext,
  selectable,
  selected,
  onToggleSelect,
  actions,
}: AccountRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
        selected ? "bg-blue-soft/40" : "hover:bg-surface"
      )}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onToggleSelect}
          aria-label={`Select @${displayUsername}`}
          className="h-4 w-4 shrink-0 rounded border-border-strong accent-ink"
        />
      )}
      <Avatar username={normalizedUsername} size={34} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">@{displayUsername}</p>
        {subtext && <p className="truncate text-xs text-ink-faint">{subtext}</p>}
      </div>
      {badge}
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface hover:text-ink"
      >
        <span className="hidden sm:inline">Open Profile</span>
        <ExternalLink size={13} />
      </a>
      {actions}
    </div>
  );
}
