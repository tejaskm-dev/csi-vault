import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PrimaryButton } from "../components/PrimaryButton";
import { VaultTile } from "../components/VaultTile";
import { Mascot } from "../components/art/Mascot";
import { Sparkle, GiftBox } from "../components/art/Props";
import { useGame } from "../context/GameContext";
import { celebrate, POP, EASE_OUT } from "../lib/motion";

export function Success() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { unlockVault, unlockedVaults } = useGame();

  const isBonus = id === "bonus";
  const digit = parseInt(id ?? "1", 10);

  const [tileSolved, setTileSolved] = useState(false);
  const committed = useRef(false);

  useEffect(() => {
    if (!committed.current && !isBonus && id) {
      unlockVault(id);
      committed.current = true;
    }
    const t = setTimeout(() => setTileSolved(true), 260);
    return () => clearTimeout(t);
  }, [id, isBonus, unlockVault]);

  useEffect(() => celebrate(), []);

  const remaining = 9 - unlockedVaults.length;
  const allDone = remaining === 0;

  const handleContinue = () => navigate(allDone ? "/vault-complete" : "/vault");

  return (
    <div className="flex min-h-dvh flex-col justify-between p-6">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="mb-4 font-display text-5xl font-black tracking-tight text-csi-red"
        >
          {isBonus ? "BONUS!" : "WOOHOO!"}
        </motion.h1>

        {/* Mascot cheer pose with jersey, -4deg tilt, -mb-4 margin */}
        <div className="relative z-20 -mb-4">
          <Mascot className="h-40 w-40" pose="cheer" accessory="jersey" tilt={-4} />
        </div>

        {isBonus ? (
          <GiftBox className="mb-6 h-32 w-32" />
        ) : (
          <motion.div
            initial={{ scale: POP.scale[0] }}
            animate={{ scale: POP.scale }}
            transition={POP.transition}
            className="relative mb-6 flex items-center justify-center gap-4"
          >
            <Sparkle className="h-6 w-6" />
            <div className="w-36">
              <VaultTile digit={digit} state={tileSolved ? "solved" : "active"} />
            </div>
            <Sparkle className="h-6 w-6" />
          </motion.div>
        )}

        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">
          {isBonus ? "Bonus cleared" : "Digit unlocked"}
        </p>

        <p className="mb-6 font-display text-2xl font-black">
          {isBonus ? "Nice spotting!" : `Digit ${digit} is yours`}
        </p>

        {/* Remaining vaults stat pill — XP was cut from scope */}
        <div className="rounded-pill bg-white px-5 py-3 shadow-chunk-white">
          <span className="text-[15px] font-semibold text-charcoal">
            {allDone ? (
              "All 9 digits recovered"
            ) : (
              <>
                <span className="numeral text-csi-red font-black">{remaining}</span>{" "}
                {remaining === 1 ? "vault" : "vaults"} left
              </>
            )}
          </span>
        </div>
      </div>

      <PrimaryButton onClick={handleContinue} className="h-16 text-xl">
        {allDone ? "OPEN THE VAULT" : "CONTINUE"}
      </PrimaryButton>
    </div>
  );
}
