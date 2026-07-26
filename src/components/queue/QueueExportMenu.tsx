"use client";

import { useState } from "react";
import { Copy, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { queueToCsv, queueToJson, queueToText, downloadTextFile } from "@/lib/utils/queue-export";
import type { QueueItemRecord } from "@/lib/db/schema";

export function QueueExportMenu({ items }: { items: QueueItemRecord[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(queueToText(items));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} className="gap-1.5">
        <Download size={14} />
        Export
        <ChevronDown size={13} />
      </Button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-52 rounded-xl border border-border bg-white p-1.5 shadow-lg">
          <button
            onClick={handleCopy}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface"
          >
            <Copy size={14} />
            {copied ? "Copied!" : "Copy Usernames"}
          </button>
          <button
            onClick={() => {
              downloadTextFile("orbly-queue.txt", queueToText(items), "text/plain");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface"
          >
            <Download size={14} /> Export TXT
          </button>
          <button
            onClick={() => {
              downloadTextFile("orbly-queue.csv", queueToCsv(items), "text/csv");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => {
              downloadTextFile("orbly-queue.json", queueToJson(items), "application/json");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface"
          >
            <Download size={14} /> Export JSON
          </button>
        </div>
      )}
    </div>
  );
}
