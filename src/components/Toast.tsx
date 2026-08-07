import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT } from "../lib/motion";
import { Pressable } from "./Pressable";

interface ToastProps {
  message: string;
  isVisible: boolean;
  type?: "error" | "info";
  actionText?: string;
  onAction?: () => void;
}

/**
 * Inline status, not an overlay. The incorrect-answer state lives on the
 * Challenge screen — it must never become its own route.
 */
export function Toast({
  message,
  isVisible,
  type = "error",
  actionText,
  onAction,
}: ToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className={
            "mb-4 flex items-center justify-between gap-3 rounded-btn px-4 py-2 " +
            (type === "error"
              ? "bg-red-tint text-csi-red"
              : "bg-blue-tint text-info-blue")
          }
        >
          <span className="text-[15px] font-semibold">{message}</span>
          {actionText && onAction && (
            <Pressable
              onClick={onAction}
              className="h-14 shrink-0 px-2 text-[15px] font-bold underline underline-offset-2"
            >
              {actionText}
            </Pressable>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
