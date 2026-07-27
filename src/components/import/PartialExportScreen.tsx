import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCount, formatFullDate } from "@/lib/utils/format";
import type { ParsedExport } from "@/lib/instagram/types";

interface PartialExportScreenProps {
  parsed: ParsedExport;
  onShowInstructions: () => void;
  onChooseAnother: () => void;
}

/**
 * Shown instead of the normal confirmation screen when Meta's own export
 * header proves the file doesn't cover all time. This is a hard block, not a
 * warning-then-continue: a date-limited export cannot be turned into an
 * accurate current snapshot, so Orbly refuses to create one from it.
 */
export function PartialExportScreen({ parsed, onShowInstructions, onChooseAnother }: PartialExportScreenProps) {
  const coverage = parsed.diagnostics.coverage;
  if (!coverage) return null;

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-orange/30 bg-white p-7">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-soft text-orange">
        <CalendarClock size={22} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-ink">Your export is incomplete</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Meta&apos;s own export header shows this file only covers{" "}
        <strong className="text-ink">
          {formatFullDate(coverage.fromIso)} – {formatFullDate(coverage.toIso)}
        </strong>{" "}
        (about {Math.round(coverage.spanDays / 30)} months) instead of your full history. Followers
        and accounts from before that window are missing, so this export can&apos;t be used for
        accurate current relationship analysis.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-cream p-4">
        <div>
          <p className="text-xs text-ink-faint">Follower records found</p>
          <p className="mt-1 text-lg font-semibold text-ink">{formatCount(parsed.followers.length)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">Following records found</p>
          <p className="mt-1 text-lg font-semibold text-ink">{formatCount(parsed.following.length)}</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border-strong p-4 text-xs leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">Request a new export with:</p>
        <ul className="mt-1.5 space-y-1">
          <li>Information: Followers and Following</li>
          <li>
            Date range: <strong className="text-ink">All time</strong>
          </li>
          <li>Format: JSON</li>
          <li>Destination: Download to device</li>
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={onShowInstructions}>Show Me How</Button>
        <Button onClick={onChooseAnother} variant="ghost">
          Choose Another Export
        </Button>
      </div>
    </div>
  );
}
