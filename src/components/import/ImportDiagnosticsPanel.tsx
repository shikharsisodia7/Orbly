"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatCount, formatFullDate } from "@/lib/utils/format";
import type { ParseDiagnostics } from "@/lib/instagram/types";

interface ImportDiagnosticsPanelProps {
  diagnostics: ParseDiagnostics;
}

/**
 * Collapsed-by-default developer-grade breakdown of exactly what the parser
 * found: raw vs. parsed vs. unique vs. duplicate vs. invalid counts per
 * category, per file, plus the source of any date-range information. Exists
 * so a discrepancy between what Instagram shows and what Orbly parsed is
 * always diagnosable from inside the app, not just guessed at.
 */
export function ImportDiagnosticsPanel({ diagnostics }: ImportDiagnosticsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-ink"
      >
        Import diagnostics
        <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4 text-xs text-ink-soft">
          <DiagnosticsSection
            title="Followers"
            raw={diagnostics.followerRawRecords}
            parsed={diagnostics.followerParsedRecords}
            unique={diagnostics.followerUniqueUsers}
            duplicates={diagnostics.followerDuplicates}
            invalid={diagnostics.followerInvalidRecords}
            files={diagnostics.followerFileDetails}
          />
          <DiagnosticsSection
            title="Following"
            raw={diagnostics.followingRawRecords}
            parsed={diagnostics.followingParsedRecords}
            unique={diagnostics.followingUniqueUsers}
            duplicates={diagnostics.followingDuplicates}
            invalid={diagnostics.followingInvalidRecords}
            files={diagnostics.followingFileDetails}
          />

          <div>
            <p className="font-medium text-ink-faint">Date range</p>
            {diagnostics.coverage ? (
              <p className="mt-1">
                Meta-explicit: {formatFullDate(diagnostics.coverage.fromIso)} –{" "}
                {formatFullDate(diagnostics.coverage.toIso)}
                {diagnostics.coverage.looksLimited ? " (limited)" : " (all time)"}
              </p>
            ) : (
              <p className="mt-1">Unknown — this export doesn&apos;t declare a date range.</p>
            )}
          </div>

          {diagnostics.conflictingRecords.length > 0 && (
            <div>
              <p className="font-medium text-ink-faint">
                Title/value conflicts ({diagnostics.conflictingRecords.length})
              </p>
              <ul className="mt-1 space-y-0.5">
                {diagnostics.conflictingRecords.slice(0, 5).map((c, i) => (
                  <li key={i}>
                    {c.file}: title=&quot;{c.title}&quot; vs value=&quot;{c.value}&quot; (used {c.used})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diagnostics.ignoredFileCount > 0 && (
            <p>{diagnostics.ignoredFileCount} unrelated files ignored</p>
          )}
        </div>
      )}
    </div>
  );
}

function DiagnosticsSection({
  title,
  raw,
  parsed,
  unique,
  duplicates,
  invalid,
  files,
}: {
  title: string;
  raw: number;
  parsed: number;
  unique: number;
  duplicates: number;
  invalid: number;
  files: ParseDiagnostics["followerFileDetails"];
}) {
  return (
    <div>
      <p className="font-medium text-ink-faint">{title}</p>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
        <span>Raw records: {formatCount(raw)}</span>
        <span>Parsed: {formatCount(parsed)}</span>
        <span>Unique: {formatCount(unique)}</span>
        <span>Duplicates: {formatCount(duplicates)}</span>
        <span>Invalid: {formatCount(invalid)}</span>
      </div>
      {files.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {files.map((f) => (
            <li key={f.fileName}>
              {f.fileName} — raw {formatCount(f.rawRecords)}, parsed {formatCount(f.parsedRecords)}, invalid{" "}
              {formatCount(f.invalidRecords)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
