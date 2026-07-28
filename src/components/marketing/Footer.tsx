import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

export function Footer() {
  return (
    <footer className="border-t border-border bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Wordmark size="sm" />
            <p className="mt-3 max-w-xs text-sm text-ink-soft">
              Ask anything about your Instagram circle. Answered locally, in your browser.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Product
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/#how-it-works" className="text-ink-soft hover:text-ink">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/app/chat" className="text-ink-soft hover:text-ink">
                    Chat With Orbly
                  </Link>
                </li>
                <li>
                  <Link href="/#faq" className="text-ink-soft hover:text-ink">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Resources
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/help" className="text-ink-soft hover:text-ink">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-ink-soft hover:text-ink">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Orbly. All rights reserved.</p>
          <p>Not affiliated with or endorsed by Instagram or Meta.</p>
        </div>
      </div>
    </footer>
  );
}
