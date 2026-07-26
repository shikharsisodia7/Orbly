"use client";

import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { useLatestSnapshot, useSnapshots } from "@/hooks/useSnapshots";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SnapshotRecord } from "@/lib/db/schema";

interface RequireSnapshotProps {
  children: (latest: SnapshotRecord) => ReactNode;
}

export function RequireSnapshot({ children }: RequireSnapshotProps) {
  const snapshots = useSnapshots();
  const latest = useLatestSnapshot();

  if (snapshots === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!latest) {
    return (
      <EmptyState
        icon={<Users size={20} />}
        title="No Instagram data yet"
        description="Import your Followers + Following export to see who's in your circle."
        action={<ButtonLink href="/app/import">Import Instagram Data</ButtonLink>}
      />
    );
  }

  return <>{children(latest)}</>;
}
