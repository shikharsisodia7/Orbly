import { ButtonLink } from "@/components/ui/ButtonLink";
import { HeroDemo } from "./HeroDemo";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-5 pt-16 pb-20 md:grid-cols-[45%_55%] md:pt-24 md:pb-28">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Know who&apos;s really in your circle.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
            Upload your official Instagram export and see who follows you, who doesn&apos;t
            follow back, and who quietly disappeared — all analyzed on your own device.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/app" size="lg">
              Analyze My Account
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
