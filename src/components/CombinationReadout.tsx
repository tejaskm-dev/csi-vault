import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { digitLandVariants } from "../lib/motion";

interface CombinationReadoutProps {
  /** Digits recovered so far, as strings "1".."9". */
  unlocked: string[];
  className?: string;
}

/**
 * The nine-slot mechanical readout — the game's actual state, made physical.
 *
 * This is the thing a player glances at to know where they stand. A "3/9"
 * chip states the same fact but you can't *read the combination* off it.
 * Recovered slots show their digit stamped in brass on green; the rest are
 * blanked steel shutters.
 */
export function CombinationReadout({ unlocked, className }: CombinationReadoutProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-ink/55">
          Recovered combination
        </span>
        <span className="font-readout text-[10px] font-bold text-ink/40">
          {unlocked.length}/9
        </span>
      </div>

      {/* the housing — a recessed steel channel the shutters sit in */}
      <div className="ink riveted flex items-stretch gap-[3px] rounded-btn bg-paper-deep p-[5px] shadow-chip-ink">
        {Array.from({ length: 9 }, (_, i) => {
          const digit = String(i + 1);
          const got = unlocked.includes(digit);

          return (
            <motion.div
              key={digit}
              initial={false}
              animate={got ? { scale: [1, 1.14, 1] } : { scale: 1 }}
              transition={{ duration: 0.34, ease: [0.34, 1.56, 0.64, 1] }}
              className={cn(
                "relative flex h-9 flex-1 items-center justify-center rounded-[6px] border-2 border-ink",
                got ? "bg-green" : "bg-steel"
              )}
            >
              {got ? (
                <motion.span
                  variants={digitLandVariants}
                  initial="initial"
                  animate="animate"
                  className="font-readout text-[15px] font-bold leading-none text-white"
                >
                  {digit}
                </motion.span>
              ) : (
                /* a closed shutter — a single ink slot, not a number */
                <span className="block h-[2px] w-3 rounded-pill bg-ink/35" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
