import { Users, UserPlus } from "lucide-react";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import type { CurrentRelationshipBreakdown } from "@/lib/instagram/comparisons";

interface RelationshipOverviewProps {
  followersCount: number;
  followingCount: number;
  relationships: CurrentRelationshipBreakdown;
}

export function RelationshipOverview({
  followersCount,
  followingCount,
  relationships,
}: RelationshipOverviewProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-soft text-rose">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Followers</p>
            <p className="text-3xl font-semibold text-ink">
              <AnimatedCounter value={followersCount} />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-soft text-violet">
            <UserPlus size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Following</p>
            <p className="text-3xl font-semibold text-ink">
              <AnimatedCounter value={followingCount} />
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-8 flex h-28 items-center justify-center">
        <div className="absolute left-1/2 h-24 w-24 -translate-x-[70%] rounded-full bg-rose-soft/70 sm:h-28 sm:w-28" />
        <div className="absolute left-1/2 h-24 w-24 -translate-x-[30%] rounded-full bg-violet-soft/70 sm:h-28 sm:w-28" />
        <div className="relative flex h-16 w-16 flex-col items-center justify-center rounded-full bg-green text-white sm:h-20 sm:w-20">
          <span className="text-lg font-semibold sm:text-xl">
            <AnimatedCounter value={relationships.mutuals.length} />
          </span>
          <span className="text-[9px] uppercase tracking-wide opacity-90">mutual</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl bg-orange-soft/50 px-4 py-3">
          <span className="text-sm font-medium text-ink">Don&apos;t follow you back</span>
          <span className="text-lg font-semibold text-orange">
            <AnimatedCounter value={relationships.doesNotFollowBack.length} />
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-blue-soft/50 px-4 py-3">
          <span className="text-sm font-medium text-ink">You don&apos;t follow back</span>
          <span className="text-lg font-semibold text-blue">
            <AnimatedCounter value={relationships.youDontFollowBack.length} />
          </span>
        </div>
      </div>
    </div>
  );
}
