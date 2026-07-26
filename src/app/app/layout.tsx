import type { Metadata } from "next";
import { Sidebar } from "@/components/navigation/Sidebar";
import { MobileNav } from "@/components/navigation/MobileNav";
import { AppTopBar } from "@/components/navigation/AppTopBar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-paper">
      <Sidebar />
      <div className="md:pl-64">
        <AppTopBar />
        <main className="px-5 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
