import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { VaultTile } from "../components/VaultTile";
import { useGame } from "../context/GameContext";
import { celebrate, screenChoreo, dropIn, popIn, riseIn } from "../lib/motion";
import { cn } from "../lib/utils";
import { playUnlock, playComplete } from "../lib/sound";
import { Art } from "../components/Art";
import { Starburst } from "../components/Starburst";
import { WavyDivider } from "../components/WavyDivider";
import { MysteryBox } from "../components/Props";

/**
 * Escalating headlines. The same word nine times is the clearest possible
 * signal that nobody sat with this screen.
 */
const BEATS = [
  "That's one.",
  "Two down.",
  "Three.",
  "Getting quick at this.",
  "Halfway.",
  "Six. The wheel's loosening.",
  "Seven. Two locks left.",
  "Eight. One to go.",
];

export function Success() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { unlockVault, unlockedVaults, username } = useGame();

  const isBonus = id === "bonus";
  const digit = parseInt(id ?? "1", 10);

  const [tileSolved, setTileSolved] = useState(false);
  const committed = useRef(false);

  const remaining = 9 - unlockedVaults.length;
  const allDone = remaining === 0;

  useEffect(() => {
    if (!committed.current && !isBonus && id) {
      unlockVault(id);
      committed.current = true;
    }

    const t = setTimeout(() => {
      setTileSolved(true);

      // Confetti is reserved for the ninth. Firing it on all nine unlocks
      // spends the payoff eight times before the moment it was meant for —
      // one moment stands out, many become noise.
      if (allDone) {
        celebrate();
        playComplete();
      } else {
        playUnlock();
      }
    }, 260);

    return () => clearTimeout(t);
  }, [id, isBonus, unlockVault, allDone]);

  const headline = isBonus
    ? "Bonus cleared"
    : allDone
      ? "That's all nine."
      : BEATS[Math.min(unlockedVaults.length, BEATS.length) - 1] ?? "That's one.";

  return (
    <motion.div
      variants={screenChoreo}
      initial="initial"
      animate="animate"
      className="flex flex-1 select-none flex-col p-6 text-center"
    >
      {/* A coloured plate carries the headline. Before, the title was ink on
          cream sitting directly over the starburst, and the burst's points cut
          straight through the letterforms — the plate gives the type its own
          ground and pushes the burst behind the hero where it belongs. */}
      <motion.div
        variants={dropIn}
        className={cn(
          "relative -mx-6 -mt-6 shrink-0 overflow-hidden rounded-b-[28px] px-6 pb-9 pt-8 shadow-[0_4px_0_0_var(--color-ink)]",
          allDone ? "bg-brass" : isBonus ? "bg-purple" : "bg-green"
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, rgba(255,255,255,0.15) 0 7px, transparent 7px 18px)",
          }}
        />
        <span className="relative inline-block rounded-pill border-2 border-ink/25 bg-white/25 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-ink/75">
          {allDone ? "Vault ready" : isBonus ? "Bonus cleared" : "Lock released"}
        </span>
        <h1
          className={cn(
            "relative mt-2.5 font-display uppercase leading-[0.9] tracking-tight",
            headline.length > 16 ? "text-[30px]" : "text-[38px]",
            allDone || isBonus ? "text-ink" : "text-white"
          )}
          style={{
            textShadow:
              allDone || isBonus ? "0 3px 0 rgba(255,255,255,0.4)" : "0 3px 0 var(--color-ink)",
          }}
        >
          {headline}
        </h1>
      </motion.div>

      {/* Hero. Centres in whatever space is left rather than leaving a
          phone-height gap above the button. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <motion.div
          variants={popIn}
          className="relative flex h-44 w-44 items-center justify-center"
        >
          {allDone && !isBonus && (
            <div className="spin-layer absolute inset-0 z-0 scale-[1.35] animate-[tumble_12s_linear_infinite] opacity-80">
              <Starburst fillColor="var(--color-brass)" />
            </div>
          )}

          <div className="relative z-10 h-32 w-32">
            {isBonus ? (
              <div className="ink flex h-32 w-32 items-center justify-center rounded-plate bg-purple/10 shadow-plate-steel">
                <MysteryBox className="h-24 w-24" />
              </div>
            ) : (
              <VaultTile digit={digit} state={tileSolved ? "solved" : "active"} />
            )}
          </div>

          {/* Offset far enough that it frames the tile instead of sitting on
              the digit — the number is the whole point of the screen. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 10, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 7 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 380, damping: 18 }}
            className="pointer-events-none absolute -bottom-8 -right-14 z-20 h-36 w-36"
          >
            <Art name="mascot-celebrate" alt="" className="h-full w-full object-contain" />
          </motion.div>
        </motion.div>

        <motion.div variants={riseIn} className="ink rounded-plate bg-white px-5 py-4 shadow-ink-sm">
          <p className="font-body text-[16px] font-bold text-ink">
            {isBonus
              ? "Off the board, and it cost you nothing."
              : allDone
                ? `Nine of nine, ${username || "recruit"}. Go and open it.`
                : `Digit ${digit} is on the board.`}
          </p>
          {!allDone && !isBonus && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {/* Nine pips: the progress bar of the whole game, at a glance. */}
              {Array.from({ length: 9 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-pill border-2 border-ink",
                    i < unlockedVaults.length ? "bg-green" : "bg-paper-deep"
                  )}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <motion.div variants={riseIn} className="flex flex-col gap-3">
        <WavyDivider className="opacity-60" />
        <PrimaryButton
          onClick={() => navigate(allDone ? "/vault-complete" : "/vault")}
          variant={allDone ? "reward" : "primary"}
          className="h-16 w-full"
        >
          {allDone ? "OPEN THE VAULT" : "KEEP GOING"}
        </PrimaryButton>
      </motion.div>
    </motion.div>
  );
}
