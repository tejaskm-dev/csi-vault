import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { screenChoreo, popIn, riseIn } from "../lib/motion";
import { ScreenHeader } from "../components/ScreenHeader";
import { Padlock, Stopwatch } from "../components/Props";

export function Waiting() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isPost = params.get("state") === "post";

  return (
    <div className="flex flex-1 select-none flex-col">
      <ScreenHeader
        tone={isPost ? "green" : "ink"}
        eyebrow={isPost ? "Mission complete" : "Event queue"}
        title={isPost ? "You cracked it" : "Vault opens soon"}
      />

      <motion.div
        variants={screenChoreo}
        initial="initial"
        animate="animate"
        className="flex flex-1 flex-col"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-7 p-6 text-center">
          {/* Hero. The plate is sized from the prop, not the other way round —
              a 176px plate with p-4 leaves exactly 144 of usable interior. */}
          <motion.div
            variants={popIn}
            className="ink flex h-44 w-44 items-center justify-center rounded-pill bg-paper-deep/60 p-4 shadow-ink"
          >
            {isPost ? (
              <Padlock open className="h-32 w-32" />
            ) : (
              <div className="spin-layer h-32 w-32 animate-[bob_2.6s_ease-in-out_infinite]">
                <Stopwatch className="h-full w-full" />
              </div>
            )}
          </motion.div>

          <motion.div
            variants={riseIn}
            style={{ rotate: -1.5 }}
            className="ink max-w-[92%] rounded-plate bg-white p-4 shadow-ink-sm"
          >
            <span className="font-display text-[11px] uppercase tracking-[0.16em] text-ink/55">
              {isPost ? "Results" : "Standing by"}
            </span>
            <p className="mt-1.5 font-body text-[15px] font-bold leading-snug text-ink/80">
              {isPost
                ? "Results drop when everyone is done. Check the leaderboard in the meantime to see how you rank."
                : "Hang tight — the event is about to begin. Keep this screen open; the operator will unlock the vault shortly."}
            </p>
          </motion.div>
        </div>

        <motion.div variants={riseIn} className="p-6 pt-0">
          {isPost ? (
            <PrimaryButton onClick={() => navigate("/leaderboard")} className="h-16 w-full">
              VIEW LEADERBOARD
            </PrimaryButton>
          ) : (
            <div className="ink rounded-plate bg-paper-deep/40 py-4 text-center font-display text-[13px] uppercase text-ink/40">
              <span style={{ letterSpacing: "0.16em", marginRight: "-0.16em" }}>
                Awaiting dispatch
              </span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
