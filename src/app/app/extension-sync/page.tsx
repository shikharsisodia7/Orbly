"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, PlugZap, XCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  cacheAccountBio,
  createSnapshot,
  findSnapshotByDatasetHash,
  reconcileQueueWithFollowing,
  setAccountStatus,
  updateSettings,
} from "@/lib/db/queries";
import { hashDataset } from "@/lib/instagram/hash";
import { normalizeUsername } from "@/lib/instagram/normalize";
import {
  normalizeExtensionScrapedList,
  parseExtensionMessage,
  ExtensionMessageValidationError,
  type ExtensionMessage,
} from "@/lib/instagram/extension-sync";

/**
 * The receiving end of the browser extension's manual "Sync to Orbly"
 * action. The extension's own content script (injected only on this page's
 * origin, per its manifest) reads a pending payload from chrome.storage.local
 * and forwards it here with `window.postMessage` — nothing on this page
 * reaches out to the extension or to Instagram; it only listens.
 *
 * Every message is origin-checked (must come from this exact page's own
 * window, which is what a same-origin content script's postMessage always
 * is) and schema-validated (parseExtensionMessage) before anything is
 * written to IndexedDB — a page is never trusted just because it claims to
 * be from the extension.
 */

type EventLogEntry = { id: string; kind: "success" | "error"; message: string; at: string };

const MESSAGE_SOURCE = "orbly-extension";

interface IncomingEnvelope {
  source: typeof MESSAGE_SOURCE;
  payload: unknown;
}

function isEnvelope(data: unknown): data is IncomingEnvelope {
  return !!data && typeof data === "object" && (data as { source?: unknown }).source === MESSAGE_SOURCE;
}

export default function ExtensionSyncPage() {
  const [log, setLog] = useState<EventLogEntry[]>([]);

  useEffect(() => {
    function pushLog(kind: EventLogEntry["kind"], message: string) {
      setLog((prev) => [{ id: crypto.randomUUID(), kind, message, at: new Date().toISOString() }, ...prev].slice(0, 20));
    }

    async function handleMessage(message: ExtensionMessage) {
      if (message.type === "orbly-extension-sync") {
        const followers = normalizeExtensionScrapedList(message.followers);
        const following = normalizeExtensionScrapedList(message.following);
        const hash = await hashDataset(followers.relationships, following.relationships);
        const existing = await findSnapshotByDatasetHash(hash);
        if (existing) {
          pushLog("success", "This exact followers/following data is already synced — nothing new to add.");
          return;
        }
        await createSnapshot({
          followers: followers.relationships,
          following: following.relationships,
          datasetHash: hash,
          originalFileName: null,
          label: message.sourceUsername ? `Extension sync — @${message.sourceUsername}` : "Extension sync",
          coverage: null,
          profileReference: null,
        });
        await reconcileQueueWithFollowing(following.relationships);
        await updateSettings({ onboardingCompleted: true });
        pushLog(
          "success",
          `Synced ${followers.relationships.length} followers and ${following.relationships.length} following` +
            (followers.skipped + following.skipped > 0
              ? ` (${followers.skipped + following.skipped} entries skipped as unparseable or deleted/deactivated placeholders).`
              : ".")
        );
        return;
      }
      if (message.type === "orbly-extension-bio") {
        await cacheAccountBio(normalizeUsername(message.username), message.bio);
        pushLog("success", `Captured bio for @${normalizeUsername(message.username)}.`);
        return;
      }
      if (message.type === "orbly-extension-status") {
        await setAccountStatus(normalizeUsername(message.username), message.status);
        pushLog("success", `Recorded @${normalizeUsername(message.username)} as "${message.status}".`);
      }
    }

    function onWindowMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!isEnvelope(event.data)) return;
      try {
        const message = parseExtensionMessage(event.data.payload);
        void handleMessage(message);
      } catch (err) {
        const text = err instanceof ExtensionMessageValidationError ? err.message : "Received an unreadable message.";
        pushLog("error", text);
      }
    }

    window.addEventListener("message", onWindowMessage);
    return () => window.removeEventListener("message", onWindowMessage);
  }, []);

  return (
    <>
      <PageHeader
        title="Extension Sync"
        subtitle="This page receives data from the Orbly browser extension when you click Sync there — nothing happens here on its own."
      />

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-sm text-ink-soft">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-soft text-green">
          <PlugZap size={15} />
        </div>
        Listening for a sync from the Orbly extension. Open your Instagram followers or following list, click the
        Orbly extension icon, and press Sync — this tab will update automatically.
      </div>

      <div className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {log.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${
                entry.kind === "success" ? "border-green/20 bg-green-soft text-green" : "border-rose/20 bg-rose-soft text-rose"
              }`}
            >
              {entry.kind === "success" ? (
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              ) : (
                <XCircle size={15} className="mt-0.5 shrink-0" />
              )}
              <div>
                <p>{entry.message}</p>
                <p className="mt-0.5 text-[11px] opacity-70">{new Date(entry.at).toLocaleTimeString()}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
