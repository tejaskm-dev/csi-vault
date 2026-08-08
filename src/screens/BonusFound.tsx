import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { ScreenHeader } from "../components/ScreenHeader";
import { MysteryBox } from "../components/Props";
import { Starburst } from "../components/Starburst";
import { screenChoreo, popIn, riseIn } from "../lib/motion";

export function BonusFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 select-none flex-col">
      {/* Brass, not red. The tone is the whole signal that this is off the
          main board — it is the only screen in the game that uses it. */}
      <ScreenHeader
        tone="brass"
        eyebrow="Easter egg"
        title="You spotted it"
        back="/vault"
      />

      <motion.div
        variants={screenChoreo}
        initial="initial"
        animate="animate"
        className="flex flex-1 flex-col"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 pt-8 text-center">
          {/* The plate was bg-purple/10 — a pale lavender behind a purple box,
              so the hero had nothing to sit against. Ink gives the box an
              actual ground, and the burst behind it carries the celebration. */}
          <motion.div variants={popIn} className="relative flex items-center justify-center">
            <div className="spin-layer absolute inset-0 -m-5 animate-[tumble_18s_linear_infinite] opacity-70">
              <Starburst fillColor="var(--color-purple)" />
            </div>
            <div
              style={{ rotate: "2.2deg" }}
              className="ink relative flex h-52 w-52 items-center justify-center rounded-plate bg-ink shadow-plate-purple"
            >
              <MysteryBox className="h-40 w-40" />
            </div>
          </motion.div>

          <motion.div
            variants={riseIn}
            style={{ rotate: -1.5 }}
            className="ink max-w-[92%] rounded-plate bg-white p-4 shadow-ink-sm"
          >
            <span className="font-display text-[11px] uppercase tracking-[0.16em] text-purple">
              Bonus round
            </span>
            <p className="mt-1.5 font-body text-[15px] font-bold leading-snug text-ink/80">
              One more question, off the board. It costs you no digit and no time
              — solve it to boost your rank.
            </p>
          </motion.div>
        </div>

        <motion.div variants={riseIn} className="flex flex-col gap-3 p-6 pt-0">
          <PrimaryButton
            variant="reward"
            onClick={() => navigate("/challenge/bonus")}
            className="h-16 w-full"
          >
            PLAY BONUS ROUND
          </PrimaryButton>
          <Pressable onClick={() => navigate("/vault")} className="h-14 w-full">
            Maybe later
          </Pressable>
        </motion.div>
      </motion.div>
    </div>
  );
}
