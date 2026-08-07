import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface VaultDoorProps {
  state: "closed" | "open";
  className?: string;
  wheelRotate?: number;
  shake?: boolean;
}

export function VaultDoor({ state, className, wheelRotate, shake }: VaultDoorProps) {
  const isOpen = state === "open";

  return (
    <div
      className={cn("relative w-64 h-64 mx-auto select-none", className)}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        animate={
          shake
            ? {
                x: [0, -3, 3, -3, 3, 0],
                rotateZ: [0, -1, 1, -1, 1, 0],
              }
            : {
                rotateY: isOpen ? -110 : 0,
                x: isOpen ? -15 : 0,
                z: isOpen ? 20 : 0,
              }
        }
        transition={
          shake
            ? { duration: 0.45, ease: "easeInOut" }
            : {
                duration: 0.85,
                ease: [0.16, 1, 0.3, 1],
              }
        }
        style={{
          transformOrigin: "left center",
        }}
        className="absolute inset-0 z-20 w-full h-full"
      >
        <img
          src={isOpen ? "/src/art/props/door-open.png" : "/src/art/props/door-closed.png"}
          alt={isOpen ? "Vault Door Open" : "Vault Door Closed"}
          className="w-full h-full object-contain"
        />

        {/* Layered SVG Handwheel on top for rotating animation (only when closed or animating) */}
        {!isOpen && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.svg
              className="w-[108px] h-[108px] drop-shadow-md overflow-visible"
              viewBox="0 0 100 100"
              fill="none"
              animate={{ rotate: wheelRotate ?? 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              style={{ transformOrigin: "50px 50px" }}
            >
              {/* Wheel Hub Spokes (4 Spokes) */}
              <line x1="50" y1="18" x2="50" y2="82" stroke="var(--color-ink)" strokeWidth="7" strokeLinecap="round" />
              <line x1="18" y1="50" x2="82" y2="50" stroke="var(--color-ink)" strokeWidth="7" strokeLinecap="round" />
              
              {/* Inner Chrome Lines for Spokes */}
              <line x1="50" y1="21" x2="50" y2="79" stroke="#A0AAB5" strokeWidth="3" strokeLinecap="round" />
              <line x1="21" y1="50" x2="79" y2="50" stroke="#A0AAB5" strokeWidth="3" strokeLinecap="round" />

              {/* Outer Handwheel Ring */}
              <circle cx="50" cy="50" r="28" fill="none" stroke="var(--color-ink)" strokeWidth="9" />
              <circle cx="50" cy="50" r="28" fill="none" stroke="#C5D3E8" strokeWidth="4" />
              
              {/* Center Hub Outer shadow disc */}
              <circle cx="50" cy="50" r="13" fill="var(--color-ink)" />
              
              {/* Inner center face disc */}
              <circle cx="50" cy="50" r="10" fill="#7A8B99" stroke="var(--color-ink)" strokeWidth="3.5" />
              <circle cx="48" cy="48" r="4" fill="#C5D3E8" opacity="0.7" /> {/* Chrome Highlight */}
              <circle cx="50" cy="50" r="3.5" fill="var(--color-ink)" />
            </motion.svg>
          </div>
        )}
      </motion.div>
    </div>
  );
}
