"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { RequireUsableSnapshot } from "@/components/dashboard/RequireUsableSnapshot";
import { ReadOnlyRelationshipList } from "@/components/dashboard/ReadOnlyRelationshipList";
import { Badge } from "@/components/ui/Badge";
import { useSnapshotFollowers, useSnapshotFollowing } from "@/hooks/useRelationships";

function FollowersContent({ snapshotId }: { snapshotId: string }) {
  const followers = useSnapshotFollowers(snapshotId);
  const following = useSnapshotFollowing(snapshotId);

  if (!followers || !following) return null;

  const followingSet = new Set(following.map((f) => f.normalizedUsername));

  return (
    <>
      <PageHeader title="Followers" subtitle="Everyone who currently follows you." count={followers.length} />
      <ReadOnlyRelationshipList
        items={followers}
        renderBadge={(item) =>
          followingSet.has(item.normalizedUsername) ? (
            <Badge tone="green">Mutual</Badge>
          ) : (
            <Badge tone="blue">You don&apos;t follow them</Badge>
          )
        }
      />
    </>
  );
}

export default function FollowersPage() {
  return <RequireUsableSnapshot>{(latest) => <FollowersContent snapshotId={latest.id} />}</RequireUsableSnapshot>;
}
