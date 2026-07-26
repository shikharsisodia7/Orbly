import { ButtonLink } from "@/components/ui/ButtonLink";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="rounded-3xl bg-cream px-8 py-16 text-center sm:px-16">
        <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          See your circle clearly.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">
          It takes about two minutes to export your data from Instagram, and Orbly does the rest
          instantly.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/app" size="lg">
            Analyze My Account
          </ButtonLink>
        </div>
        <p className="mt-4 text-sm text-ink-faint">No login. No password. Nothing leaves your browser.</p>
      </div>
    </section>
  );
}
