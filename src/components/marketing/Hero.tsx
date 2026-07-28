import { ButtonLink } from "@/components/ui/ButtonLink";
import { HeroDemo } from "./HeroDemo";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-5 pt-16 pb-20 md:grid-cols-[45%_55%] md:pt-24 md:pb-28">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Ask anything about <span className="text-gradient-instagram">your Instagram circle.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
            Upload your official Instagram export once, then just ask — who doesn&apos;t follow you
            back, who unfollowed you, whether one specific account follows you. Orbly answers in
            plain English, right in the chat.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href="/app/chat"
              size="lg"
              className="bg-gradient-instagram text-white shadow-[0_8px_30px_-8px_rgba(150,47,191,0.55)] hover:opacity-90"
            >
              Chat With Orbly
            </ButtonLink>
            <ButtonLink href="/#how-it-works" size="lg" variant="secondary">
              See How It Works
            </ButtonLink>
          </div>
          <p className="mt-5 text-sm text-ink-faint">
            No login. No password. Your data stays in your browser.
          </p>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-x-10 -inset-y-10 -z-10 rounded-full bg-gradient-to-br from-rose-soft via-violet-soft to-blue-soft opacity-60 blur-3xl"
            aria-hidden
          />
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}
