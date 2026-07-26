"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils/cn";
import { formatFullDate, formatSignedDelta } from "@/lib/utils/format";
import type { SnapshotRecord } from "@/lib/db/schema";

type RangeOption = "7d" | "30d" | "all";

interface HistoryChartProps {
  snapshots: SnapshotRecord[]; // any order
}

interface TooltipPayloadItem {
  payload: {
    date: string;
    followers: number;
    following: number;
    followersDelta: number | null;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-ink">{formatFullDate(point.date)}</p>
      <p className="mt-1 text-ink-soft">Followers: {point.followers}</p>
      <p className="text-ink-soft">Following: {point.following}</p>
      {point.followersDelta !== null && (
        <p className="mt-1 text-ink-faint">{formatSignedDelta(point.followersDelta)} since previous</p>
      )}
    </div>
  );
}

export function HistoryChart({ snapshots }: HistoryChartProps) {
  const ascending = useMemo(
    () => [...snapshots].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [snapshots]
  );

  const spanDays =
    ascending.length > 1
      ? (new Date(ascending[ascending.length - 1].createdAt).getTime() -
          new Date(ascending[0].createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
      : 0;

  const availableRanges: RangeOption[] = ["all"];
  if (spanDays >= 7) availableRanges.unshift("30d");
  if (spanDays >= 1) availableRanges.unshift("7d");
  if (!availableRanges.includes("7d") && !availableRanges.includes("30d")) {
    // fewer than 2 data points spanning any real range — still allow "all"
  }

  const [range, setRange] = useState<RangeOption>(availableRanges[availableRanges.length - 1]);
  const [now] = useState(() => Date.now());

  const data = useMemo(() => {
    const cutoffDays = range === "7d" ? 7 : range === "30d" ? 30 : Infinity;
    const cutoff = now - cutoffDays * 24 * 60 * 60 * 1000;
    const filtered = ascending.filter((s) => new Date(s.createdAt).getTime() >= cutoff || cutoffDays === Infinity);
    return filtered.map((s, i) => ({
      date: s.createdAt,
      followers: s.followersCount,
      following: s.followingCount,
      followersDelta: i > 0 ? s.followersCount - filtered[i - 1].followersCount : null,
    }));
  }, [ascending, range, now]);

  if (snapshots.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-cream/40 p-6 text-center text-sm text-ink-soft">
        Import another snapshot to start seeing your follower history over time.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Follower history</h3>
        <div className="flex gap-1 rounded-lg border border-border-strong p-1">
          {(["7d", "30d", "all"] as RangeOption[])
            .filter((r) => availableRanges.includes(r))
            .map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium",
                  range === r ? "bg-surface text-ink" : "text-ink-faint"
                )}
              >
                {r === "7d" ? "7D" : r === "30d" ? "30D" : "All"}
              </button>
            ))}
        </div>
      </div>

      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E6E4E0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => formatFullDate(v).replace(/, \d+$/, "")}
              tick={{ fontSize: 11, fill: "#8B8B93" }}
              axisLine={{ stroke: "#E6E4E0" }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "#8B8B93" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="followers" stroke="#EE4F57" strokeWidth={2} dot={{ r: 3 }} name="Followers" />
            <Line type="monotone" dataKey="following" stroke="#6C5CE7" strokeWidth={2} dot={{ r: 3 }} name="Following" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
