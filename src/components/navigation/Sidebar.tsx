"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "./nav-items";
import { usePendingQueueCount } from "@/hooks/useQueue";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();
  const queueCount = usePendingQueueCount();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-cream/40 md:flex">
      <div className="flex h-16 items-center px-6">
        <Link href="/app/dashboard">
          <Wordmark size="sm" />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:bg-white/60 hover:text-ink"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-ink" />
              )}
              <item.icon size={17} className={active ? "text-ink" : "text-ink-faint"} />
              <span className="flex-1">{item.label}</span>
              {item.showQueueBadge && queueCount > 0 && (
                <span className="rounded-full bg-rose px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {queueCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-border px-3 py-3">
        {SECONDARY_NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:bg-white/60 hover:text-ink"
              )}
            >
              <item.icon size={17} className={active ? "text-ink" : "text-ink-faint"} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
