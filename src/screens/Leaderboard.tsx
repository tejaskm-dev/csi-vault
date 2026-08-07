import { useNavigate } from "react-router-dom";
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
    <div>
      <header>
        <Pressable onClick={() => navigate("/home")} aria-label="Back">
          Back
        </Pressable>
        <h1>Leaderboard</h1>
      </header>

      <p>Updating live</p>

      {/* Rows are keyed by player identity, never by rank — rank is the thing
          that changes, and keying on it kills any move animation. */}
      {top.map((entry) => (
        <LeaderboardRow key={entry.id} {...entry} />
      ))}

      {youIsBelow && (
        <>
          <div>…</div>
          <LeaderboardRow key={you.id} {...you} />
        </>
      )}

      {leaderboard[0]?.digits === 9 && (
        <PrimaryButton variant="reward" onClick={() => navigate("/winner")}>
          RESULTS ARE IN
        </PrimaryButton>
      )}

      <p>Ranked by digits unlocked, then by finish time.</p>
    </div>
  );
}
