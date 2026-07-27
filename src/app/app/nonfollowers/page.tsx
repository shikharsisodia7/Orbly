"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RequireUsableSnapshot } from "@/components/dashboard/RequireUsableSnapshot";
import { SelectableRelationshipList } from "@/components/dashboard/SelectableRelationshipList";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heart } from "lucide-react";
import { useCurrentRelationships } from "@/hooks/useRelationships";
import { useResolvedUsernames } from "@/hooks/useResolvedUsernames";

function NonfollowersContent({ snapshotId }: { snapshotId: string }) {
  const relationships = useCurrentRelationships(snapshotId);
  const resolved = useResolvedUsernames();

  const active = useMemo(() => {
    if (!relationships) return [];
    return relationships.doesNotFollowBack.filter(
      (r) => !resolved.has(r.normalizedUsername)
    );
  }, [relationships, resolved]);

  if (!relationships) return null;

  const hiddenCount = relationships.doesNotFollowBack.length - active.length;

  return (
    <>
      <PageHeader
        title="Doesn't Follow You Back"
        subtitle="People you currently follow who aren't following you."
        count={active.length}
      />

      {hiddenCount > 0 && (
        <p className="mb-4 rounded-lg bg-surface px-3 py-2 text-xs text-ink-soft">
          {hiddenCount} {hiddenCount === 1 ? "account is" : "accounts are"} hidden because you
          marked {hiddenCount === 1 ? "it" : "them"} done in your queue. They&apos;ll disappear for
          good after your next import.
        </p>
      )}

      {active.length === 0 ? (
        <EmptyState
          icon={<Heart size={18} />}
          title={
            relationships.doesNotFollowBack.length === 0
              ? "Everyone you follow currently follows you back."
              : "You've worked through everyone on this list."
          }
        />
      ) : (
        <SelectableRelationshipList items={active} queueSource="does-not-follow-back" />
      )}
    </>
  );
}

export default function NonfollowersPage() {
  return <RequireUsableSnapshot>{(latest) => <NonfollowersContent snapshotId={latest.id} />}</RequireUsableSnapshot>;
}
