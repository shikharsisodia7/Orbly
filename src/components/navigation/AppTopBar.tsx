"use client";

import { RefreshCw } from "lucide-react";
import { CommandMenu } from "./CommandMenu";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useSnapshots } from "@/hooks/useSnapshots";

export function AppTopBar() {
  const snapshots = useSnapshots();
  const hasSnapshots = (snapshots?.length ?? 0) > 0;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-white/80 px-5 backdrop-blur md:px-8">
      <div className="flex-1 md:max-w-xs">
        <CommandMenu />
      </div>
      {hasSnapshots && (
        <ButtonLink href="/app/import" size="sm" variant="secondary" className="gap-1.5">
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Update Instagram Data</span>
          <span className="sm:hidden">Update</span>
        </ButtonLink>
      )}
    </header>
  );
}
