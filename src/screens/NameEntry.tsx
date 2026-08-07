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
    <div className="flex min-h-dvh flex-col p-6">
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="mb-2 font-display text-[38px] font-black leading-tight tracking-tight">
          Welcome,
          <br />
          recruit
        </h1>
        <p className="mb-8 text-[17px] text-muted">
          What should we call you on the leaderboard?
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="off"
          maxLength={15}
          className="tap w-full rounded-btn border-2 border-transparent bg-white px-4 text-lg font-bold shadow-soft outline-none transition-colors focus:border-csi-red"
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
        />
        <p className="mt-3 text-[13px] text-muted">
          Your nine challenges are drawn from your name — no two players get the
          same board.
        </p>
      </div>

      <PrimaryButton disabled={!valid} onClick={handleStart} className="h-16">
        START MISSION
      </PrimaryButton>
    </div>
  );
}
