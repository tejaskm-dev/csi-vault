import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import React from "react";
import { EASE_OUT } from "../lib/motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: "bottomSheet" | "centeredCard";
}

export function Modal({
  isOpen,
  onClose,
  children,
  variant = "centeredCard",
}: ModalProps) {
  const isCentered = variant === "centeredCard";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-charcoal/45"
          />
          <div
            className={cn(
              "fixed inset-0 z-50 mx-auto flex max-w-md pointer-events-none",
              variant === "bottomSheet"
                ? "items-end"
                : "items-center justify-center p-6"
            )}
          >
            <motion.div
              initial={
                variant === "bottomSheet"
                  ? { y: "100%" }
                  : { opacity: 0, y: 12, rotate: 0 }
              }
              animate={
                variant === "bottomSheet"
                  ? { y: 0 }
                  : { opacity: 1, y: 0, rotate: 1.5 }
              }
              exit={
                variant === "bottomSheet"
                  ? { y: "100%" }
                  : { opacity: 0, y: 12, rotate: 0 }
              }
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className={cn(
                "pointer-events-auto overflow-hidden bg-white shadow-chunk-dark",
                variant === "bottomSheet"
                  ? "w-full rounded-t-card p-6 pb-8"
                  : "w-full max-w-sm rounded-card p-6"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
