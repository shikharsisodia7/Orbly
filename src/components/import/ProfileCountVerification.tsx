"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { formatCount, formatSignedDelta } from "@/lib/utils/format";
import { verifyCount, type ProfileReferenceCounts } from "@/lib/instagram/validity";

interface ProfileCountVerificationProps {
  exportFollowers: number;
  exportFollowing: number;
  onChange: (reference: ProfileReferenceCounts | null) => void;
}

/**
 * Optional check: the user types in the two numbers Instagram shows at the
 * top of their own profile, and Orbly compares them to what it actually
 * parsed. This NEVER creates, removes, or infers relationship records — it
 * only flags whether the export looks complete.
 */
export function ProfileCountVerification({
  exportFollowers,
  exportFollowing,
  onChange,
}: ProfileCountVerificationProps) {
  const [open, setOpen] = useState(false);
  const [followersInput, setFollowersInput] = useState("");
  const [followingInput, setFollowingInput] = useState("");

  const followersNum = Number(followersInput);
  const followingNum = Number(followingInput);
  const hasBoth = followersInput.trim() !== "" && followingInput.trim() !== "";
  const valid = hasBoth && Number.isFinite(followersNum) && Number.isFinite(followingNum);

  function commit(nextFollowers: string, nextFollowing: string) {
    const f = Number(nextFollowers);
    const g = Number(nextFollowing);
    if (nextFollowers.trim() !== "" && nextFollowing.trim() !== "" && Number.isFinite(f) && Number.isFinite(g)) {
      onChange({ followers: f, following: g, recordedAt: new Date().toISOString() });
    } else {
      onChange(null);
    }
  }

  const followerCheck = valid ? verifyCount(exportFollowers, followersNum) : null;
  const followingCheck = valid ? verifyCount(exportFollowing, followingNum) : null;
  const hasMismatch = followerCheck?.isMismatch || followingCheck?.isMismatch;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center gap-2 rounded-xl border border-dashed border-border-strong px-4 py-3 text-left text-xs font-medium text-ink-soft hover:bg-surface"
      >
        <ShieldCheck size={15} className="shrink-0 text-ink-faint" />
        Verify against Instagram (optional)
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border p-4">
      <p className="text-xs font-semibold text-ink">Verify against Instagram</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        Enter the two numbers shown at the top of your Instagram profile. We use them only to check
        whether this export appears complete — never to add or remove accounts.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-ink-faint">Followers (Instagram)</span>
          <input
            type="number"
            inputMode="numeric"
            value={followersInput}
            onChange={(e) => {
              setFollowersInput(e.target.value);
              commit(e.target.value, followingInput);
            }}
            placeholder="e.g. 3866"
            className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-faint">Following (Instagram)</span>
          <input
            type="number"
            inputMode="numeric"
            value={followingInput}
            onChange={(e) => {
              setFollowingInput(e.target.value);
              commit(followersInput, e.target.value);
            }}
            placeholder="e.g. 5783"
            className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
          />
        </label>
      </div>

      {valid && followerCheck && followingCheck && (
        <div className={"mt-3 flex gap-2.5 rounded-lg p-3 text-xs " + (hasMismatch ? "bg-orange-soft/60" : "bg-green-soft/60")}>
          {hasMismatch ? (
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-orange" />
          ) : (
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-green" />
          )}
          <div className="leading-relaxed text-ink-soft">
            <p>
              Followers: {formatCount(exportFollowers)} found vs. {formatCount(followersNum)} on Instagram (
              {formatSignedDelta(followerCheck.difference)}
              {followerCheck.coverageRatio != null ? `, ${Math.round(followerCheck.coverageRatio * 100)}% coverage` : ""})
            </p>
            <p className="mt-0.5">
              Following: {formatCount(exportFollowing)} found vs. {formatCount(followingNum)} on Instagram (
              {formatSignedDelta(followingCheck.difference)})
            </p>
            {hasMismatch && (
              <p className="mt-1.5 font-medium text-ink">
                Major mismatch detected. This export is missing a significant number of accounts — it
                isn&apos;t recommended for accurate relationship analysis.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
