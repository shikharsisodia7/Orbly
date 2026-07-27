"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { Dropzone } from "@/components/import/Dropzone";
import { parseInstagramExport } from "@/lib/instagram/parser";
import { hashDataset } from "@/lib/instagram/hash";
import { assessDatasetValidity } from "@/lib/instagram/validity";
import type { ParsedExport } from "@/lib/instagram/types";

/**
 * Dev-only import diagnostics: upload a real export and see exactly what the
 * parser found — raw vs. parsed vs. unique counts per file, date-range
 * source, and computed validity — without creating a snapshot. Not linked
 * from app navigation; exists so a parsing discrepancy can always be
 * diagnosed from inside the app rather than guessed at.
 */
export default function ImportDebugPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [parsed, setParsed] = useState<ParsedExport | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const result = await parseInstagramExport(file);
      setParsed(result);
      setFileName(file.name);
      setHash(await hashDataset(result.followers, result.following));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file.");
    } finally {
      setBusy(false);
    }
  }

  const validity = parsed
    ? assessDatasetValidity({
        followerCount: parsed.followers.length,
        followingCount: parsed.following.length,
        coverage: parsed.diagnostics.coverage,
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-semibold text-ink">Import diagnostics (dev only)</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Upload a ZIP or JSON file to see exactly what the parser extracts. Nothing here is saved as
        a snapshot.
      </p>

      <div className="mt-6">
        <Dropzone onFileSelected={handleFile} error={error} />
      </div>

      {busy && <p className="mt-4 text-sm text-ink-soft">Parsing…</p>}

      {parsed && validity && (
        <div className="mt-8 space-y-6 text-sm">
          <Section title="Summary">
            <Row label="File" value={fileName ?? "—"} />
            <Row label="Dataset hash" value={hash ?? "—"} mono />
            <Row label="Looks like HTML export" value={String(parsed.looksLikeHtmlExport)} />
            <Row label="Computed validity" value={validity.validity} />
            <Row label="Validity reasons" value={validity.reasons.join(", ") || "none"} />
          </Section>

          <Section title="Files">
            <Row label="Follower files used" value={parsed.diagnostics.followerFilesUsed.join(", ") || "none"} />
            <Row label="Following files used" value={parsed.diagnostics.followingFilesUsed.join(", ") || "none"} />
            <Row label="Ignored files" value={String(parsed.diagnostics.ignoredFileCount)} />
          </Section>

          <Section title="Followers">
            <Row label="Raw records" value={String(parsed.diagnostics.followerRawRecords)} />
            <Row label="Parsed records" value={String(parsed.diagnostics.followerParsedRecords)} />
            <Row label="Unique users" value={String(parsed.diagnostics.followerUniqueUsers)} />
            <Row label="Duplicates" value={String(parsed.diagnostics.followerDuplicates)} />
            <Row label="Invalid records" value={String(parsed.diagnostics.followerInvalidRecords)} />
            <div className="mt-2 space-y-1">
              {parsed.diagnostics.followerFileDetails.map((f) => (
                <p key={f.fileName} className="font-mono text-xs text-ink-faint">
                  {f.fileName}: raw {f.rawRecords} / parsed {f.parsedRecords} / invalid {f.invalidRecords}
                </p>
              ))}
            </div>
          </Section>

          <Section title="Following">
            <Row label="Raw records" value={String(parsed.diagnostics.followingRawRecords)} />
            <Row label="Parsed records" value={String(parsed.diagnostics.followingParsedRecords)} />
            <Row label="Unique users" value={String(parsed.diagnostics.followingUniqueUsers)} />
            <Row label="Duplicates" value={String(parsed.diagnostics.followingDuplicates)} />
            <Row label="Invalid records" value={String(parsed.diagnostics.followingInvalidRecords)} />
            <div className="mt-2 space-y-1">
              {parsed.diagnostics.followingFileDetails.map((f) => (
                <p key={f.fileName} className="font-mono text-xs text-ink-faint">
                  {f.fileName}: raw {f.rawRecords} / parsed {f.parsedRecords} / invalid {f.invalidRecords}
                </p>
              ))}
            </div>
          </Section>

          <Section title="Date range">
            {parsed.diagnostics.coverage ? (
              <>
                <Row label="Source" value={parsed.diagnostics.coverage.source} />
                <Row label="From" value={parsed.diagnostics.coverage.fromIso} />
                <Row label="To" value={parsed.diagnostics.coverage.toIso} />
                <Row label="Span (days)" value={String(parsed.diagnostics.coverage.spanDays)} />
                <Row label="Looks limited" value={String(parsed.diagnostics.coverage.looksLimited)} />
              </>
            ) : (
              <Row label="Source" value="unknown (no coverage header found)" />
            )}
          </Section>

          {parsed.diagnostics.conflictingRecords.length > 0 && (
            <Section title={`Title/value conflicts (${parsed.diagnostics.conflictingRecords.length})`}>
              <div className="space-y-1">
                {parsed.diagnostics.conflictingRecords.map((c, i) => (
                  <p key={i} className="font-mono text-xs text-ink-faint">
                    {c.file}: title=&quot;{c.title}&quot; value=&quot;{c.value}&quot; used=&quot;{c.used}&quot;
                  </p>
                ))}
              </div>
            </Section>
          )}

          <Section title="Sample usernames">
            <p className="text-xs text-ink-faint">Followers (first 5)</p>
            <p className="font-mono text-xs">
              {parsed.followers.slice(0, 5).map((r) => r.normalizedUsername).join(", ") || "none"}
            </p>
            <p className="mt-2 text-xs text-ink-faint">Following (first 5)</p>
            <p className="font-mono text-xs">
              {parsed.following.slice(0, 5).map((r) => r.normalizedUsername).join(", ") || "none"}
            </p>
          </Section>

          {parsed.diagnostics.warnings.length > 0 && (
            <Section title="Warnings">
              {parsed.diagnostics.warnings.map((w, i) => (
                <p key={i} className="text-xs text-ink-soft">
                  {w}
                </p>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-2 text-xs">
      <span className="text-ink-faint">{label}:</span>
      <span className={mono ? "font-mono text-ink" : "text-ink"}>{value}</span>
    </div>
  );
}
