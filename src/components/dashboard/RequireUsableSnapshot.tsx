"use client";

import type { ReactNode } from "react";
import { RequireSnapshot } from "./RequireSnapshot";
import { IncompleteSnapshotNotice } from "./IncompleteSnapshotNotice";
import type { SnapshotRecord } from "@/lib/db/schema";

interface RequireUsableSnapshotProps {
  children: (latest: SnapshotRecord) => ReactNode;
}

/**
 * Like RequireSnapshot, but also enforces Orbly's core correctness rule: a
 * snapshot whose validity is "partial" or "invalid" must never feed
 * authoritative relationship analytics (mutuals, doesn't-follow-back,
 * unfollower tracking, etc). Use this instead of RequireSnapshot on every
 * page that computes Set-based relationship results.
 */
export function RequireUsableSnapshot({ children }: RequireUsableSnapshotProps) {
  return (
    <RequireSnapshot>
      {(latest) =>
        latest.validity === "partial" || latest.validity === "invalid" ? (
          <IncompleteSnapshotNotice snapshot={latest} />
        ) : (
          <>{children(latest)}</>
        )
      }
    </RequireSnapshot>
  );
}
