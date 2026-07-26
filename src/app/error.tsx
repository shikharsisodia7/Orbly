"use client";

import { useEffect } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-5 text-center">
      <Wordmark size="md" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Something went wrong.</h1>
        <p className="mt-2 max-w-sm text-ink-soft">
          That&apos;s on us — nothing about your Instagram data was lost. Try again, and if it keeps
          happening, a page refresh usually helps.
        </p>
      </div>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
