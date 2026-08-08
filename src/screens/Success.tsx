import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { VaultTile } from "../components/VaultTile";
import { useGame, useElapsed } from "../context/GameContext";
import { celebrate, screenChoreo, dropIn, popIn, riseIn } from "../lib/motion";
import { Sprinkles } from "../components/Sprinkles";
import { cn, formatClock } from "../lib/utils";
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
  const { unlockVault, unlockedVaults, username, leaderboard } = useGame();
  const elapsedSeconds = useElapsed();
  const you = leaderboard.find((e) => e.isYou);

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
      className="relative flex flex-1 select-none flex-col p-6 text-center"
    >
      <Sprinkles />
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

      {/* Content flows from the top with even gaps. `flex-1 justify-center`
          was what produced the void: it pinned a short column to the middle
          and dumped every spare pixel above and below it. The page scrolls,
          so the fix is to give the screen enough to say and let it run. */}
      <div className="flex flex-col items-center gap-5 pt-7">
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
            <Art priority name="mascot-celebrate" alt="" className="h-full w-full object-contain" />
          </motion.div>
        </motion.div>

        <motion.div variants={riseIn} className="ink w-full rounded-plate bg-white px-5 py-4 shadow-ink">
          <p className="font-body text-[16px] font-bold text-ink">
            {isBonus
              ? "Off the board, and it cost you nothing."
              : allDone
                ? `Nine of nine, ${username || "recruit"}. Go and open it.`
                : `Digit ${digit} is on the board.`}
          </p>

        </motion.div>

        {/* The board so far — the same nine safes from the vault screen, so
            the player sees their actual progress rather than an abstraction.
            Pips said "two of nine"; this says WHICH two, and it is the one
            thing that ties this screen to the one they came from. */}
        {!isBonus && (
          <motion.div variants={riseIn} className="ink w-full rounded-plate bg-white p-3 shadow-ink">
            <span className="font-display text-[10px] uppercase tracking-[0.2em] text-ink/45">
              Your board
            </span>
            <div className="mt-2 grid grid-cols-9 gap-1">
              {Array.from({ length: 9 }, (_, i) => {
                const d = i + 1;
                const solved = unlockedVaults.includes(String(d));
                return (
                  <motion.div
                    key={d}
                    initial={false}
                    animate={d === digit ? { scale: [1, 1.22, 1] } : { scale: 1 }}
                    transition={{ duration: 0.42, delay: 0.75, ease: "easeOut" }}
                    className="w-full"
                  >
                    <VaultTile
                      digit={d}
                      state={solved ? "solved" : "locked"}
                      size="compact"
                      className="h-auto w-full aspect-square"
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Two readings that were nowhere on this screen: how long the run has
            taken, and where it currently puts you. Both are why a player keeps
            going, and both were only visible two taps away on the leaderboard. */}
        <motion.div variants={riseIn} className="flex w-full items-stretch gap-2.5">
          <Chip label="Elapsed" value={formatClock(elapsedSeconds)} />
          <Chip
            label={allDone ? "Standing" : "Remaining"}
            value={allDone ? (you ? `#${you.rank}` : "—") : String(remaining)}
            accent={allDone}
          />
        </motion.div>
      </div>

      <motion.div variants={riseIn} className="mt-auto flex flex-col gap-3 pt-7">
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

function Chip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "ink flex flex-1 flex-col items-center gap-0.5 rounded-btn py-2.5 shadow-chip-ink",
        accent ? "bg-brass" : "bg-paper-deep"
      )}
    >
      <span className="font-readout text-[17px] font-bold leading-none text-ink">{value}</span>
      <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-ink/50">
        {label}
      </span>
    </div>
  );
}
