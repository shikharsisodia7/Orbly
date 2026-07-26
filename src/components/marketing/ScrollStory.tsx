"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";

const STAGES = [
  {
    title: "Followers enter.",
    text: "Orbly reads your Followers export and counts exactly who follows you today.",
  },
  {
    title: "Following enters.",
    text: "Then your Following export — everyone whose updates you've chosen to see.",
  },
  {
    title: "Mutuals connect.",
    text: "Anyone in both lists is a mutual: you follow each other.",
  },
  {
    title: "Non-mutual accounts separate.",
    text: "Everyone else splits into two groups — who doesn't follow you back, and who you don't follow back.",
  },
  {
    title: "A second snapshot appears.",
    text: "Import another export later, and Orbly keeps both snapshots side by side.",
  },
  {
    title: "Lost followers highlight.",
    text: "Compare the two, and anyone who disappeared between them is called out clearly.",
  },
] as const;

/**
 * Tracks which stage block's center is closest to the viewport's vertical
 * center. Computed directly from live geometry on every scroll frame rather
 * than relying on IntersectionObserver's enter/exit events, which can miss
 * a block entirely during a large or fast scroll jump.
 */
function useActiveStage(count: number) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const ticking = useRef(false);

  useEffect(() => {
    function recompute() {
      ticking.current = false;
      const viewportCenter = window.innerHeight / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;

      refs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elementCenter - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      });

      setActive(closestIndex);
    }

    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(recompute);
    }

    recompute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count]);

  return { active, refs };
}

function StoryPanel({ stage }: { stage: number }) {
  return (
    <div className="relative h-[320px] w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
      <AnimatePresence mode="wait">
        {stage === 0 && (
          <motion.div key="s0" {...panelMotion} className="flex h-full flex-col justify-center gap-3">
            <p className="text-xs font-medium text-ink-faint">Followers</p>
            <p className="text-4xl font-semibold text-ink">
              <AnimatedCounter value={1824} />
            </p>
            <div className="mt-2 flex -space-x-2">
              {["riv.er", "maya.c", "noahs", "jordanl"].map((u) => (
                <Avatar key={u} username={u} size={30} className="ring-2 ring-white" />
              ))}
            </div>
          </motion.div>
        )}
        {stage === 1 && (
          <motion.div key="s1" {...panelMotion} className="flex h-full flex-col justify-center gap-5">
            <div>
              <p className="text-xs font-medium text-ink-faint">Followers</p>
              <p className="text-2xl font-semibold text-ink">1,824</p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-faint">Following</p>
              <p className="text-2xl font-semibold text-ink">
                <AnimatedCounter value={1249} />
              </p>
            </div>
          </motion.div>
        )}
        {stage === 2 && (
          <motion.div key="s2" {...panelMotion} className="flex h-full flex-col items-center justify-center gap-4">
            <div className="relative flex h-32 w-full items-center justify-center">
              <div className="absolute left-8 h-24 w-24 rounded-full bg-rose-soft" />
              <div className="absolute right-8 h-24 w-24 rounded-full bg-blue-soft" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-violet text-sm font-semibold text-white">
                <AnimatedCounter value={1061} />
              </div>
            </div>
            <p className="text-xs font-medium text-ink-faint">Mutual connections</p>
          </motion.div>
        )}
        {stage === 3 && (
          <motion.div key="s3" {...panelMotion} className="flex h-full flex-col justify-center gap-4">
            {[
              { label: "Mutual", value: 1061, tone: "bg-green" },
              { label: "Don't follow you back", value: 188, tone: "bg-orange" },
              { label: "You don't follow back", value: 763, tone: "bg-blue" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-ink-soft">
                  <span className={`h-2 w-2 rounded-full ${row.tone}`} />
                  {row.label}
                </span>
                <span className="text-sm font-semibold text-ink">{row.value}</span>
              </div>
            ))}
          </motion.div>
        )}
        {stage === 4 && (
          <motion.div key="s4" {...panelMotion} className="flex h-full flex-col justify-center gap-4">
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <span className="text-xs font-medium text-ink-faint">JUL 25</span>
              <span className="text-sm font-semibold text-ink">1,824 followers</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-cream px-4 py-3">
              <span className="text-xs font-medium text-ink-faint">AUG 03</span>
              <span className="text-sm font-semibold text-ink">1,817 followers</span>
            </div>
          </motion.div>
        )}
        {stage === 5 && (
          <motion.div key="s5" {...panelMotion} className="flex h-full flex-col justify-center gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ink-faint">Lost followers</p>
              <span className="rounded-full bg-rose-soft px-2.5 py-1 text-xs font-medium text-rose">
                7 changed
              </span>
            </div>
            {["alexriver", "maya.c"].map((u) => (
              <div key={u} className="flex items-center gap-3 rounded-xl bg-rose-soft/60 px-3 py-2.5">
                <Avatar username={u} size={26} />
                <div>
                  <p className="text-sm text-ink">@{u}</p>
                  <p className="text-[11px] text-ink-faint">Detected Jul 25 – Aug 3</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35 },
};

export function ScrollStory() {
  const { active, refs } = useActiveStage(STAGES.length);

  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="max-w-xl">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">
          One export tells you more than you think.
        </h2>
      </div>

      {/* Desktop: sticky panel + scrolling text */}
      <div className="mt-12 hidden grid-cols-2 gap-16 md:grid">
        <div>
          {STAGES.map((stage, i) => (
            <div
              key={stage.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="flex h-[60vh] flex-col justify-center"
            >
              <p className="text-sm font-medium text-ink-faint">{`0${i + 1}`}</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">{stage.title}</h3>
              <p className="mt-3 max-w-sm text-ink-soft">{stage.text}</p>
            </div>
          ))}
        </div>
        <div className="sticky top-24 flex h-fit items-center justify-center self-start">
          <StoryPanel stage={active} />
        </div>
      </div>

      {/* Mobile: sequential blocks */}
      <div className="mt-10 flex flex-col gap-14 md:hidden">
        {STAGES.map((stage, i) => (
          <div key={stage.title}>
            <p className="text-sm font-medium text-ink-faint">{`0${i + 1}`}</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">{stage.title}</h3>
            <p className="mt-2 text-ink-soft">{stage.text}</p>
            <div className="mt-5 flex justify-center">
              <StoryPanel stage={i} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
