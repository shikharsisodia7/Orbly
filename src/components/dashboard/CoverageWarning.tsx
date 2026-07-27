import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatFullDate } from "@/lib/utils/format";
import type { SnapshotRecord } from "@/lib/db/schema";

/**
 * Meta sometimes returns a date-windowed export even when "All time" was
 * requested. When that happens the follower/following counts are genuinely
 * incomplete, so we say so rather than presenting them as totals.
 */
export function CoverageWarning({ snapshot }: { snapshot: SnapshotRecord }) {
  if (!snapshot.coverageLooksLimited || !snapshot.coverageFromIso || !snapshot.coverageToIso) {
    return null;
  }

  return (
    <div className="flex gap-3 rounded-2xl border border-orange/30 bg-orange-soft/50 p-5">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-orange" />
      <div className="text-sm leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">These counts are incomplete.</p>
        <p className="mt-1">
          The export behind this snapshot only covers{" "}
          <strong>
            {formatFullDate(snapshot.coverageFromIso)} – {formatFullDate(snapshot.coverageToIso)}
          </strong>
          , not your full history — so anyone who followed you before that window is missing here.
          That&apos;s why these numbers can look far off from what Instagram shows on your profile.
        </p>
        <p className="mt-2">
          <Link href="/app/import" className="font-medium text-ink underline">
            Import a new export
          </Link>{" "}
          with the date range set to <strong>All time</strong> to get accurate totals.
        </p>
      </div>
    </div>
  );
}
