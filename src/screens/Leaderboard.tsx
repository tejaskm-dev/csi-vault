import { useNavigate } from "react-router-dom";
import { LayoutGroup } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";
import { LeaderboardRow } from "../components/LeaderboardRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { useGame } from "../context/GameContext";

const VISIBLE = 8;

export function Leaderboard() {
  const navigate = useNavigate();
  const { leaderboard } = useGame();

  const top = leaderboard.slice(0, VISIBLE);
  const you = leaderboard.find((e) => e.isYou);
  const youIsBelow = you && !top.some((e) => e.isYou);

  return (
    <div className="flex min-h-dvh flex-col pb-6">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-off-white/90 px-5 py-3 backdrop-blur-md">
        <Pressable icon onClick={() => navigate("/home")} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Pressable>
        <h1 className="font-display text-xl font-black tracking-tight">
          LEADERBOARD
        </h1>
        <div className="flex h-14 w-14 items-center justify-center">
          <span className="h-2 w-2 animate-pulse rounded-pill bg-info-blue" />
        </div>
      </header>

      <div className="px-5 pt-4">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-info-blue">
          Updating live
        </p>

        {/* Rows are keyed by player identity, never by rank — rank is the
            thing that changes, and keying on it kills the slide. */}
        <LayoutGroup>
          {top.map((entry) => (
            <LeaderboardRow key={entry.id} {...entry} />
          ))}

          {youIsBelow && (
            <>
              <div className="flex justify-center gap-1 py-3">
                <span className="h-1.5 w-1.5 rounded-pill bg-light-gray" />
                <span className="h-1.5 w-1.5 rounded-pill bg-light-gray" />
                <span className="h-1.5 w-1.5 rounded-pill bg-light-gray" />
              </div>
              <LeaderboardRow key={you.id} {...you} />
            </>
          )}
        </LayoutGroup>
      </div>

      <div className="mt-auto flex flex-col gap-3 px-5 pt-6">
        {/* The ceremony screen becomes reachable the moment someone finishes. */}
        {leaderboard[0]?.digits === 9 && (
          <PrimaryButton
            variant="reward"
            onClick={() => navigate("/winner")}
            className="h-16"
          >
            <Trophy className="h-6 w-6" />
            RESULTS ARE IN
          </PrimaryButton>
        )}
        <p className="text-center text-[15px] text-muted">
          Ranked by digits unlocked, then by finish time.
        </p>
      </div>
    </div>
  );
}
