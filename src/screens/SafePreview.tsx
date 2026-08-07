import { useState } from "react";
import { motion } from "motion/react";
import { Safe, type SafeState } from "../components/Safe";

/**
 * Dev-only comparison + animation bench. Delete once the safe is signed off.
 * Route: /safes
 */
const ROWS: { label: string; state: SafeState }[] = [
  { label: "Available (closed)", state: "available" },
  { label: "Solved (open)", state: "solved" },
  { label: "Locked (disabled)", state: "locked" },
];

export function SafePreview() {
  // Animation bench
  const [benchState, setBenchState] = useState<SafeState>("available");
  const [replay, setReplay] = useState(0);
  const [shake, setShake] = useState(0);

  const playUnlock = () => {
    setBenchState("available");
    setTimeout(() => setBenchState("solved"), 60);
  };

  return (
    <div className="min-h-dvh bg-[#F5F2E8] p-5 font-body">
      <h1 className="font-display text-2xl text-ink">SAFE — CODE VERSION</h1>
      <p className="mb-6 mt-1 text-[13px] text-ink/60">
        Compare against the asset sheet. Animation bench is at the bottom.
      </p>

      {/* ---------- ANIMATION BENCH ---------- */}
      <section className="mb-9 rounded-[18px] border-3 border-ink bg-white p-4">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">
          Animation bench — tap the buttons
        </h2>

        <div className="flex items-start gap-5">
          <motion.div
            className="h-32 w-32 shrink-0"
            animate={shake ? { x: [0, -6, 6, -5, 5, -3, 0] } : { x: 0 }}
            transition={{ duration: 0.36 }}
            key={`shake-${shake}`}
          >
            <Safe digit={4} state={benchState} replayKey={replay || undefined} />
          </motion.div>

          <div className="flex flex-col gap-2">
            <button
              onClick={playUnlock}
              className="rounded-[12px] border-3 border-ink bg-[#E53935] px-4 py-2 text-left font-display text-[13px] text-white active:translate-y-[2px]"
            >
              PLAY UNLOCK
            </button>
            <button
              onClick={() => setBenchState("available")}
              className="rounded-[12px] border-3 border-ink bg-[#F5F2E8] px-4 py-2 text-left font-display text-[13px] text-ink active:translate-y-[2px]"
            >
              RESET TO CLOSED
            </button>
            <button
              onClick={() => { setBenchState("locked"); setShake((n) => n + 1); }}
              className="rounded-[12px] border-3 border-ink bg-[#F5F2E8] px-4 py-2 text-left font-display text-[13px] text-ink active:translate-y-[2px]"
            >
              LOCKED + REJECT SHAKE
            </button>
            <p className="mt-1 max-w-[16rem] text-[12px] leading-snug text-ink/55">
              Unlock is a sequence: wheel spins 900°, then the door swings on its
              hinge, then the digit lands inside. ~1.2s total.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- STATIC SHEETS ---------- */}
      {ROWS.map(({ label, state }) => (
        <section key={state} className="mb-7">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">
            {label}
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <Safe key={i} digit={i + 1} state={state} />
            ))}
          </div>
        </section>
      ))}

      <section className="mb-7">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">
          Actual board — 3×3 at real size
        </h2>
        <div className="grid max-w-[340px] grid-cols-3 gap-3">
          {(["solved","solved","available","available","available","locked","locked","locked","locked"] as SafeState[])
            .map((s, i) => <Safe key={i} digit={i + 1} state={s} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">
          Small (48px) — does it survive?
        </h2>
        <div className="flex gap-2">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="h-12 w-12">
              <Safe digit={i + 1} state={i < 3 ? "solved" : i < 6 ? "available" : "locked"} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
