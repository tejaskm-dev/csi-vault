import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { Art } from "../components/Art";
import { useGame } from "../context/GameContext";
import { screenChoreo, riseIn } from "../lib/motion";

/**
 * Every player sees this screen, once, before anything else in the game.
 *
 * It was the flattest screen in the app: no coloured surface, no art, nothing
 * overlapping anything, and a headline doing work the header should do. The
 * input is the only thing on the page that matters, so it gets the weight —
 * a labelled plate rather than a lone bordered box.
 */
/** The whole game in three lines, before anyone taps anything. */
const BRIEFING = [
  { title: "Nine locked safes", body: "Each one holds a digit of the vault code." },
  { title: "One question each", body: "No coding needed — just think it through." },
  { title: "Fastest crew wins", body: "Ranked by digits, then by how long you took." },
];

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

      <motion.div
        variants={screenChoreo}
        initial="initial"
        animate="animate"
        className="flex flex-1 flex-col p-6 pt-7"
      >
        {/* The mascot leans on the input plate rather than sitting in its own
            row — overlap is what stops a stack of blocks reading as a form. */}
        {/* pt-14 reserves room ABOVE the plate for the mascot. It used to sit
            at -top-16, which put it inside the header's box — and the header
            carries `relative z-20`, so it forms a stacking context that paints
            over anything in the body no matter what z-index the mascot has.
            The head was being sliced off by the header's bottom edge. */}
        <motion.div variants={riseIn} className="relative pt-14">
          <motion.div
            // The tilt lives in `animate`, not in a class. Framer writes an
            // inline transform, so a Tailwind rotate-* on the same element is
            // silently discarded.
            initial={{ opacity: 0, scale: 0.7, y: 12, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 6 }}
            transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.15 }}
            className="pointer-events-none absolute right-1 top-0 z-0 h-32 w-32"
          >
            <Art name="mascot-thinking" alt="" className="h-full w-full object-contain" />
          </motion.div>

          {/* Input plate. The label is a chip riding the top edge, so the
              field reads as a piece of equipment with a nameplate. The plate
              is z-10 over the mascot's z-0, so it peeks rather than covers. */}
          <div className="ink relative z-10 rounded-plate bg-white p-5 pt-7 shadow-ink">
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
        </motion.div>

        {/* The one genuinely interesting fact about this game, on a coloured
            surface rather than the grey box it was in. */}
        <motion.div
          variants={riseIn}
          style={{ rotate: -1.2 }}
          className="ink mt-5 rounded-plate bg-brass p-4 shadow-ink-sm"
        >
          <span className="font-display text-[11px] uppercase tracking-[0.16em] text-ink/70">
            How this works
          </span>
          <p className="mt-1.5 font-body text-[14px] font-bold leading-snug text-ink">
            Your nine challenges are drawn from your name. No two phones in this
            room get the same board.
          </p>
        </motion.div>

        {/* What they are walking into. Three lines of setup is the difference
            between a form and a briefing, and it fills the two-thirds of this
            page that were bare cream. */}
        <motion.div variants={riseIn} className="mt-5">
          <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-ink/40">
            The mission
          </span>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {BRIEFING.map((b, i) => (
              <div
                key={b.title}
                className="ink flex items-center gap-3 rounded-btn bg-white px-3 py-2.5 shadow-chip-ink"
              >
                <span className="ink flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-red font-display text-[13px] text-white">
                  {i + 1}
                </span>
                <span className="text-left">
                  <span className="block font-display text-[12px] uppercase leading-none tracking-wide text-ink">
                    {b.title}
                  </span>
                  <span className="mt-1 block font-body text-[12px] font-semibold leading-snug text-ink/55">
                    {b.body}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Last in the sequence — the research point that attention should end
            on the primary action. */}
        <motion.div variants={riseIn} className="mt-auto pt-7">
          <PrimaryButton disabled={!valid} onClick={handleStart} className="h-16 w-full">
            START MISSION
          </PrimaryButton>
        </motion.div>
      </motion.div>
    </div>
  );
}
