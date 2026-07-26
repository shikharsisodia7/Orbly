"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserX, ListChecks, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "./nav-items";
import { usePendingQueueCount } from "@/hooks/useQueue";
import { cn } from "@/lib/utils/cn";
import { Wordmark } from "@/components/brand/Wordmark";

const BOTTOM_ITEMS = [
  { href: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/app/nonfollowers", label: "Non-followers", icon: UserX },
  { href: "/app/queue", label: "Queue", icon: ListChecks },
];

export function MobileNav() {
  const pathname = usePathname();
  const queueCount = usePendingQueueCount();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center border-t border-border bg-white/95 backdrop-blur md:hidden"
        aria-label="Main"
      >
        {BOTTOM_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 text-[11px] font-medium",
                active ? "text-ink" : "text-ink-faint"
              )}
            >
              <item.icon size={19} />
              {item.label}
              {item.href === "/app/queue" && queueCount > 0 && (
                <span className="absolute right-1/4 top-1 h-4 min-w-4 rounded-full bg-rose px-1 text-[9px] font-semibold leading-4 text-white">
                  {queueCount}
                </span>
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 text-[11px] font-medium text-ink-faint"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu size={19} />
          More
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-near-black/50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-white p-5 md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between">
                <Wordmark size="sm" />
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-md p-1.5 hover:bg-surface">
                  <X size={20} />
                </button>
              </div>
              <div className="mt-6 flex flex-col gap-0.5">
                {[...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS].map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                        active ? "bg-surface text-ink" : "text-ink-soft"
                      )}
                    >
                      <item.icon size={18} className={active ? "text-ink" : "text-ink-faint"} />
                      {item.label}
                      {item.showQueueBadge && queueCount > 0 && (
                        <span className="ml-auto rounded-full bg-rose px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {queueCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
