"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnapshots } from "@/hooks/useSnapshots";
import { Logo } from "@/components/brand/Logo";

export default function AppEntryPage() {
  const router = useRouter();
  const snapshots = useSnapshots();

  useEffect(() => {
    if (snapshots === undefined) return; // still loading
    if (snapshots.length === 0) {
      router.replace("/app/import");
    } else {
      router.replace("/app/dashboard");
    }
  }, [snapshots, router]);

  return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="animate-pulse">
        <Logo size={36} />
      </div>
    </div>
  );
}
