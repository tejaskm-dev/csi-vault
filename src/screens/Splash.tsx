import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { VaultScene } from "../components/art/VaultScene";
import { useGame } from "../context/GameContext";
import { EASE_OUT } from "../lib/motion";

export function Splash() {
  const navigate = useNavigate();
  const { username } = useGame();

  useEffect(() => {
    const timer = setTimeout(
      () => navigate(username ? "/home" : "/name", { replace: true }),
      1800
    );
    return () => clearTimeout(timer);
  }, [navigate, username]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <VaultScene className="mb-8 h-44 w-44" state="closed" scenery={false} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT, delay: 0.1 }}
        className="flex flex-col items-center rotate-[-2deg]"
      >
        <h1 className="font-display text-2xl font-black uppercase tracking-[0.3em] text-csi-red">
          Operation
        </h1>
        <h1 className="font-display text-6xl font-black uppercase leading-none tracking-tight">
          Vault
        </h1>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted">
          CSI ASIET
        </p>
      </motion.div>
    </div>
  );
}
