import { FileArchive, Laptop, BarChart3, ServerOff, Check } from "lucide-react";

const FLOW = [
  { icon: FileArchive, label: "Your Instagram export" },
  { icon: Laptop, label: "Your browser" },
  { icon: BarChart3, label: "Local analysis" },
];

const PROMISES = [
  "No password",
  "No Instagram login",
  "No follower database",
  "No account creation",
  "No backend upload",
];

export function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-20 bg-near-black py-24 text-white">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight">Your social graph stays yours.</h2>
          <p className="mt-3 text-white/60">
            Orbly was built so that nobody — including us — ever sees your follower data.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div className="flex flex-col items-center gap-0 sm:flex-row sm:justify-between">
            {FLOW.map((step, i) => (
              <div key={step.label} className="flex items-center gap-0 sm:flex-1">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <step.icon size={22} />
                  </div>
                  <span className="max-w-[90px] text-xs text-white/70">{step.label}</span>
                </div>
                {i < FLOW.length - 1 && (
                  <div className="mx-2 hidden h-px flex-1 bg-white/20 sm:block" />
                )}
              </div>
            ))}
            <div className="mx-2 hidden h-px w-8 bg-white/10 sm:block" />
            <div className="flex flex-col items-center gap-3 text-center opacity-40">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/30 text-white">
                <ServerOff size={22} />
              </div>
              <span className="max-w-[90px] text-xs text-white/50">Cloud server</span>
              <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/50">
                NOT SENT
              </span>
            </div>
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/80">
                <Check size={16} className="shrink-0 text-green" />
                {promise}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
