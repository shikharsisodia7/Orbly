"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Bot, Send, User } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSnapshots } from "@/hooks/useSnapshots";
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

export default function ChatPage() {
  const snapshots = useSnapshots();
  const hasData = (snapshots?.length ?? 0) > 0;
  const [input, setInput] = useState("");

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
      />

      {!hasData && (
        <p className="mb-4 rounded-lg bg-surface px-3 py-2 text-xs text-ink-soft">
          No Instagram data imported yet — general questions still work, but questions about your
          own followers/following need an import first.
        </p>
      )}

      <p className="mb-4 rounded-lg bg-surface px-3 py-2 text-xs text-ink-soft">
        When you ask about your own account, relevant data from your imported snapshot is sent to
        Anthropic&apos;s API to generate a response. Every other page in Orbly stays fully local —
        this is the one feature that leaves your browser.
      </p>

      <div className="flex min-h-[50vh] flex-col rounded-2xl border border-border bg-white">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink-faint">
                <Bot size={18} />
              </div>
              <p className="max-w-xs text-sm text-ink-soft">
                Try one of these, or ask your own question:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border border-border-strong bg-white px-3 py-1.5 text-xs text-ink-soft hover:bg-surface"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex gap-2.5", message.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  message.role === "user" ? "bg-ink text-white" : "bg-surface text-ink-faint"
                )}
              >
                {message.role === "user" ? <User size={13} /> : <Bot size={13} />}
              </div>
              <div className={cn("max-w-[80%] space-y-1.5", message.role === "user" && "items-end")}>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <div
                        key={index}
                        className={cn(
                          "whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                          message.role === "user" ? "bg-ink text-white" : "bg-surface text-ink"
                        )}
                      >
                        {part.text}
                      </div>
                    );
                  }
                  if (isToolUIPart(part)) {
                    const label = getToolName(part).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
                    return (
                      <div key={index} className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-ink-faint">
                        {part.state === "output-error"
                          ? `Couldn't read ${label}: ${part.errorText}`
                          : part.state === "output-available"
                            ? `Checked ${label}`
                            : `Checking ${label}…`}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {status === "submitted" && (
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <Bot size={13} /> Thinking…
            </div>
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
          <Button type="submit" disabled={busy || !input.trim()} aria-label="Send">
            <Send size={15} />
          </Button>
        </form>
      </div>
    </>
  );
}
