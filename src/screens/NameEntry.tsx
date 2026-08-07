import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { useGame } from "../context/GameContext";

export function NameEntry() {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const { setUsername } = useGame();

  const valid = name.trim().length >= 2;

  const handleStart = () => {
    if (!valid) return;
    setUsername(name.trim());
    navigate("/home");
  };

  return (
    <div>
      <h1>Welcome, recruit</h1>
      <p>What should we call you on the leaderboard?</p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoComplete="off"
        maxLength={15}
        onKeyDown={(e) => e.key === "Enter" && handleStart()}
      />
      <p>
        Your nine challenges are drawn from your name — no two players get the
        same board.
      </p>

      <PrimaryButton disabled={!valid} onClick={handleStart}>
        START MISSION
      </PrimaryButton>
    </div>
  );
}
