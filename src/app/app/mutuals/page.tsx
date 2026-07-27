"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { RequireUsableSnapshot } from "@/components/dashboard/RequireUsableSnapshot";
import { ReadOnlyRelationshipList } from "@/components/dashboard/ReadOnlyRelationshipList";
import { Badge } from "@/components/ui/Badge";
import { useCurrentRelationships } from "@/hooks/useRelationships";

function MutualsContent({ snapshotId }: { snapshotId: string }) {
  const relationships = useCurrentRelationships(snapshotId);
  if (!relationships) return null;

  return (
    <>
      <PageHeader
        title="Mutuals"
        subtitle="Accounts you follow that also follow you back."
        count={relationships.mutuals.length}
      />
      <ReadOnlyRelationshipList
        items={relationships.mutuals}
        renderBadge={() => <Badge tone="green">Mutual</Badge>}
      />
    </>
  );
}

export default function MutualsPage() {
  return <RequireUsableSnapshot>{(latest) => <MutualsContent snapshotId={latest.id} />}</RequireUsableSnapshot>;
}
