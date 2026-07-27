"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatCount } from "@/lib/utils/format";
import type { ParsedExport } from "@/lib/instagram/types";
import { computeCurrentRelationships } from "@/lib/instagram/comparisons";
import { verifyCount, type ProfileReferenceCounts } from "@/lib/instagram/validity";
import { ImportDiagnosticsPanel } from "./ImportDiagnosticsPanel";
import { ProfileCountVerification } from "./ProfileCountVerification";

interface ConfirmationSummaryProps {
  parsed: ParsedExport;
  onConfirm: (profileReference: ProfileReferenceCounts | null) => void;
  onCancel: () => void;
  creating: boolean;
}

export function ConfirmationSummary({ parsed, onConfirm, onCancel, creating }: ConfirmationSummaryProps) {
  const [profileReference, setProfileReference] = useState<ProfileReferenceCounts | null>(null);

  const { mutuals, doesNotFollowBack, youDontFollowBack } = computeCurrentRelationships(
    parsed.followers,
    parsed.following
  );

  const rows = [
    { label: "Followers", value: parsed.followers.length },
    { label: "Following", value: parsed.following.length },
    { label: "Mutuals", value: mutuals.length },
    { label: "Don't Follow You Back", value: doesNotFollowBack.length },
    { label: "You Don't Follow Back", value: youDontFollowBack.length },
  ];

  const hasMismatch =
    profileReference != null &&
    (verifyCount(parsed.followers.length, profileReference.followers).isMismatch ||
      verifyCount(parsed.following.length, profileReference.following).isMismatch);

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-7">
      <p className="text-sm font-semibold text-ink">Instagram export found</p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <p className="text-xs text-ink-faint">{row.label}</p>
            <p className="mt-1 text-xl font-semibold text-ink">{formatCount(row.value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-cream p-4 text-xs text-ink-soft">
        <p className="font-medium text-ink-faint">Files used</p>
        <p className="mt-1">{[...parsed.diagnostics.followerFilesUsed, ...parsed.diagnostics.followingFilesUsed].join(", ")}</p>
        {parsed.diagnostics.ignoredFileCount > 0 && (
          <p className="mt-1">{parsed.diagnostics.ignoredFileCount} unrelated files ignored</p>
        )}
      </div>

      <ProfileCountVerification
        exportFollowers={parsed.followers.length}
        exportFollowing={parsed.following.length}
        onChange={setProfileReference}
      />

      <ImportDiagnosticsPanel diagnostics={parsed.diagnostics} />

      {hasMismatch && (
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          Because of the mismatch above, this snapshot will be marked <strong>partial</strong> and
          won&apos;t be used for mutuals, doesn&apos;t-follow-back, or unfollower tracking until you
          import a complete export.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={() => onConfirm(profileReference)} disabled={creating}>
          {creating ? "Saving locally…" : hasMismatch ? "Create Snapshot Anyway" : "Create Snapshot"}
        </Button>
        <Button onClick={onCancel} variant="ghost" disabled={creating}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
