"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { formatCount, formatFullDate } from "@/lib/utils/format";
import { VALIDITY_REASON_LABEL } from "@/lib/instagram/validity";
import type { SnapshotRecord } from "@/lib/db/schema";

/**
 * Replaces the normal analytics view for a snapshot whose validity is
 * "partial" or "invalid". Per Orbly's data-correctness rule, a snapshot that
 * cannot be trusted as a complete current relationship graph must never
 * present Set-difference results (mutuals, doesn't-follow-back, etc) as if
 * they were authoritative — even though the math on the incomplete data is
 * technically correct, the inputs are not.
 */
export function IncompleteSnapshotNotice({ snapshot }: { snapshot: SnapshotRecord }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="rounded-2xl border border-orange/30 bg-orange-soft/40 p-6">
      <div className="flex gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-orange" />
        <div>
          <h2 className="text-base font-semibold text-ink">
            {snapshot.validity === "invalid" ? "This export can't be used" : "This snapshot is incomplete"}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft">
            The export from {formatFullDate(snapshot.createdAt)} cannot be relied on as a complete
            current picture of your followers and following, so Orbly isn&apos;t showing mutuals,
            doesn&apos;t-follow-back, or change tracking from it — those numbers would be
            mathematically consistent with this file but not accurate to your real Instagram
            account.
          </p>

          <ul className="mt-3 space-y-1 text-sm text-ink-soft">
            {snapshot.validityReasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-orange">•</span>
                <span>{VALIDITY_REASON_LABEL[reason]}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href="/app/import" size="sm">
              Import a Complete Export
            </ButtonLink>
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-white"
            >
              {showRaw ? "Hide" : "View"} raw import counts
              <ChevronDown size={13} className={showRaw ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
          </div>

          {showRaw && (
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-border bg-white p-4 sm:w-80">
              <div>
                <p className="text-xs text-ink-faint">Follower records found</p>
                <p className="mt-1 text-lg font-semibold text-ink">{formatCount(snapshot.followersCount)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Following records found</p>
                <p className="mt-1 text-lg font-semibold text-ink">{formatCount(snapshot.followingCount)}</p>
              </div>
              <p className="col-span-2 text-xs text-ink-faint">
                These are raw record counts from the file, not a verified snapshot of your current
                relationships.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
