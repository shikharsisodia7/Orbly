import type { Metadata } from "next";
import { FileArchive, Laptop, BarChart3, ServerOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Orbly handles your Instagram data — and why it never leaves your browser.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-ink">Your social graph stays yours.</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Orbly was designed around a single rule: your Instagram data never has to leave your
        device to be useful.
      </p>

      <div className="mt-10 flex items-center justify-between rounded-2xl border border-border bg-cream px-6 py-8">
        {[
          { icon: FileArchive, label: "Your export" },
          { icon: Laptop, label: "Your browser" },
          { icon: BarChart3, label: "Local analysis" },
        ].map((step) => (
          <div key={step.label} className="flex flex-1 flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-ink shadow-sm">
              <step.icon size={20} />
            </div>
            <span className="text-xs text-ink-soft">{step.label}</span>
          </div>
        ))}
        <div className="flex flex-1 flex-col items-center gap-2 text-center opacity-40">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-ink-faint text-ink-faint">
            <ServerOff size={20} />
          </div>
          <span className="text-xs text-ink-faint">Cloud server — not sent</span>
        </div>
      </div>

      <div className="mt-14 space-y-10 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-xl font-semibold text-ink">What happens when you upload a file</h2>
          <p className="mt-3">
            When you drop your Instagram export ZIP into Orbly, it is read entirely by JavaScript
            running in your browser. The file is opened, its contents are parsed, and every
            calculation — mutuals, non-followers, snapshot comparisons — happens on your device.
            The import flow has no server-side upload route. Nothing about your follower list,
            usernames, or profile links is transmitted anywhere as part of importing, viewing, or
            managing your data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">The one exception: Ask Orbly</h2>
          <p className="mt-3">
            The optional <strong>Ask Orbly</strong> chat feature is the single place in the app
            where this changes. It&apos;s a separate, opt-in page — you have to go ask it a
            question for it to do anything. When you do, whatever specific facts are needed to
            answer (e.g. a count, a page of usernames, or whether one account follows you back)
            are sent from your browser to Orbly&apos;s server, which forwards them to Anthropic&apos;s
            API to generate a reply. That request isn&apos;t stored server-side — it passes through
            for that one answer and is gone. Every other page in Orbly (Dashboard, Don&apos;t Follow
            Back, Followers, Following, Mutuals, Unfollowers, Queue, Snapshots, Settings, and the
            import flow itself) is completely unaffected and stays fully local, exactly as
            described on this page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Where your data is stored</h2>
          <p className="mt-3">
            Snapshots, your unfollow queue, and settings are stored in{" "}
            <strong>IndexedDB</strong>, a database built into your browser. It persists across
            sessions on the same device and browser, but it is not synced anywhere and can be
            cleared if you clear your browser&apos;s site data — which is why Orbly offers a manual
            backup export in Settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">What we never do</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>We never ask for your Instagram password.</li>
            <li>We never log into Instagram on your behalf.</li>
            <li>We never store your follower or following lists on a server.</li>
            <li>We never require an account or email address to use Orbly.</li>
            <li>We never automate actions on Instagram, including unfollowing.</li>
            <li>We never send your data anywhere unless you open Ask Orbly and ask it a question.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Analytics</h2>
          <p className="mt-3">
            Orbly does not include any telemetry that transmits usernames, profile data, or
            follower counts. Standard, privacy-respecting page-level analytics may be used to
            understand traffic to the marketing site only — never inside the analysis tool itself.
          </p>
        </section>
      </div>

      <p className="mt-14 text-xs text-ink-faint">
        Orbly is not affiliated with or endorsed by Instagram or Meta.
      </p>
    </div>
  );
}
