import { ButtonLink } from "@/components/ui/ButtonLink";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="rounded-3xl bg-cream px-8 py-16 text-center sm:px-16">
        <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Just ask.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">
          It takes about two minutes to export your data from Instagram. After that, Orbly answers
          whatever you ask about your followers — instantly, in plain English.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink
            href="/app/chat"
            size="lg"
            className="bg-gradient-instagram text-white shadow-[0_8px_30px_-8px_rgba(150,47,191,0.55)] hover:opacity-90"
          >
            Chat With Orbly
          </ButtonLink>
        </div>
        <p className="mt-4 text-sm text-ink-faint">No login. No password. Nothing leaves your browser.</p>
      </div>
    </section>
  );
}
