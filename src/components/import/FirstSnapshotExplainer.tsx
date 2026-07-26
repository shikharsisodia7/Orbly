import { Check, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function FirstSnapshotExplainer({ onDone }: { onDone: () => void }) {
  const unlocked = [
    "Who follows you",
    "Who you follow",
    "Mutuals",
    "Who doesn't follow you back",
    "Who you don't follow back",
  ];

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-2xl border border-border bg-white p-7">
        <h2 className="text-xl font-semibold text-ink">Your first snapshot is ready.</h2>
        <p className="mt-1 text-sm text-ink-soft">You can already see:</p>
        <ul className="mt-4 space-y-2">
          {unlocked.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-ink">
              <Check size={16} className="text-green" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-border-strong bg-cream/60 p-7">
        <h3 className="text-base font-semibold text-ink">Want to detect unfollowers?</h3>
        <p className="mt-2 text-sm text-ink-soft">
          We need at least two snapshots to detect changes. For example:
        </p>
        <div className="mt-4 space-y-1 rounded-xl bg-white p-4 text-sm">
          <p className="font-medium text-ink">JULY 25 — @alex follows you</p>
          <div className="flex items-center gap-1.5 py-1 text-ink-faint">
            <ArrowDown size={14} />
          </div>
          <p className="font-medium text-ink">AUGUST 3 — @alex no longer appears</p>
          <div className="mt-3 rounded-lg bg-rose-soft px-3 py-2 text-rose">
            Detected: @alex stopped following you sometime between July 25 and August 3.
          </div>
        </div>
      </div>

      <Button onClick={onDone} size="lg" className="mt-6 w-full">
        Got It
      </Button>
    </div>
  );
}
