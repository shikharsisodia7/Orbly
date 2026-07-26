"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const FAQ_ITEMS = [
  {
    question: "Can this see who unfollowed me before my first snapshot?",
    answer:
      "No. Orbly only knows what's in the exports you upload. Anything that happened before your first snapshot isn't visible.",
  },
  {
    question: "Can this know exactly when someone unfollowed me?",
    answer:
      "No. It knows the change happened sometime between two snapshots — for example, between July 25 and August 3 — not the exact moment.",
  },
  {
    question: "Do you need my Instagram password?",
    answer: "No. Orbly never asks for your password or logs into Instagram on your behalf.",
  },
  {
    question: "Is my ZIP uploaded to your server?",
    answer:
      "No. Your export file is read and processed entirely in your browser using JavaScript. It's never sent anywhere.",
  },
  {
    question: "Can the app automatically unfollow people?",
    answer:
      "No. The Unfollow Queue opens profiles for you in a new tab — you personally decide whether to unfollow each one.",
  },
  {
    question: "Does clearing my browser data delete my history?",
    answer:
      "Potentially, yes — Orbly stores snapshots in your browser's local storage. We recommend exporting a backup from Settings periodically.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-20">
      <h2 className="text-3xl font-semibold tracking-tight text-ink">Frequently asked questions</h2>

      <div className="mt-8 divide-y divide-border border-t border-b border-border">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.question}>
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="font-medium text-ink">{item.question}</span>
                <ChevronDown
                  size={18}
                  className={cn("shrink-0 text-ink-faint transition-transform duration-200", isOpen && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "grid overflow-hidden transition-all duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <p className="overflow-hidden text-sm leading-relaxed text-ink-soft">{item.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
