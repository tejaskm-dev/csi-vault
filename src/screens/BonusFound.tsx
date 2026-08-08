import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { ScreenHeader } from "../components/ScreenHeader";
import { MysteryBox } from "../components/Props";

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

      <div className="flex flex-1 flex-col items-center justify-center gap-7 p-6 text-center">
        {/* 208px plate, p-4, so 176 of interior for a 160px box. */}
        <motion.div
          initial={{ scale: 0.75, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 2.2, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="ink flex h-52 w-52 items-center justify-center rounded-plate bg-purple/10 shadow-ink-lg"
        >
          <MysteryBox className="h-40 w-40" />
        </motion.div>

        <div className="ink max-w-[92%] rotate-[-1.5deg] rounded-plate bg-white p-4 shadow-ink-sm">
          <span className="font-display text-[11px] uppercase tracking-[0.16em] text-purple">
            Bonus round
          </span>
          <p className="mt-1.5 font-body text-[15px] font-bold leading-snug text-ink/80">
            One more question, off the board. It costs you no digit and no time
            — solve it to boost your rank.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-6 pt-0">
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
      </div>
    </div>
  );
}
