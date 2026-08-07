import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { PrimaryButton } from "../components/PrimaryButton";

/**
 * Holding screen. `?state=post` for the after-the-run variant — reachable
 * now, where the variant prop previously had no way of being set.
 */
export function Waiting() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isPost = params.get("state") === "post";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-pill bg-light-gray"
      >
        <Clock className="h-9 w-9 text-muted" />
      </motion.div>

      <h1 className="mb-3 font-display text-3xl font-black tracking-tight">
        {isPost ? "You cracked it" : "Vault opens soon"}
      </h1>

      <p className="mb-8 max-w-xs text-[17px] text-muted">
        {isPost
          ? "Results drop when everyone's done. Check the leaderboard in the meantime."
          : "Hang tight — the event is about to begin. Keep this screen open."}
      </p>

      {isPost && (
        <PrimaryButton
          onClick={() => navigate("/leaderboard")}
          className="max-w-xs"
        >
          VIEW LEADERBOARD
        </PrimaryButton>
      )}
    </div>
  );
}
