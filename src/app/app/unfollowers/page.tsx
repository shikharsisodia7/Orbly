"use client";

import { useMemo, useState } from "react";
import { UserMinus, History } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useLostFollowerEvents } from "@/hooks/useLostFollowerEvents";
import { useQueueUsernames } from "@/hooks/useQueueUsernames";
import { useProtectedUsernames } from "@/hooks/useProtectedUsernames";
import { useExclusionRules } from "@/hooks/useExclusionRules";
import { useNotFoundUsernames } from "@/hooks/useAccountStatusCache";
import { useCachedBios } from "@/hooks/useAccountBioCache";
import { matchesAnyExclusionRule } from "@/lib/instagram/exclusion-rules";
import { addManyToQueue } from "@/lib/db/queries";
import { formatDateRange } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ExternalLink, Plus } from "lucide-react";

type PeriodFilter = "latest" | "30d" | "all";
type FollowingFilter = "all" | "still" | "not";

export default function UnfollowersPage() {
  const snapshots = useSnapshots();
  const events = useLostFollowerEvents();
  const queuedUsernames = useQueueUsernames();
  const protectedUsernames = useProtectedUsernames();
  const exclusionRules = useExclusionRules();
  const notFoundUsernames = useNotFoundUsernames();
  const bios = useCachedBios();
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [followingFilter, setFollowingFilter] = useState<FollowingFilter>("all");
  const [addedUsernames, setAddedUsernames] = useState<Set<string>>(new Set());
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    if (!events) return [];
    let list = events.filter(
      (e) =>
        !protectedUsernames.has(e.normalizedUsername) &&
        !notFoundUsernames.has(e.normalizedUsername) &&
        !matchesAnyExclusionRule({ normalizedUsername: e.normalizedUsername, bio: bios.get(e.normalizedUsername) }, exclusionRules)
    );

    if (period === "latest" && snapshots && snapshots.length >= 2) {
      const latestPairTo = snapshots[0].id;
      list = list.filter((e) => e.toSnapshot.id === latestPairTo);
    } else if (period === "30d") {
      const cutoff = now - 30 * 24 * 60 * 60 * 1000;
      list = list.filter((e) => new Date(e.toSnapshot.createdAt).getTime() >= cutoff);
    }

    if (followingFilter === "still") list = list.filter((e) => e.stillFollowingThem);
    if (followingFilter === "not") list = list.filter((e) => !e.stillFollowingThem);

    return list;
  }, [events, period, followingFilter, snapshots, now, protectedUsernames, notFoundUsernames, bios, exclusionRules]);

  async function handleAddOne(event: (typeof filtered)[number]) {
    await addManyToQueue([
      {
        normalizedUsername: event.normalizedUsername,
        displayUsername: event.displayUsername,
        profileUrl: event.profileUrl,
        source: "recent-unfollower",
      },
    ]);
    setAddedUsernames((prev) => new Set(prev).add(event.normalizedUsername));
  }

  if (snapshots === undefined || events === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (snapshots.length < 2) {
    return (
      <>
        <PageHeader title="Recent Unfollowers" subtitle="People who stopped following you between two snapshots." />
        <EmptyState
          icon={<History size={20} />}
          title="One more snapshot unlocks follower change tracking."
          description="Import another Instagram export later and Orbly will show you exactly who stopped following you between the two."
          action={<ButtonLink href="/app/import">Update Instagram Data</ButtonLink>}
        />
      </>
    );
  }

  const hasIncompleteSnapshot = snapshots.some((s) => s.validity === "partial" || s.validity === "invalid");
  if (events.length === 0 && hasIncompleteSnapshot) {
    return (
      <>
        <PageHeader title="Recent Unfollowers" subtitle="Lost followers detected between your snapshots." />
        <EmptyState
          icon={<History size={20} />}
          title="Not enough complete snapshots to compare yet."
          description="One or more of your snapshots is incomplete, so Orbly can't reliably tell who stopped following you. Import a complete, all-time export to unlock this."
          action={<ButtonLink href="/app/import">Import a Complete Export</ButtonLink>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Recent Unfollowers" subtitle="Lost followers detected between your snapshots." count={filtered.length} />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "latest", label: "Latest snapshot" },
            { id: "30d", label: "Last 30 days" },
            { id: "all", label: "All history" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setPeriod(opt.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              period === opt.id ? "border-ink bg-ink text-white" : "border-border-strong text-ink-soft"
            )}
          >
            {opt.label}
          </button>
        ))}
        <span className="mx-1 self-center text-border-strong">|</span>
        {(
          [
            { id: "all", label: "All" },
            { id: "still", label: "Still Following Them" },
            { id: "not", label: "Not Following Them" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFollowingFilter(opt.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              followingFilter === opt.id ? "border-ink bg-ink text-white" : "border-border-strong text-ink-soft"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState icon={<UserMinus size={18} />} title="No lost followers in this range." />
        ) : (
          <div className="space-y-2">
            {filtered.map((event) => {
              const inQueue = queuedUsernames.has(event.normalizedUsername) || addedUsernames.has(event.normalizedUsername);
              return (
                <div
                  key={`${event.normalizedUsername}-${event.toSnapshot.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar username={event.normalizedUsername} size={36} />
                    <div>
                      <p className="text-sm font-medium text-ink">@{event.displayUsername}</p>
                      <p className="text-xs text-ink-faint">
                        Detected {formatDateRange(event.fromSnapshot.createdAt, event.toSnapshot.createdAt)}
                      </p>
                      <div className="mt-1">
                        {event.stillFollowingThem ? (
                          <Badge tone="blue">You still follow them</Badge>
                        ) : (
                          <Badge tone="neutral">You don&apos;t follow them anymore</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <a
                      href={event.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface"
                    >
                      Open Profile <ExternalLink size={12} />
                    </a>
                    <Button size="sm" variant={inQueue ? "secondary" : "primary"} disabled={inQueue} onClick={() => handleAddOne(event)} className="gap-1">
                      <Plus size={13} />
                      {inQueue ? "In Queue" : "Add to Queue"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
