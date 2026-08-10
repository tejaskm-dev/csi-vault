import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { screenChoreo, popIn, riseIn } from "../lib/motion";
import { ScreenHeader } from "../components/ScreenHeader";
import { Padlock, Stopwatch } from "../components/Props";
import { useGame } from "../context/GameContext";
import { RecoveryChip } from "../components/RecoveryCode";

export function Waiting() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { live, player, players } = useGame();
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
        <div className="flex flex-1 flex-col items-center justify-center gap-7 p-6 text-center short:gap-4 short:p-4">
          {/* Hero. The plate is sized from the prop, not the other way round —
              a 176px plate with p-4 leaves exactly 144 of usable interior. */}
          <motion.div
            variants={popIn}
            className="ink flex h-[min(11rem,20vh)] w-[min(11rem,20vh)] items-center justify-center rounded-pill bg-paper-deep/60 p-4 shadow-ink"
          >
            {isPost ? (
              <Padlock open className="h-full w-full" />
            ) : (
              <div className="spin-layer h-full w-full animate-[bob_2.6s_ease-in-out_infinite]">
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

        <motion.div variants={riseIn} className="flex flex-col gap-3 p-6 pt-0">
          {/* The lobby is no longer a dead screen — the route guard now parks
              every player here between joining and the host pressing Start, so
              it is the first real thing most of them see.

              Their vault number is the thing that matters. Within a minute of
              the game starting, strangers will be walking up asking for it, and
              a player who has to go hunting for their own number is already
              behind. The live count is there because a lobby that shows the
              room filling up feels like an event about to start; a static
              "please wait" feels like a loading screen. */}
          {!isPost && live && player && (
            <div className="flex items-stretch gap-3">
              <div className="ink flex-1 rounded-plate bg-brass px-3 py-3 text-center shadow-[0_4px_0_0_var(--color-brass-deep)]">
                <span className="font-body text-[9px] font-bold uppercase tracking-[0.18em] text-ink/60">
                  You are
                </span>
                <div
                  className="font-display text-[34px] leading-none text-white"
                  style={{ WebkitTextStroke: "2px var(--color-ink)" }}
                >
                  {player.vault_no}
                </div>
              </div>
              <div className="ink flex-1 rounded-plate bg-white px-3 py-3 text-center shadow-ink-sm">
                <span className="font-body text-[9px] font-bold uppercase tracking-[0.18em] text-ink/45">
                  In the room
                </span>
                <div className="font-display text-[34px] leading-none text-ink">
                  {players.length}
                </div>
              </div>
            </div>
          )}

          {/* The PIN, while they have nothing else to do.
              Once the host presses Start, new joins are refused — so this code
              becomes the ONLY way back in for anyone who clears their browser.
              The lobby is the one moment in the whole event when a player has
              idle time to notice it. */}
          {!isPost && (
            <div className="flex justify-center">
              <RecoveryChip />
            </div>
          )}

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
