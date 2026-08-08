import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { VaultTile } from "../components/VaultTile";
import { VaultDoor } from "../components/VaultDoor";
import { Art } from "../components/Art";
import { Padlock, Stopwatch, MysteryBox, Medal } from "../components/Props";
import { useGame, useElapsed } from "../context/GameContext";
import { formatClock } from "../lib/utils";
import { playComplete, playUnlock } from "../lib/sound";
import { CurvedWord } from "../components/CurvedWord";
import {
  celebrate,
  comboStagger,
  digitLandVariants,
  screenChoreo,
  dropIn,
  popIn,
  riseIn,
} from "../lib/motion";

/**
 * The climax. Everything the player did for twenty minutes resolves here, so
 * it is the one screen allowed to be dense.
 *
 * Two things were structurally wrong before:
 *
 *   - The nine-digit strip was nine 48px tiles at gap-1.5 inside a 432px
 *     content width. That is 500px of tile, so the first and last digits were
 *     clipped off the edges of the phone. It is a 9-column grid now, and the
 *     tiles size themselves from the column rather than being fixed.
 *   - The whole screen ran on the dark Blueprint variant, which made the
 *     payoff look like a different app from the nine screens leading to it.
 */
export function VaultComplete() {
  const navigate = useNavigate();
  const { unlockedVaults, bonusSolved, leaderboard } = useGame();
  const elapsedSeconds = useElapsed();

  const you = leaderboard.find((e) => e.isYou);

  // The door was mounted already open, so the swing it was built to perform
  // never played — the payoff animation of the whole game was being skipped.
  // Mount closed, then release it, and time the sound and confetti to the
  // moment it actually opens rather than to page load.
  const [doorOpen, setDoorOpen] = useState(false);

  useEffect(() => {
    playUnlock();
    const open = setTimeout(() => setDoorOpen(true), 520);
    const bang = setTimeout(() => {
      playComplete();
      celebrate();
    }, 1150);
    return () => {
      clearTimeout(open);
      clearTimeout(bang);
    };
  }, []);

  return (
    <motion.div
      variants={screenChoreo}
      initial="initial"
      animate="animate"
      className="flex flex-1 select-none flex-col px-5 pb-5 pt-6 text-center"
    >
      {/* ── Title ──────────────────────────────────────────────── */}
      <motion.div variants={dropIn} className="flex flex-col items-center">
        <span className="ink rotate-[-1.5deg] rounded-pill bg-brass px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.18em] text-ink shadow-chip-ink">
          Mission complete
        </span>

        {/* Set on an arc. HTML cannot bend a baseline, so this is SVG
            textPath — see CurvedWord. VAULT sits on a narrower box than
            UNLOCKED, so the shorter word ends up the larger one, which is
            what makes the pair read as a lockup rather than two lines. */}
        <div className="mt-2 w-full">
          <CurvedWord
            fill="#FFFFFF"
            extrude="#D8D2C0"
            extrudeDeep="#A9A395"
            depth={7}
            bow={2.2}
            className="mx-auto w-[62%]"
          >
            VAULT
          </CurvedWord>
          <CurvedWord
            fill="var(--color-brass)"
            extrude="var(--color-brass-deep)"
            extrudeDeep="#8A5A08"
            depth={10}
            bow={2.2}
            className="mx-auto -mt-[6%] w-full"
          >
            UNLOCKED
          </CurvedWord>
        </div>

        <p className="mt-1 font-body text-[14px] font-bold text-ink/60">
          You&rsquo;ve cracked every lock.
        </p>
      </motion.div>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <motion.div variants={popIn} className="relative mx-auto mt-3 w-full max-w-[300px]">
        <VaultDoor state={doorOpen ? "open" : "closed"} />
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 20, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 6 }}
          transition={{ delay: 1.5, type: "spring", stiffness: 300, damping: 16 }}
          className="pointer-events-none absolute -bottom-4 -left-8 z-20 h-40 w-40"
        >
          <Art priority name="mascot-celebrate" alt="" className="h-full w-full object-contain" />
        </motion.div>
      </motion.div>

      {/* ── Recovered combination ──────────────────────────────── */}
      <motion.div
        variants={riseIn}
        className="ink mt-4 rounded-plate bg-white p-3 shadow-ink"
      >
        <span className="font-display text-[10px] uppercase tracking-[0.2em] text-ink/50">
          Recovered combination
        </span>
        {/* grid-cols-9, so the tiles divide the width instead of overflowing it */}
        <motion.div
          variants={comboStagger}
          initial="initial"
          animate="animate"
          className="mt-2 grid grid-cols-9 gap-1"
        >
          {Array.from({ length: 9 }, (_, i) => (
            <motion.div key={i} variants={digitLandVariants} className="w-full">
              <VaultTile
                digit={i + 1}
                state={unlockedVaults.includes(String(i + 1)) ? "solved" : "locked"}
                // h-auto is required: twMerge only drops the `h-12` if a
                // conflicting height is supplied, and aspect-square then
                // gives the Safe a box to fill.
                size="compact"
                className="h-auto w-full aspect-square"
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <motion.div
        variants={riseIn}
        className="ink mt-3 flex items-stretch rounded-plate bg-white shadow-ink"
      >
        <Stat icon={<Padlock open className="h-full w-full" />} value={`${unlockedVaults.length}/9`} label="Digits" />
        <Divider />
        <Stat icon={<Stopwatch className="h-full w-full" />} value={formatClock(elapsedSeconds)} label="Time" />
        <Divider />
        <Stat
          icon={<MysteryBox className="h-full w-full" />}
          value={bonusSolved ? "+1" : "0"}
          label="Bonus"
        />
      </motion.div>

      {/* ── Standing ───────────────────────────────────────────── */}
      {you && (
        <motion.div
          variants={riseIn}
          className="ink mt-3 flex items-center justify-center gap-2.5 rounded-pill bg-brass px-4 py-2 shadow-chip-ink"
        >
          <span className="h-7 w-7 shrink-0">
            <Medal rank={(Math.min(you.rank, 3) || 1) as 1 | 2 | 3} />
          </span>
          <span className="font-body text-[12px] font-bold uppercase tracking-[0.14em] text-ink/70">
            You&rsquo;re currently
          </span>
          <span className="font-readout text-[20px] font-bold leading-none text-ink">
            #{you.rank}
          </span>
        </motion.div>
      )}

      {/* ── Actions ────────────────────────────────────────────── */}
      <motion.div variants={riseIn} className="mt-auto flex flex-col gap-2.5 pt-5">
        <PrimaryButton
          variant="reward"
          onClick={() => navigate("/leaderboard")}
          className="h-16 w-full"
        >
          VIEW LEADERBOARD
        </PrimaryButton>
        <Pressable onClick={() => navigate("/home")} className="h-13 w-full">
          Back to base
        </Pressable>
      </motion.div>
    </motion.div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 py-3">
      <span className="h-7 w-7">{icon}</span>
      <span className="font-readout text-[19px] font-bold leading-none text-ink">{value}</span>
      <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-ink/45">
        {label}
      </span>
    </div>
  );
}

/** Dotted, so it separates without drawing a third hard line on the plate. */
function Divider() {
  return <span className="my-3 w-0 border-l-2 border-dashed border-ink/15" />;
}
