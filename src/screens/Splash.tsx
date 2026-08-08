import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { VaultDoor } from "../components/VaultDoor";
import { Art } from "../components/Art";
import { Wordmark } from "../components/Wordmark";
import { PrimaryButton } from "../components/PrimaryButton";
import { Starburst } from "../components/Starburst";
import { Sprinkles } from "../components/Sprinkles";
import { playUnlock } from "../lib/sound";
import { motion, AnimatePresence } from "motion/react";

export function Splash() {
  const navigate = useNavigate();
  const { username } = useGame();

  const [doorY, setDoorY] = useState(-500);
  const [wheelRotate, setWheelRotate] = useState(0);
  const [shake, setShake] = useState(false);
  const [showStarburst, setShowStarburst] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 0ms: Vault door drops in
    const dropTimer = setTimeout(() => {
      setDoorY(0);
    }, 50);

    // 1100ms: Handwheel spins 180deg & door shakes & play sound
    const unlockTimer = setTimeout(() => {
      setWheelRotate(180);
      setShake(true);
      playUnlock();
    }, 1100);

    // Stop shaking after animation ends
    const stopShakeTimer = setTimeout(() => {
      setShake(false);
    }, 1600);

    // 1600ms: Starburst flashes behind the door
    const starburstTimer = setTimeout(() => {
      setShowStarburst(true);
    }, 1600);

    // 2400ms: the sequence finishes and the CTA appears. No auto-advance —
    // players arrive off a QR code at different moments, so a timed splash
    // means some of them never see it.
    const ctaTimer = setTimeout(() => setReady(true), 2200);

    return () => {
      clearTimeout(dropTimer);
      clearTimeout(unlockTimer);
      clearTimeout(stopShakeTimer);
      clearTimeout(starburstTimer);
      clearTimeout(ctaTimer);
    };
  }, [navigate, username]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-6 select-none overflow-hidden relative">
      <Sprinkles />

      {/* Title Group */}
      <div className="flex flex-col items-center relative z-10">
        {/* Society logo — the real mark, not a text chip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.55 }}
          className="mb-2 h-28 w-28"
        >
          <Art name="csi-logo" alt="CSI ASIET" className="h-full w-full object-contain" />
        </motion.div>

        {/* CSI ASIET chip fades up at 700ms */}
        <motion.span
          initial={{ opacity: 0, y: 8, rotate: -2.5 }}
          animate={{ opacity: 1, y: 0, rotate: -2.5 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.7 }}
          className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-red-deep mb-2 bg-red/10 px-3 py-1 rounded-pill ink inline-block"
        >
          CSI ASIET
        </motion.span>

        {/* Wordmark scales up from 0.8 with overshoot, one letter-group at a time (350ms & 500ms) */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 11, delay: 0.35 }}
        >
          <Wordmark />
        </motion.div>
      </div>

      {/* Hero Visual */}
      <div className="my-2 relative flex items-center justify-center w-64 h-64">
        {/* Starburst flashes behind the door at 1600ms */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={showStarburst ? { scale: [0, 2.3, 2.1], opacity: [0, 0.9, 0] } : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="w-36 h-36 z-0"
          >
            <Starburst fillColor="var(--color-yellow)" />
          </motion.div>
        </div>

        {/* Vault Door drops in, overshoots, settles, shakes */}
        <motion.div
          animate={{ y: doorY }}
          transition={{ type: "spring", stiffness: 100, damping: 11 }}
          className="relative z-10"
        >
          <VaultDoor state="closed" wheelRotate={wheelRotate} shake={shake} />
        </motion.div>
      </div>

      {/* Briefing runs during the sequence, then hands over to the CTA. */}
      {!ready && <BriefingLine />}

      {/* The three numbers that say what this actually is. The screen was a
          logo, a wordmark, a door and a button — nothing told a first-year
          what they had just scanned into. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.05 }}
        className="ink relative z-10 flex w-full max-w-xs items-stretch rounded-plate bg-white shadow-ink"
      >
        <Fact value="9" label="Safes" />
        <span className="my-3 w-0 border-l-2 border-dashed border-ink/15" />
        <Fact value="1" label="Code" />
        <span className="my-3 w-0 border-l-2 border-dashed border-ink/15" />
        <Fact value="20" label="Minutes" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="relative z-10 flex w-full max-w-xs flex-col items-center gap-3"
        style={{ pointerEvents: ready ? "auto" : "none" }}
      >
        <PrimaryButton
          className="h-16 w-full"
          onClick={() => navigate(username ? "/home" : "/name", { replace: true })}
        >
          BEGIN MISSION
        </PrimaryButton>
        <p className="font-body text-[12px] font-bold text-ink/40">
          Built by CSI ASIET for the next intake.
        </p>
      </motion.div>
    </div>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 py-3">
      <span className="font-display text-[22px] leading-none text-ink">{value}</span>
      <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-ink/45">
        {label}
      </span>
    </div>
  );
}

const BRIEFING = [
  "Pulling your file…",
  "Cutting nine locks…",
  "These nine are yours alone.",
];

function BriefingLine() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1100),
      setTimeout(() => setStep(2), 1900),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="mt-4 h-4">
      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.55, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="font-readout text-[10px] font-bold tracking-wider text-ink"
        >
          {BRIEFING[step]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
