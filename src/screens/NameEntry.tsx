import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { Art } from "../components/Art";
import { useGame } from "../context/GameContext";

/**
 * Every player sees this screen, once, before anything else in the game.
 *
 * It was the flattest screen in the app: no coloured surface, no art, nothing
 * overlapping anything, and a headline doing work the header should do. The
 * input is the only thing on the page that matters, so it gets the weight —
 * a labelled plate rather than a lone bordered box.
 */
export function NameEntry() {
  const [name, setName] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const { setUsername } = useGame();

  const valid = name.trim().length >= 2;

  const handleStart = () => {
    if (!valid) return;
    setUsername(name.trim());
    navigate("/home");
  };

  return (
    <div className="flex flex-1 select-none flex-col">
      <ScreenHeader eyebrow="Recruitment" title="Welcome, Recruit" tone="red" />

      <div className="flex flex-1 flex-col p-6 pt-7">
        {/* The mascot leans on the input plate rather than sitting in its own
            row — overlap is what stops a stack of blocks reading as a form. */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.15 }}
            className="pointer-events-none absolute -right-4 -top-16 z-20 h-32 w-32 rotate-[6deg]"
          >
            <Art name="mascot-thinking" alt="" className="h-full w-full object-contain" />
          </motion.div>

          {/* Input plate. The label is a chip riding the top edge, so the
              field reads as a piece of equipment with a nameplate. */}
          <div className="ink relative rounded-plate bg-white p-5 pt-7 shadow-ink">
            <span className="ink absolute -top-3.5 left-5 rounded-pill bg-brass px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-ink shadow-chip-ink">
              Your codename
            </span>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="TYPE IT HERE"
              autoComplete="off"
              maxLength={15}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              className="ink w-full rounded-btn bg-paper px-5 py-4 text-center font-display text-[20px] uppercase tracking-wide text-ink placeholder:text-ink/25 focus:outline-none"
            />

            {/* Character budget, and the only thing that changes as you type.
                A counter that only appears when it is nearly relevant is less
                noise than one that sits at 0/15 from the start. */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="font-body text-[12px] font-semibold text-ink/45">
                {valid
                  ? "Looks good."
                  : focused || name.length > 0
                    ? "At least two characters."
                    : "Two characters or more."}
              </span>
              <span
                className={`font-readout text-[12px] font-bold ${
                  name.length > 12 ? "text-red" : "text-ink/35"
                }`}
              >
                {name.length}/15
              </span>
            </div>
          </div>
        </div>

        {/* The one genuinely interesting fact about this game, on a coloured
            surface rather than the grey box it was in. */}
        <div className="ink mt-5 rotate-[-1.2deg] rounded-plate bg-brass p-4 shadow-ink-sm">
          <span className="font-display text-[11px] uppercase tracking-[0.16em] text-ink/70">
            How this works
          </span>
          <p className="mt-1.5 font-body text-[14px] font-bold leading-snug text-ink">
            Your nine challenges are drawn from your name. No two phones in this
            room get the same board.
          </p>
        </div>

        <div className="mt-auto pt-6">
          <PrimaryButton disabled={!valid} onClick={handleStart} className="h-16 w-full">
            START MISSION
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
