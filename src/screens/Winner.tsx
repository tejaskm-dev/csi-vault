import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Mascot } from "../components/art/Mascot";
import { Medal } from "../components/art/Props";
import { useGame } from "../context/GameContext";
import { cn } from "../lib/utils";
import { EASE_OUT } from "../lib/motion";
import type { LeaderboardEntry } from "../data/mockData";

/** Podium order on screen: 2nd, 1st, 3rd. */
const SLOTS = [
  { rank: 2, height: "h-28", fill: "bg-light-gray", text: "text-charcoal/55" },
  { rank: 1, height: "h-40", fill: "bg-reward-yellow", text: "text-white" },
  { rank: 3, height: "h-20", fill: "bg-light-gray", text: "text-charcoal/55" },
];

export function Winner() {
  const navigate = useNavigate();
  const { leaderboard } = useGame();

  // No confetti here — reserved for Success and Vault Complete.

  return (
    <div className="flex min-h-dvh flex-col justify-between p-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-pill bg-yellow-tint">
          <Trophy className="h-7 w-7 text-reward-yellow" />
        </div>

        <h1 className="mb-4 text-center font-display text-[42px] font-black uppercase leading-[0.9] tracking-tight">
          We have a
          <br />
          <span className="text-csi-red">winner</span>
        </h1>

        {/* Mascot cheer pose with CSI flag above 1st place podium */}
        <Mascot className="mb-4 h-36 w-36" pose="cheer" accessory="flag" />

        <div className="flex w-full max-w-sm items-end justify-center gap-3">
          {SLOTS.map((slot, i) => {
            const entry: LeaderboardEntry | undefined = leaderboard[slot.rank - 1];
            const isFirst = slot.rank === 1;

            return (
              <motion.div
                key={slot.rank}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT, delay: 0.05 * i }}
                className={cn("flex flex-1 flex-col items-center", isFirst && "z-10")}
              >
                <div
                  className={cn(
                    "mb-2 flex items-center justify-center rounded-btn bg-white font-display font-black shadow-soft",
                    isFirst
                      ? "h-16 w-16 text-xl text-csi-red ring-2 ring-reward-yellow"
                      : "h-12 w-12 text-base text-charcoal"
                  )}
                >
                  {entry?.initials ?? "–"}
                </div>

                <div
                  className={cn(
                    "mb-2 w-full truncate text-center font-semibold",
                    isFirst ? "text-[15px] text-charcoal font-bold" : "text-[13px] text-muted"
                  )}
                >
                  {entry?.name ?? "Open"}
                </div>

                <div
                  className={cn(
                    "flex w-full flex-col items-center justify-start rounded-t-card pt-3",
                    slot.height,
                    slot.fill
                  )}
                >
                  <Medal rank={slot.rank} className="h-7 w-7 mb-1" />
                  <span className={cn("numeral text-2xl font-black", slot.text)}>
                    {slot.rank}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <PrimaryButton onClick={() => navigate("/leaderboard")} className="h-16 text-xl">
        FULL LEADERBOARD
      </PrimaryButton>
    </div>
  );
}
