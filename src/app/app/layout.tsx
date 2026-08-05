import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareText, Settings } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
        <Link href="/app/chat">
          <Wordmark size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/app/feedback"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink"
            aria-label="Help & Feedback"
            title="Help & Feedback"
          >
            <MessageSquareText size={16} />
          </Link>
          <Link
            href="/app/settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink"
            aria-label="Settings"
          >
            <Settings size={16} />
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 md:px-6">{children}</main>
    </div>
  );
}
