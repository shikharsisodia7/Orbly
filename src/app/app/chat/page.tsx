"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Check, Send, Sparkles, User } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropzone } from "@/components/import/Dropzone";
import { ExportWizard } from "@/components/import/ExportWizard";
import { ProcessingStages, type ProcessingStageId } from "@/components/import/ProcessingStages";
import { ToolResultCard } from "@/components/chat/ToolResultCard";
import { useSnapshots } from "@/hooks/useSnapshots";
import { parseInstagramExport } from "@/lib/instagram/parser";
import { hashDataset } from "@/lib/instagram/hash";
import {
  createSnapshot,
  findSnapshotByDatasetHash,
  reconcileQueueWithFollowing,
  updateSettings,
} from "@/lib/db/queries";
import {
  checkAccount,
  getAccountStats,
  getQueueStatus,
  listDoesNotFollowBack,
  listMutuals,
  listRecentUnfollowers,
  listSnapshots,
  listYouDontFollowBack,
} from "@/lib/instagram/chat-tools";
import {
  checkAccountInputSchema,
  listRecentUnfollowersInputSchema,
  paginatedListInputSchema,
} from "@/lib/instagram/chat-tool-schemas";
import { cn } from "@/lib/utils/cn";

const SUGGESTIONS = [
  "How many people don't follow me back?",
  "List the first 20 accounts that don't follow me back",
  "Does @instagram follow me back?",
  "Who unfollowed me recently?",
];

type ImportStage = "upload" | "processing";

export default function ChatPage() {
  const snapshots = useSnapshots();
  const loaded = snapshots !== undefined;
  const hasData = (snapshots?.length ?? 0) > 0;
  const [input, setInput] = useState("");

  const [importStage, setImportStage] = useState<ImportStage>("upload");
  const [processingStage, setProcessingStage] = useState<ProcessingStageId>("opening-zip");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [manualUploadOpen, setManualUploadOpen] = useState(false);
  const showUpload = loaded && (!hasData || manualUploadOpen);

  async function handleFile(file: File) {
    setUploadError(null);
    setImportStage("processing");
    setProcessingStage("opening-zip");

    try {
      const result = await parseInstagramExport(file, {
        onStage: (stage) => {
          if (stage !== "done") setProcessingStage(stage);
        },
      });

      const hasFollowers = result.diagnostics.followerFilesUsed.length > 0;
      const hasFollowing = result.diagnostics.followingFilesUsed.length > 0;
      if (!hasFollowers || !hasFollowing) {
        setUploadError(
          "Orbly couldn't find both followers and following data in that file. Make sure you selected the right export — see the steps below — and try again."
        );
        setImportStage("upload");
        return;
      }

      setProcessingStage("calculating");
      const hash = await hashDataset(result.followers, result.following);

      setProcessingStage("checking-duplicate");
      if (result.diagnostics.coverage?.looksLimited) {
        setUploadError(
          "This export only covers a limited date range, not all time, so Orbly can't trust it as your complete follower list. Re-export with the date range set to \"All time\" — see the steps below."
        );
        setImportStage("upload");
        return;
      }

      const existing = await findSnapshotByDatasetHash(hash);
      if (!existing) {
        await createSnapshot({
          followers: result.followers,
          following: result.following,
          datasetHash: hash,
          originalFileName: file.name,
          coverage: result.diagnostics.coverage,
          profileReference: null,
        });
        await reconcileQueueWithFollowing(result.following);
        await updateSettings({ onboardingCompleted: true });
      }

      setProcessingStage("complete");
      await new Promise((r) => setTimeout(r, 500));
      setImportStage("upload");
      setManualUploadOpen(false);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Something went wrong reading that file. Please try again."
      );
      setImportStage("upload");
    }
  }

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;

      try {
        switch (toolCall.toolName) {
          case "getAccountStats": {
            const output = await getAccountStats();
            addToolOutput({ tool: "getAccountStats", toolCallId: toolCall.toolCallId, output });
            return;
          }
          case "listDoesNotFollowBack": {
            const output = await listDoesNotFollowBack(paginatedListInputSchema.parse(toolCall.input));
            addToolOutput({ tool: "listDoesNotFollowBack", toolCallId: toolCall.toolCallId, output });
            return;
          }
          case "listMutuals": {
            const output = await listMutuals(paginatedListInputSchema.parse(toolCall.input));
            addToolOutput({ tool: "listMutuals", toolCallId: toolCall.toolCallId, output });
            return;
          }
          case "listYouDontFollowBack": {
            const output = await listYouDontFollowBack(paginatedListInputSchema.parse(toolCall.input));
            addToolOutput({ tool: "listYouDontFollowBack", toolCallId: toolCall.toolCallId, output });
            return;
          }
          case "checkAccount": {
            const output = await checkAccount(checkAccountInputSchema.parse(toolCall.input));
            addToolOutput({ tool: "checkAccount", toolCallId: toolCall.toolCallId, output });
            return;
          }
          case "listRecentUnfollowers": {
            const output = await listRecentUnfollowers(
              listRecentUnfollowersInputSchema.parse(toolCall.input)
            );
            addToolOutput({ tool: "listRecentUnfollowers", toolCallId: toolCall.toolCallId, output });
            return;
          }
          case "listSnapshots": {
            const output = await listSnapshots();
            addToolOutput({ tool: "listSnapshots", toolCallId: toolCall.toolCallId, output });
            return;
          }
          case "getQueueStatus": {
            const output = await getQueueStatus();
            addToolOutput({ tool: "getQueueStatus", toolCallId: toolCall.toolCallId, output });
            return;
          }
        }
      } catch (err) {
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: err instanceof Error ? err.message : "Reading your Instagram data failed.",
        });
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <>
      <PageHeader
        title="Ask Orbly"
        subtitle="Ask anything about who follows you, who you follow, or Instagram in general."
        action={
          loaded && hasData ? (
            <button
              onClick={() => setManualUploadOpen((v) => !v)}
              className="rounded-lg border border-border-strong bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface"
            >
              {manualUploadOpen ? "Cancel" : "Update Instagram data"}
            </button>
          ) : undefined
        }
      />

      {showUpload && (
        <div className="mb-4 space-y-3">
          {importStage === "upload" && (
            <>
              <Dropzone onFileSelected={handleFile} error={uploadError} />
              <div className="text-center">
                <button
                  onClick={() => setWizardOpen((v) => !v)}
                  className="text-xs font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
                >
                  {wizardOpen ? "Hide the steps" : "Don't have your export yet? Show me the steps"}
                </button>
              </div>
              <AnimatePresence initial={false}>
                {wizardOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <ExportWizard onFinish={() => setWizardOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          {importStage === "processing" && <ProcessingStages current={processingStage} />}
        </div>
      )}

      <p className="mb-4 rounded-lg bg-surface px-3 py-2 text-xs text-ink-soft">
        When you ask about your own account, relevant data from your imported snapshot is sent to
        Anthropic&apos;s API to generate a response. Your export file itself is only ever parsed
        locally in your browser and stored on this device — this is the one feature that sends
        anything off of it.
      </p>

      <div className="flex min-h-[50vh] flex-col rounded-2xl border border-border bg-white">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center"
            >
              <div className="rounded-full bg-gradient-instagram p-[2.5px]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
                  <Sparkles size={18} className="text-violet" />
                </div>
              </div>
              <p className="max-w-xs text-sm text-ink-soft">
                {loaded && !hasData
                  ? "Import your export above to unlock answers about your own account — or ask me anything in the meantime."
                  : "Try one of these, or ask your own question:"}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                    onClick={() => submit(s)}
                    className="rounded-full border border-border-strong bg-white px-3 py-1.5 text-xs text-ink-soft transition-transform hover:scale-[1.03] hover:bg-surface"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className={cn("flex gap-2.5", message.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                {message.role === "user" ? (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                    <User size={13} />
                  </div>
                ) : (
                  <div className="mt-0.5 shrink-0 rounded-full bg-gradient-instagram p-[2px]">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                      <Bot size={12} className="text-ink" />
                    </div>
                  </div>
                )}
                <div className={cn("max-w-[80%] space-y-1.5", message.role === "user" && "items-end")}>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                            message.role === "user" ? "bg-ink text-white" : "bg-surface text-ink"
                          )}
                        >
                          {part.text}
                        </motion.div>
                      );
                    }
                    if (isToolUIPart(part)) {
                      const label = getToolName(part).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
                      const done = part.state === "output-available";
                      const errored = part.state === "output-error";

                      if (done) {
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-1.5"
                          >
                            <div className="flex items-center gap-1.5 px-1 text-[11px] text-ink-faint">
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-green text-white"
                              >
                                <Check size={9} />
                              </motion.span>
                              Checked {label}
                            </div>
                            <ToolResultCard toolName={getToolName(part)} output={part.output} />
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                            errored
                              ? "border-rose/30 bg-rose-soft text-rose"
                              : "border-border-strong bg-white text-ink-faint"
                          )}
                        >
                          {errored ? (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
                          ) : (
                            <span className="h-1.5 w-1.5 shrink-0 animate-pulse-ring rounded-full bg-violet" />
                          )}
                          {errored ? `Couldn't read ${label}: ${part.errorText}` : `Checking ${label}…`}
                        </motion.div>
                      );
                    }
                    return null;
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {status === "submitted" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5"
            >
              <div className="rounded-full bg-gradient-instagram p-[2px]">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <Bot size={12} className="text-ink" />
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-surface px-3.5 py-2.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-ink-faint"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <form
          className="flex items-center gap-2 border-t border-border px-3 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your followers, following, or anything else…"
            disabled={busy}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className={cn(!busy && input.trim() && "bg-gradient-instagram hover:opacity-90")}
          >
            <Send size={15} />
          </Button>
        </form>
      </div>
    </>
  );
}
