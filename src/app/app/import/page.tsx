"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSnapshots } from "@/hooks/useSnapshots";
import { OnboardingIntro } from "@/components/import/OnboardingIntro";
import { ReturningUserUpdate } from "@/components/import/ReturningUserUpdate";
import { ExportWizard } from "@/components/import/ExportWizard";
import { Dropzone } from "@/components/import/Dropzone";
import { ProcessingStages, type ProcessingStageId } from "@/components/import/ProcessingStages";
import { ImportDiagnosticsError } from "@/components/import/ImportDiagnosticsError";
import { PartialExportScreen } from "@/components/import/PartialExportScreen";
import { ConfirmationSummary } from "@/components/import/ConfirmationSummary";
import { DuplicateDialog } from "@/components/import/DuplicateDialog";
import { FirstSnapshotExplainer } from "@/components/import/FirstSnapshotExplainer";
import { parseInstagramExport } from "@/lib/instagram/parser";
import { hashDataset } from "@/lib/instagram/hash";
import type { ParsedExport } from "@/lib/instagram/types";
import type { ProfileReferenceCounts } from "@/lib/instagram/validity";
import {
  createSnapshot,
  findSnapshotByDatasetHash,
  reconcileQueueWithFollowing,
} from "@/lib/db/queries";
import { updateSettings } from "@/lib/db/queries";
import { Logo } from "@/components/brand/Logo";

type FlowState =
  | "loading"
  | "onboarding"
  | "returning-intro"
  | "wizard"
  | "upload"
  | "processing"
  | "diagnostics-error"
  | "partial-export"
  | "confirmation"
  | "first-snapshot-explainer";

type DiagnosticsErrorKind = "missing-followers" | "missing-following" | "missing-both";

export default function ImportPage() {
  const router = useRouter();
  const snapshots = useSnapshots();
  const initialized = useRef(false);

  const [flow, setFlow] = useState<FlowState>("loading");
  const [processingStage, setProcessingStage] = useState<ProcessingStageId>("opening-zip");
  const [parsed, setParsed] = useState<ParsedExport | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<DiagnosticsErrorKind>("missing-both");
  const [datasetHash, setDatasetHash] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (initialized.current || snapshots === undefined) return;
    initialized.current = true;
    setFlow(snapshots.length === 0 ? "onboarding" : "returning-intro");
  }, [snapshots]);

  async function handleFile(file: File) {
    setUploadError(null);
    setSelectedFileName(file.name);
    setFlow("processing");
    setProcessingStage("opening-zip");

    try {
      const result = await parseInstagramExport(file, {
        onStage: (stage) => {
          if (stage !== "done") setProcessingStage(stage);
        },
      });

      setProcessingStage("calculating");
      await new Promise((r) => setTimeout(r, 150));

      const hasFollowers = result.diagnostics.followerFilesUsed.length > 0;
      const hasFollowing = result.diagnostics.followingFilesUsed.length > 0;

      if (!hasFollowers && !hasFollowing) {
        setErrorKind("missing-both");
        setParsed(result);
        setFlow("diagnostics-error");
        return;
      }
      if (!hasFollowers) {
        setErrorKind("missing-followers");
        setParsed(result);
        setFlow("diagnostics-error");
        return;
      }
      if (!hasFollowing) {
        setErrorKind("missing-following");
        setParsed(result);
        setFlow("diagnostics-error");
        return;
      }

      setProcessingStage("checking-duplicate");
      const hash = await hashDataset(result.followers, result.following);
      setDatasetHash(hash);
      setParsed(result);
      setProcessingStage("complete");

      // A date-limited export is provably incomplete (Meta's own export header
      // says so) — block it from ever becoming a normal current snapshot,
      // rather than warning and letting misleading analytics through.
      if (result.diagnostics.coverage?.looksLimited) {
        setFlow("partial-export");
        return;
      }

      const existing = await findSnapshotByDatasetHash(hash);
      setFlow("confirmation");
      if (existing) setDuplicateOpen(true);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Something went wrong reading that file. Please try again."
      );
      setFlow("upload");
    }
  }

  async function handleConfirmCreate(profileReference: ProfileReferenceCounts | null) {
    if (!parsed || !datasetHash) return;
    setCreating(true);
    const isFirst = (snapshots?.length ?? 0) === 0;
    await createSnapshot({
      followers: parsed.followers,
      following: parsed.following,
      datasetHash,
      originalFileName: selectedFileName,
      coverage: parsed.diagnostics.coverage,
      profileReference,
    });
    // Close out queue items for accounts that are no longer in the following
    // list — already unfollowed, or the account no longer exists.
    await reconcileQueueWithFollowing(parsed.following);
    await updateSettings({ onboardingCompleted: true });
    setCreating(false);
    setDuplicateOpen(false);
    if (isFirst) {
      setFlow("first-snapshot-explainer");
    } else {
      router.push("/app/dashboard");
    }
  }

  function resetToUpload() {
    setParsed(null);
    setSelectedFileName(null);
    setDatasetHash(null);
    setDuplicateOpen(false);
    setUploadError(null);
    setFlow("upload");
  }

  return (
    <div className="flex min-h-[70vh] flex-col justify-center py-8">
      {flow === "loading" && (
        <div className="flex justify-center">
          <div className="animate-pulse">
            <Logo size={32} />
          </div>
        </div>
      )}

      {flow === "onboarding" && (
        <OnboardingIntro onStartWizard={() => setFlow("wizard")} onSkipToUpload={() => setFlow("upload")} />
      )}

      {flow === "returning-intro" && (
        <ReturningUserUpdate onUpload={() => setFlow("upload")} onShowInstructions={() => setFlow("wizard")} />
      )}

      {flow === "wizard" && <ExportWizard onFinish={() => setFlow("upload")} />}

      {flow === "upload" && <Dropzone onFileSelected={handleFile} error={uploadError} />}

      {flow === "processing" && <ProcessingStages current={processingStage} />}

      {flow === "diagnostics-error" && (
        <ImportDiagnosticsError
          kind={errorKind}
          diagnostics={parsed?.diagnostics}
          onShowInstructions={() => setFlow("wizard")}
          onTryAgain={resetToUpload}
        />
      )}

      {flow === "partial-export" && parsed && (
        <PartialExportScreen
          parsed={parsed}
          onShowInstructions={() => setFlow("wizard")}
          onChooseAnother={resetToUpload}
        />
      )}

      {flow === "confirmation" && parsed && (
        <>
          <ConfirmationSummary
            parsed={parsed}
            onConfirm={handleConfirmCreate}
            onCancel={resetToUpload}
            creating={creating}
          />
          <DuplicateDialog
            open={duplicateOpen}
            onCancel={resetToUpload}
            onImportAnyway={() => setDuplicateOpen(false)}
          />
        </>
      )}

      {flow === "first-snapshot-explainer" && (
        <FirstSnapshotExplainer onDone={() => router.push("/app/dashboard")} />
      )}
    </div>
  );
}
