import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { VaultTile } from "../components/VaultTile";
import { useGame } from "../context/GameContext";
import { celebrate } from "../lib/motion";
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
    <div className="flex flex-1 select-none flex-col justify-between p-6 text-center">
      <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative z-10 flex flex-col items-center">
          <span className="ink mb-2 rounded-pill bg-red/10 px-3 py-1 font-body text-[12px] font-bold uppercase tracking-[0.2em] text-red-deep">
            {allDone ? "Vault ready" : "Lock released"}
          </span>
          <h1 className="mt-2 font-display text-[42px] uppercase leading-[0.9] tracking-tighter text-ink">
            {headline}
          </h1>
        </div>

        <div className="relative z-20 -mt-6 flex h-52 w-52 items-center justify-center overflow-visible">
          {/* Starburst only when it means something — the last one. */}
          {allDone && !isBonus && (
            <div className="absolute inset-0 z-0 scale-125 animate-[tumble_12s_linear_infinite] spin-layer">
              <Starburst fillColor="var(--color-brass)" />
            </div>
          )}

          <div className="relative z-10 h-36 w-36">
            {isBonus ? (
              <div className="ink flex h-36 w-36 rotate-[3deg] items-center justify-center rounded-plate bg-pink/10 shadow-plate-steel">
                <MysteryBox className="h-22 w-22" />
              </div>
            ) : (
              <VaultTile digit={digit} state={tileSolved ? "solved" : "active"} />
            )}
          </div>

          {/* Mascot celebrating alongside the unlocked digit, overlapping the
              tile so it breaks its container rather than sitting in a row. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 380, damping: 18 }}
            className="pointer-events-none absolute -bottom-3 -right-5 z-20 h-28 w-28 rotate-[6deg]"
          >
            <Art name="mascot-celebrate" alt="" className="h-full w-full object-contain" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.2 }}
          className="relative z-10 flex flex-col gap-1.5"
        >
          <p className="font-body text-[15px] font-bold text-ink/70">
            {isBonus
              ? "Off the board, and it cost you nothing."
              : allDone
                ? `Nine of nine, ${username || "recruit"}. Go and open it.`
                : `Digit ${digit} is on the board.`}
          </p>
          {!allDone && !isBonus && (
            <p className="font-readout text-[12px] font-bold text-ink/40">
              {remaining} {remaining === 1 ? "LOCK" : "LOCKS"} REMAINING
            </p>
          )}
        </motion.div>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        <WavyDivider className="opacity-75" />
        <PrimaryButton
          onClick={() => navigate(allDone ? "/vault-complete" : "/vault")}
          variant={allDone ? "reward" : "primary"}
          className="w-full"
        >
          {allDone ? "OPEN THE VAULT" : "KEEP GOING"}
        </PrimaryButton>
      </div>
    </div>
  );
}
