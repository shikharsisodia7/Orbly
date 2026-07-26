import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-5 py-24 text-center">
      <Link href="/">
        <Wordmark size="md" />
      </Link>
      <div>
        <p className="text-sm font-medium text-ink-faint">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          This page doesn&apos;t exist.
        </h1>
        <p className="mt-2 text-ink-soft">
          The page you&apos;re looking for may have moved, or the link might be off.
        </p>
      </div>
      <ButtonLink href="/">Back to Orbly</ButtonLink>
    </div>
  );
}
