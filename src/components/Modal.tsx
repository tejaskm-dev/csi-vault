import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: "bottomSheet" | "centeredCard";
}

export function Modal({ isOpen, onClose, children, variant = "centeredCard" }: ModalProps) {
  const isSheet = variant === "bottomSheet";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/50 cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={
              isSheet
                ? { y: "100%", opacity: 0 }
                : { scale: 0.85, opacity: 0 }
            }
            animate={
              isSheet
                ? { y: 0, opacity: 1, transition: { type: "spring", stiffness: 350, damping: 25 } }
                : { scale: [0.85, 1.05, 1], opacity: 1, transition: { duration: 0.25, ease: "easeOut" } }
            }
            exit={
              isSheet
                ? { y: "100%", opacity: 0 }
                : { scale: 0.85, opacity: 0, transition: { duration: 0.15 } }
            }
            className={cn(
              "z-50 bg-paper ink text-ink shadow-ink-lg flex flex-col gap-5 p-6 relative w-full max-w-[90%] md:max-w-md",
              isSheet
                ? "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-card border-b-0 pb-10"
                : "rounded-card"
            )}
          >
            {/* Tiny drag indicator for sheet */}
            {isSheet && (
              <div className="w-12 h-1.5 bg-ink/20 rounded-pill mx-auto mb-2" />
            )}

            <div className="flex flex-col gap-4 text-center">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
