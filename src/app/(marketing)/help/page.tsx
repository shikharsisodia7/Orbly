import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help Center",
  description: "How to export your Instagram data and use Orbly.",
};

const SECTIONS = [
  {
    id: "download",
    title: "How to download your Instagram data",
    body: (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Open Instagram and go to your profile.</li>
        <li>
          Tap the menu icon, then open <strong>Settings</strong>, then <strong>Accounts Center</strong>.
        </li>
        <li>
          In Accounts Center, tap <strong>Your information and permissions</strong>.
        </li>
        <li>
          Tap <strong>Export your information</strong>.
        </li>
        <li>Choose to create a new export and select the Instagram profile you want to analyze.</li>
        <li>
          When asked what to include, choose to export <strong>specific information</strong> and select
          only <strong>Followers and Following</strong>.
        </li>
        <li>
          Set the destination to <strong>Download to device</strong>, the date range to{" "}
          <strong>All time</strong>, and the format to <strong>JSON</strong>.
        </li>
        <li>Request the export. Meta may take anywhere from a few minutes to a day or more to prepare it.</li>
        <li>When it&apos;s ready, Meta will notify you — download the ZIP file to your device.</li>
        <li>
          Come back to Orbly and drop that ZIP into the upload box at the top of the <Link href="/app/chat" className="text-blue underline">chat</Link>.
        </li>
      </ol>
    ),
  },
  {
    id: "what-to-select",
    title: "Exactly what information to select",
    body: (
      <p>
        Select only <strong>Followers and Following</strong>. You don&apos;t need messages, photos,
        comments, ads activity, or anything else — selecting less also makes Meta prepare your
        export faster.
      </p>
    ),
  },
  {
    id: "why-json",
    title: "Why JSON?",
    body: (
      <p>
        JSON is a structured, machine-readable format that Orbly can parse automatically and
        reliably. Instagram&apos;s older HTML export format works too — Orbly can read both — but
        JSON is the format Meta recommends and the one this app is built around first.
      </p>
    ),
  },
  {
    id: "why-all-time",
    title: "Why All time?",
    body: (
      <>
        <p>
          Choosing a shorter date range leaves out followers and accounts you followed before that
          window, which makes your snapshot incomplete.
        </p>
        <p>
          This is the single most common reason Orbly&apos;s numbers look wrong. Meta sometimes
          defaults the date range to the last year, and an export like that will show far fewer
          followers than your profile does — while still showing your full following list, which
          makes &quot;doesn&apos;t follow you back&quot; look absurdly high.
        </p>
        <p>
          Orbly reads the date window Meta stamps inside the export and warns you at import time if
          it isn&apos;t a true all-time export, so you&apos;ll know before you trust the numbers.
        </p>
      </>
    ),
  },
  {
    id: "what-file",
    title: "What file do I upload?",
    body: (
      <p>
        Upload the entire <strong>ZIP file</strong> Meta gives you — don&apos;t extract it first.
        Orbly opens the ZIP directly in your browser and searches it for the relevant files.
      </p>
    ),
  },
  {
    id: "snapshots",
    title: "How snapshot tracking works",
    body: (
      <p>
        Every time you import an export, Orbly saves a <strong>snapshot</strong>: a timestamped
        record of your followers and following at that moment. With two or more snapshots, Orbly
        can compare them to show you what changed — new followers, lost followers, and who you
        started or stopped following.
      </p>
    ),
  },
  {
    id: "not-follow-back-vs-unfollowed",
    title: "“Doesn't follow back” vs. “unfollowed”",
    body: (
      <p>
        <strong>Doesn&apos;t follow you back</strong> is a snapshot of right now — someone you
        follow who currently doesn&apos;t follow you. It says nothing about history. A{" "}
        <strong>lost follower</strong> (what some people call an &quot;unfollow&quot;) is someone
        who appeared in an earlier snapshot&apos;s followers and is missing from a later one. Orbly
        never claims to know the exact moment someone unfollowed you — only that it happened
        sometime between two snapshots.
      </p>
    ),
  },
  {
    id: "how-often",
    title: "How often should I import?",
    body: (
      <p>
        As often as you&apos;d like to check in — weekly or monthly is common. More frequent
        snapshots give you a more precise window for when changes happened.
      </p>
    ),
  },
  {
    id: "queue",
    title: "How the Unfollow Queue works",
    body: (
      <p>
        Add accounts to your queue from the Doesn&apos;t Follow Back or Recent Unfollowers pages.
        In the queue, Orbly opens each profile on instagram.com in a new tab — you decide whether
        to unfollow, then mark the item Done or Skip. Orbly never automates or performs the
        unfollow action itself.
      </p>
    ),
  },
  {
    id: "data-storage",
    title: "Where is my data stored?",
    body: (
      <p>
        Everything is stored in your browser&apos;s IndexedDB, a local database built into every
        modern browser. Nothing is uploaded to Orbly&apos;s servers or any third party.
      </p>
    ),
  },
  {
    id: "password",
    title: "Does this app need my password?",
    body: <p>No. Orbly never asks for your Instagram password or logs in on your behalf.</p>,
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>&quot;We couldn&apos;t find Followers or Following information&quot;</strong> —
          double check you selected Followers and Following when creating the export, and that
          you&apos;re uploading the full ZIP.
        </li>
        <li>
          <strong>Import feels slow</strong> — very large exports (10,000+ accounts) take longer to
          parse; the progress screen shows real stages, not a fake loader.
        </li>
        <li>
          <strong>Duplicate snapshot warning</strong> — Orbly detected that this export contains the
          exact same follower/following data as an existing snapshot.
        </li>
        <li>
          <strong>My follower count is way lower than Instagram shows</strong> — your export was
          almost certainly date-limited rather than all-time. If Meta&apos;s own export file says so,
          Orbly blocks the import outright with instructions to request a new All-time export
          instead of letting you create a misleading snapshot from it.
        </li>
        <li>
          <strong>&quot;This snapshot is incomplete&quot;</strong> — you&apos;ll see this instead of
          your usual dashboard when a snapshot is marked <em>Partial</em> or <em>Invalid</em>.
          Mutuals, doesn&apos;t-follow-back, and unfollower tracking are hidden until you import a
          complete export — Orbly won&apos;t calculate those from data it can&apos;t trust. Every
          snapshot on the Snapshots page shows a status badge (Complete, Unverified, Partial, or
          Invalid) so you always know which imports are trustworthy.
        </li>
        <li>
          <strong>Verify against Instagram</strong> — on the import confirmation screen, you can
          optionally enter the follower/following counts shown on your live Instagram profile.
          Orbly compares them to what it parsed and flags a significant shortfall. This never adds
          or removes accounts — it&apos;s a completeness check only.
        </li>
        <li>
          <strong>Someone I already unfollowed still appears</strong> — your snapshot was taken
          before you unfollowed them. Mark them Done in the queue and they&apos;re hidden right
          away; they drop out permanently after your next import.
        </li>
        <li>
          <strong>Accounts in my queue no longer exist</strong> — when you import a new export,
          Orbly automatically closes out any queued account that&apos;s no longer in your following
          list, whether you unfollowed them or their account was deleted. Use{" "}
          <em>Clear resolved</em> on the queue page to remove them entirely.
        </li>
      </ul>
    ),
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-ink">Help Center</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Everything you need to export your Instagram data and get the most out of Orbly.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-[220px_1fr]">
        <nav aria-label="Help sections" className="hidden md:block">
          <ul className="sticky top-24 space-y-3 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-ink-soft hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-14">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-ink">{s.title}</h2>
              <div className="mt-3 max-w-2xl space-y-3 text-[15px] leading-relaxed text-ink-soft">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
