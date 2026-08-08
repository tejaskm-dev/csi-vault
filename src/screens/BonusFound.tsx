import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { ScreenHeader } from "../components/ScreenHeader";
import { MysteryBox } from "../components/Props";
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
        <div className="flex flex-1 flex-col items-center justify-center gap-7 p-6 text-center">
          {/* 208px plate, p-4, so 176 of interior for a 160px box. */}
          <motion.div
            variants={popIn}
            style={{ rotate: 2.2 }}
            className="ink flex h-52 w-52 items-center justify-center rounded-plate bg-purple/10 shadow-ink-lg"
          >
            <MysteryBox className="h-40 w-40" />
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
