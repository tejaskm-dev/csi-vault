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
    <div className="flex-1 flex flex-col justify-between p-6 select-none">
      <div className="flex flex-col gap-6 mt-8">
        {/* Title & Header */}
        <div className="flex flex-col">
          <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-red">
            RECRUITMENT
          </span>
          <h1 className="text-[44px] font-extrabold uppercase leading-[0.9] tracking-tighter text-ink mt-1">
            WELCOME,<br />
            RECRUIT
          </h1>
        </div>

        <p className="font-body text-base font-bold text-ink/70 leading-relaxed">
          What should we call you on the live leaderboard?
        </p>

        {/* Input with ink border and hard shadow */}
        <div className="relative w-full my-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ENTER YOUR CODENAME"
            autoComplete="off"
            maxLength={15}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            className="w-full text-center uppercase ink rounded-btn py-4 px-6 bg-white text-ink font-display font-bold text-[18px] tracking-wide placeholder:text-ink/30 shadow-ink focus:outline-none transition-transform focus:scale-[1.01]"
          />
        </div>

        <p className="font-body text-[14px] font-semibold text-ink/60 leading-normal bg-paper-deep/60 p-4 rounded-card ink rotate-[-1.5deg]">
          TIP: Your nine challenges are drawn dynamically from your name — no two players get the same board!
        </p>
      </div>

      {/* CTA Button */}
      <div className="mb-6">
        <PrimaryButton disabled={!valid} onClick={handleStart} className="w-full">
          START MISSION
        </PrimaryButton>
      </div>
    </div>
  );
}
