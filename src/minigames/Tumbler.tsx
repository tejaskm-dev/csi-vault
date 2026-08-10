import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { playTap } from "../lib/sound";
import type { MinigameProps } from "./types";

/**
 * CRACK THE TUMBLER — drag three dials to a combination.
 *
 * The most on-theme game in the set, and the reason it is first: the whole app
 * is a heist about opening safes, and until now nothing in it involved
 * actually opening one. It reuses the dial language the identity already has.
 *
 * The player is not guessing blind. Each dial reports hot/cold as it turns —
 * so it is a three-dimensional "warmer, warmer, colder" that a first-year can
 * solve in about forty seconds without knowing anything.
 */
const DIALS = 3;
const STOPS = 12;

export function Tumbler({ payload, onSubmit, busy }: MinigameProps) {
  /**
   * The combination, dealt once by the server.
   *
   * This used to be derived from a shared seed — the client ran mulberry32 in
   * JS, the server ran a plpgsql copy of it, and the two disagreed on every
   * seed tested. Players turned all three dials to SET and were marked wrong,
   * every time. Computing the same secret twice in two languages is the bug;
   * dealing it once is the fix.
   *
   * It is visible in devtools, necessarily — warmer/colder has to be computed
   * from it on this device. The seeded version was equally exposed, just less
   * obviously.
   */
  const target = useMemo(() => {
    const combo = payload?.combo;
    return Array.isArray(combo) && combo.length === DIALS
      ? combo.map(Number)
      : null;
  }, [payload?.combo]);

  const [dials, setDials] = useState<number[]>(() => Array(DIALS).fill(0));

  if (!target) {
    return (
      <div className="ink rounded-plate bg-white p-6 text-center shadow-ink">
        <p className="font-body text-[14px] font-semibold text-ink/60">
          This dial did not deal properly. Go back and open it again.
        </p>
      </div>
    );
  }

  const turn = (i: number, dir: 1 | -1) => {
    if (busy) return;
    playTap();
    setDials((d) => d.map((v, j) => (j === i ? (v + dir + STOPS) % STOPS : v)));
  };

  /** Circular distance, so 11 → 0 reads as one step and not eleven. */
  const distance = (a: number, b: number) => {
    const raw = Math.abs(a - b);
    return Math.min(raw, STOPS - raw);
  };

  const solved = dials.every((v, i) => v === target[i]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        {dials.map((value, i) => {
          const d = distance(value, target[i]);
          // Three bands, not a number. Telling a player "you are 4 away" makes
          // it arithmetic; heat makes it a safe.
          const heat = d === 0 ? "locked" : d <= 2 ? "close" : d <= 4 ? "warm" : "cold";

          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => turn(i, 1)}
                disabled={busy}
                aria-label={`Dial ${i + 1} up`}
                className="ink w-full rounded-btn bg-paper-deep py-1 font-display text-[16px] text-ink shadow-ink-sm"
              >
                ▲
              </button>

              <motion.div
                animate={{ rotate: value * (360 / STOPS) }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="ink relative flex h-20 w-20 items-center justify-center rounded-full shadow-ink"
                style={{
                  backgroundColor:
                    heat === "locked" ? "var(--color-green)"
                    : heat === "close" ? "var(--color-brass)"
                    : heat === "warm"  ? "var(--color-white)"
                    : "var(--color-paper-deep)",
                }}
              >
                {/* The notch, so rotation is legible. Without it a rotating
                    circle is a stationary circle. */}
                <span className="absolute top-1 h-3 w-1 rounded-pill bg-ink" />
                <span
                  className="font-display text-[26px] leading-none text-ink"
                  // Counter-rotate so the number stays upright while the dial
                  // turns under it.
                  style={{ transform: `rotate(${-value * (360 / STOPS)}deg)` }}
                >
                  {value}
                </span>
              </motion.div>

              <button
                type="button"
                onClick={() => turn(i, -1)}
                disabled={busy}
                aria-label={`Dial ${i + 1} down`}
                className="ink w-full rounded-btn bg-paper-deep py-1 font-display text-[16px] text-ink shadow-ink-sm"
              >
                ▼
              </button>

              <span className="font-body text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50">
                {heat === "locked" ? "SET" : heat}
              </span>
            </div>
          );
        })}
      </div>

      <PrimaryButton
        className="w-full"
        disabled={busy || !solved}
        onClick={() => onSubmit({ dials })}
      >
        {solved ? "PULL THE HANDLE" : "KEEP TURNING"}
      </PrimaryButton>
    </div>
  );
}
