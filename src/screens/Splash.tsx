import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { VaultDoor } from "../components/VaultDoor";
import { Starburst } from "../components/Starburst";
import { playUnlock } from "../lib/sound";
import { motion } from "motion/react";

export function Splash() {
  const navigate = useNavigate();
  const { username } = useGame();

  const [doorY, setDoorY] = useState(-500);
  const [wheelRotate, setWheelRotate] = useState(0);
  const [shake, setShake] = useState(false);
  const [showStarburst, setShowStarburst] = useState(false);

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

    // 2400ms: Navigate away
    const navTimer = setTimeout(() => {
      navigate(username ? "/home" : "/name", { replace: true });
    }, 2400);

    return () => {
      clearTimeout(dropTimer);
      clearTimeout(unlockTimer);
      clearTimeout(stopShakeTimer);
      clearTimeout(starburstTimer);
      clearTimeout(navTimer);
    };
  }, [navigate, username]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-7 select-none overflow-hidden relative">
      {/* Title Group */}
      <div className="flex flex-col items-center relative z-10">
        {/* CSI ASIET chip fades up at 700ms */}
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.7 }}
          className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-red-deep mb-2 bg-red/10 px-3 py-1 rounded-pill ink rotate-[-2.5deg] inline-block"
        >
          CSI ASIET
        </motion.span>

        {/* Wordmark scales up from 0.8 with overshoot, one letter-group at a time (350ms & 500ms) */}
        <h1 className="text-[52px] font-extrabold uppercase leading-[0.9] tracking-tighter text-ink mt-2">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 140, damping: 10, delay: 0.35 }}
            className="block"
          >
            OPERATION
          </motion.span>
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 140, damping: 10, delay: 0.5 }}
            className="text-red block"
          >
            VAULT
          </motion.span>
        </h1>
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

      {/* Loading subtext */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="pixel text-[10px] text-ink font-bold tracking-wider mt-4"
      >
        LOADING MISSION...
      </motion.div>
    </div>
  );
}
