import { Download, ScanLine, GitCompareArrows } from "lucide-react";

const STEPS = [
  {
    icon: Download,
    tone: "bg-rose-soft text-rose",
    title: "Export",
    description: "Download your Followers and Following data straight from Instagram — no third-party access needed.",
  },
  {
    icon: ScanLine,
    tone: "bg-violet-soft text-violet",
    title: "Analyze",
    description: "Drop the file into Orbly. Everything is read and calculated locally, right in your browser.",
  },
  {
    icon: GitCompareArrows,
    tone: "bg-blue-soft text-blue",
    title: "Compare",
    description: "Import another export later and Orbly shows you exactly what changed between the two.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <div className="max-w-xl">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">How it works</h2>
        <p className="mt-3 text-ink-soft">
          Three steps, no account required. Your export never leaves your device.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.title} className="relative">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.tone}`}>
              <step.icon size={20} />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-ink">
              <span className="mr-2 text-ink-faint">{i + 1}.</span>
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
