"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { RequireSnapshot } from "@/components/dashboard/RequireSnapshot";
import { SelectableRelationshipList } from "@/components/dashboard/SelectableRelationshipList";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heart } from "lucide-react";
import { useCurrentRelationships } from "@/hooks/useRelationships";

function NonfollowersContent({ snapshotId }: { snapshotId: string }) {
  const relationships = useCurrentRelationships(snapshotId);
  if (!relationships) return null;

  return (
    <>
      <PageHeader
        title="Doesn't Follow You Back"
        subtitle="People you currently follow who aren't following you."
        count={relationships.doesNotFollowBack.length}
      />
      {relationships.doesNotFollowBack.length === 0 ? (
        <EmptyState
          icon={<Heart size={18} />}
          title="Everyone you follow currently follows you back."
        />
      ) : (
        <SelectableRelationshipList items={relationships.doesNotFollowBack} queueSource="does-not-follow-back" />
      )}
    </>
  );
}

export default function NonfollowersPage() {
  return <RequireSnapshot>{(latest) => <NonfollowersContent snapshotId={latest.id} />}</RequireSnapshot>;
}
