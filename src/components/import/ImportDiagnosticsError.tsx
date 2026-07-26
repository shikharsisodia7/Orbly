import { FileWarning } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ParseDiagnostics } from "@/lib/instagram/types";

interface ImportDiagnosticsErrorProps {
  kind: "missing-followers" | "missing-following" | "missing-both" | "html-unsupported";
  diagnostics?: ParseDiagnostics;
  onShowInstructions: () => void;
  onTryAgain: () => void;
}

const COPY: Record<ImportDiagnosticsErrorProps["kind"], { title: string; body: string }> = {
  "missing-followers": {
    title: "We found your Following data, but we couldn't locate your Followers data.",
    body: "Double check that you selected both Followers and Following when creating your export.",
  },
  "missing-following": {
    title: "We found your Followers data, but we couldn't locate your Following data.",
    body: "Double check that you selected both Followers and Following when creating your export.",
  },
  "missing-both": {
    title: "We couldn't find Followers or Following information in this export.",
    body: "Make sure you're uploading the full ZIP file from Meta, with Followers and Following selected.",
  },
  "html-unsupported": {
    title: "We couldn't read this export.",
    body: "This file doesn't look like a supported Instagram export. Try requesting a new export in JSON format.",
  },
};

export function ImportDiagnosticsError({
  kind,
  diagnostics,
  onShowInstructions,
  onTryAgain,
}: ImportDiagnosticsErrorProps) {
  const copy = COPY[kind];
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-7 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-soft text-orange">
        <FileWarning size={22} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-ink">{copy.title}</h2>
      <p className="mt-2 text-sm text-ink-soft">{copy.body}</p>

      {diagnostics && (
        <div className="mt-5 rounded-xl bg-cream p-4 text-left text-xs text-ink-soft">
          <p className="font-medium text-ink-faint">Files detected in this export</p>
          {diagnostics.followerFilesUsed.length > 0 && (
            <p className="mt-1">Followers: {diagnostics.followerFilesUsed.join(", ")}</p>
          )}
          {diagnostics.followingFilesUsed.length > 0 && (
            <p className="mt-1">Following: {diagnostics.followingFilesUsed.join(", ")}</p>
          )}
          <p className="mt-1">{diagnostics.ignoredFileCount} unrelated files ignored</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={onShowInstructions} variant="secondary">
          Show Export Instructions
        </Button>
        <Button onClick={onTryAgain} variant="ghost">
          Try a different file
        </Button>
      </div>
    </div>
  );
}
