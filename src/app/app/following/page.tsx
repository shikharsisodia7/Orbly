"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { RequireSnapshot } from "@/components/dashboard/RequireSnapshot";
import { ReadOnlyRelationshipList } from "@/components/dashboard/ReadOnlyRelationshipList";
import { Badge } from "@/components/ui/Badge";
import { useSnapshotFollowers, useSnapshotFollowing } from "@/hooks/useRelationships";

function FollowingContent({ snapshotId }: { snapshotId: string }) {
  const followers = useSnapshotFollowers(snapshotId);
  const following = useSnapshotFollowing(snapshotId);

  if (!followers || !following) return null;

  const followerSet = new Set(followers.map((f) => f.normalizedUsername));

  return (
    <>
      <PageHeader title="Following" subtitle="Everyone you currently follow." count={following.length} />
      <ReadOnlyRelationshipList
        items={following}
        renderBadge={(item) =>
          followerSet.has(item.normalizedUsername) ? (
            <Badge tone="green">Mutual</Badge>
          ) : (
            <Badge tone="orange">Doesn&apos;t follow back</Badge>
          )
        }
      />
    </>
  );
}

export default function FollowingPage() {
  return <RequireSnapshot>{(latest) => <FollowingContent snapshotId={latest.id} />}</RequireSnapshot>;
}
