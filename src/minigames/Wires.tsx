import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { mulberry32, shuffle } from "./seed";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";
import type { MinigameProps } from "./types";

/**
 * WIRE THE PANEL — tap a colour on the left, tap its match on the right.
 *
 * Pure tap→tap, which is the one input in the Bible's vocabulary nothing else
 * in the game was using. It is also the most "heist" thing here after the
 * tumbler: you are wiring a panel, and getting one wrong buzzes.
 *
 * Difficulty comes from the pairing rule, not from speed. Level 1 matches
 * colours to colours. Level 2 matches a colour to its NAME printed in a
 * different colour — the Stroop trick again, but as a connection task rather
 * than a reaction one.
 */
const WIRES = [
  { id: "red",    label: "RED",    css: "var(--color-red)" },
  { id: "blue",   label: "BLUE",   css: "var(--color-blue)" },
  { id: "green",  label: "GREEN",  css: "var(--color-green)" },
  { id: "yellow", label: "YELLOW", css: "var(--color-brass)" },
  { id: "purple", label: "PURPLE", css: "var(--color-purple)" },
];

export function Wires({ seed, level = 1, onSubmit, busy }: MinigameProps) {
  const count = level >= 2 ? 5 : 4;

  const { left, right } = useMemo(() => {
    const rand = mulberry32(seed);
    const chosen = shuffle(rand, [...WIRES]).slice(0, count);
    return { left: chosen, right: shuffle(rand, [...chosen]) };
  }, [seed, count]);

  const [picked, setPicked] = useState<string | null>(null);
  const [joined, setJoined] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<string | null>(null);

  const tapLeft = (id: string) => {
    if (busy || joined[id]) return;
    playTap();
    setWrong(null);
    setPicked(id === picked ? null : id);
  };

  const tapRight = (id: string) => {
    if (busy || !picked) return;
    if (Object.values(joined).includes(id)) return;
    playTap();
    if (id === picked) {
      setJoined((j) => ({ ...j, [picked]: id }));
      setPicked(null);
    } else {
      // Immediate, visible rejection. A silent no-op reads as a broken button.
      setWrong(id);
      setPicked(null);
      window.setTimeout(() => setWrong(null), 420);
    }
  };

  const done = Object.keys(joined).length === count;

  return (
    <div className="flex flex-col gap-4">
      <div className="ink rounded-plate bg-white p-4 shadow-ink">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {/* Left rail — the live wires */}
          <div className="flex flex-col gap-3">
            {left.map((w) => (
              <motion.button
                key={w.id}
                type="button"
                disabled={busy || Boolean(joined[w.id])}
                onClick={() => tapLeft(w.id)}
                whileTap={{ x: 3 }}
                className={cn(
                  "ink h-12 rounded-btn shadow-ink-sm transition-opacity",
                  picked === w.id && "ring-4 ring-ink",
                  joined[w.id] && "opacity-35"
                )}
                style={{ backgroundColor: w.css }}
                aria-label={w.label}
              />
            ))}
          </div>

          {/* Right rail — the terminals. Level 2 labels them in a DIFFERENT
              colour than the word says, so the player must read rather than
              pattern-match on hue. */}
          <div className="flex flex-col gap-3">
            {right.map((w, i) => {
              const taken = Object.values(joined).includes(w.id);
              const inkColour = level >= 2 ? left[(i + 2) % left.length].css : w.css;
              return (
                <motion.button
                  key={w.id}
                  type="button"
                  disabled={busy || taken}
                  onClick={() => tapRight(w.id)}
                  animate={wrong === w.id ? { x: [0, -6, 6, -6, 0] } : { x: 0 }}
                  transition={{ duration: 0.32 }}
                  className={cn(
                    "ink flex h-12 items-center justify-center rounded-btn bg-paper-deep font-display text-[15px] shadow-ink-sm",
                    taken && "opacity-35"
                  )}
                  style={{ color: level >= 2 ? inkColour : "var(--color-ink)" }}
                >
                  {level >= 2 ? w.label : ""}
                  {level < 2 && (
                    <span
                      className="h-5 w-5 rounded-full border-2 border-ink"
                      style={{ backgroundColor: w.css }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-center font-body text-[13px] font-semibold text-ink/55">
        {picked ? "Now tap its terminal on the right." : "Tap a wire on the left."}
      </p>

      <PrimaryButton
        className="w-full"
        disabled={busy || !done}
        onClick={() => onSubmit({ joined, count })}
      >
        {done ? "CLOSE THE PANEL" : `${Object.keys(joined).length} / ${count} WIRED`}
      </PrimaryButton>
    </div>
  );
}
