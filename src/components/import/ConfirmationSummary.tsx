import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCount, formatFullDate } from "@/lib/utils/format";
import type { ParsedExport } from "@/lib/instagram/types";
import { computeCurrentRelationships } from "@/lib/instagram/comparisons";

interface ConfirmationSummaryProps {
  parsed: ParsedExport;
  onConfirm: () => void;
  onCancel: () => void;
  creating: boolean;
}

export function ConfirmationSummary({ parsed, onConfirm, onCancel, creating }: ConfirmationSummaryProps) {
  const { mutuals, doesNotFollowBack, youDontFollowBack } = computeCurrentRelationships(
    parsed.followers,
    parsed.following
  );

  const rows = [
    { label: "Followers", value: parsed.followers.length },
    { label: "Following", value: parsed.following.length },
    { label: "Mutuals", value: mutuals.length },
    { label: "Don't Follow You Back", value: doesNotFollowBack.length },
    { label: "You Don't Follow Back", value: youDontFollowBack.length },
  ];

  const coverage = parsed.diagnostics.coverage;

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-7">
      <p className="text-sm font-semibold text-ink">Instagram export found</p>

      {coverage?.looksLimited && (
        <div className="mt-4 flex gap-3 rounded-xl border border-orange/30 bg-orange-soft/50 p-4">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-orange" />
          <div className="text-xs leading-relaxed text-ink-soft">
            <p className="font-semibold text-ink">This export doesn&apos;t cover all time.</p>
            <p className="mt-1">
              Meta says this file only covers{" "}
              <strong>
                {formatFullDate(coverage.fromIso)} – {formatFullDate(coverage.toIso)}
              </strong>{" "}
              (about {Math.round(coverage.spanDays / 30)} months), so followers from before that
              window are missing and these counts will be lower than your real totals.
            </p>
            <p className="mt-1.5">
              To fix this, request a new export and set the date range to{" "}
              <strong>All time</strong> before submitting.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <p className="text-xs text-ink-faint">{row.label}</p>
            <p className="mt-1 text-xl font-semibold text-ink">{formatCount(row.value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-cream p-4 text-xs text-ink-soft">
        <p className="font-medium text-ink-faint">Files used</p>
        <p className="mt-1">{[...parsed.diagnostics.followerFilesUsed, ...parsed.diagnostics.followingFilesUsed].join(", ")}</p>
        {parsed.diagnostics.ignoredFileCount > 0 && (
          <p className="mt-1">{parsed.diagnostics.ignoredFileCount} unrelated files ignored</p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={onConfirm} disabled={creating}>
          {creating ? "Saving locally…" : "Create Snapshot"}
        </Button>
        <Button onClick={onCancel} variant="ghost" disabled={creating}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
