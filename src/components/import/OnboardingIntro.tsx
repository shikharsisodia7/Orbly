import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";

interface OnboardingIntroProps {
  onStartWizard: () => void;
  onSkipToUpload: () => void;
}

export function OnboardingIntro({ onStartWizard, onSkipToUpload }: OnboardingIntroProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream">
        <Logo size={30} />
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        See who&apos;s actually in your circle.
      </h1>
      <p className="mt-4 max-w-md text-ink-soft">
        Upload your official Instagram Followers + Following export. Orbly analyzes it locally, in
        your browser — no password required.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button size="lg" onClick={onStartWizard}>
          Get My Instagram Data
        </Button>
        <Button size="lg" variant="secondary" onClick={onSkipToUpload}>
          I Already Downloaded It
        </Button>
      </div>
    </div>
  );
}
