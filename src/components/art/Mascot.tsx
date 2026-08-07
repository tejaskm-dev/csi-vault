import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { INK, Fluff, type CircleData } from "./primitives";
import { BREATHE } from "../../lib/motion";

export interface MascotProps {
  className?: string;
  pose?: "idle" | "cheer" | "think";
  accessory?: "none" | "headphones" | "jersey" | "flag";
  tilt?: number;
}

const HEAD_FLUFF: CircleData[] = [
  { cx: 100, cy: 78, r: 34 },
  { cx: 132, cy: 78, r: 13 },
  { cx: 123, cy: 101, r: 13 },
  { cx: 100, cy: 110, r: 13 },
  { cx: 77, cy: 101, r: 13 },
  { cx: 68, cy: 78, r: 13 },
  { cx: 77, cy: 55, r: 13 },
  { cx: 100, cy: 46, r: 13 },
  { cx: 123, cy: 55, r: 13 },
  { cx: 64, cy: 52, r: 11 },
  { cx: 136, cy: 52, r: 11 },
];

const BODY_FLUFF: CircleData[] = [
  { cx: 100, cy: 142, r: 26 },
  { cx: 124, cy: 142, r: 12 },
  { cx: 112, cy: 163, r: 12 },
  { cx: 88, cy: 163, r: 12 },
  { cx: 76, cy: 142, r: 12 },
  { cx: 88, cy: 121, r: 12 },
  { cx: 112, cy: 121, r: 12 },
];

export function Mascot({
  className,
  pose = "idle",
  accessory = "none",
  tilt = 0,
}: MascotProps) {
  const isCheer = pose === "cheer";
  const isThink = pose === "think";

  // Random 3-6s eye blink animation
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 3000;
      timer = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 140);
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => clearTimeout(timer);
  }, []);

  // Curved arm path coordinates based on pose
  const leftArmPath = isThink
    ? "M78 134 Q70 114 88 100"
    : isCheer
      ? "M78 134 Q62 118 60 100"
      : "M78 134 Q64 144 62 152";

  const rightArmPath = isCheer
    ? "M122 134 Q138 118 140 100"
    : "M122 134 Q136 144 138 152";

  const leftHand = isThink ? { x: 88, y: 100 } : isCheer ? { x: 60, y: 100 } : { x: 62, y: 152 };
  const rightHand = isCheer ? { x: 140, y: 100 } : { x: 138, y: 152 };

  const headTransform = isThink ? "rotate(4 100 78)" : "rotate(0)";

  return (
    /* Level 1: Static pose tilt wrapper */
    <div style={{ transform: `rotate(${tilt}deg)` }} className="inline-block">
      {/* Level 2: SWAY rotate loop */}
      <motion.div
        animate={{ rotate: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Level 3: Cheer vertical hop */}
        <motion.div
          animate={isCheer ? { y: [0, -10, 0] } : { y: 0 }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Level 4: BREATHE scale loop */}
          <motion.div animate={BREATHE}>
            <svg
              viewBox="0 0 200 200"
              fill="none"
              className={className}
              aria-hidden="true"
              focusable="false"
            >
              {/* Feet: overlapping body fluff by ~6 units so they attach cleanly */}
              <g stroke={INK} strokeWidth="5" fill="#FFFFFF">
                <ellipse cx="86" cy="168" rx="11" ry="6.5" />
                <ellipse cx="114" cy="168" rx="11" ry="6.5" />
              </g>

              {/* Body Fluff */}
              <Fluff circles={BODY_FLUFF} strokeWidth={5} />

              {/* Jersey accessory */}
              {accessory === "jersey" && (
                <g>
                  <rect
                    x="74"
                    y="122"
                    width="52"
                    height="44"
                    rx="14"
                    fill="#E8332B"
                    stroke={INK}
                    strokeWidth="4"
                  />
                  <text
                    x="100"
                    y="150"
                    fill="#FFFFFF"
                    fontSize="16"
                    fontWeight="900"
                    fontFamily="Nunito, sans-serif"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    CSI
                  </text>
                </g>
              )}

              {/* Curved Arms (2-pass) */}
              <g stroke={INK} strokeWidth="13" strokeLinecap="round" fill="none">
                <path d={leftArmPath} />
                <path d={rightArmPath} />
              </g>
              <g stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" fill="none">
                <path d={leftArmPath} />
                <path d={rightArmPath} />
              </g>

              {/* Round Hand Caps (drawn AFTER arms so they cap cleanly) */}
              <g stroke={INK} strokeWidth="4" fill="#FFFFFF">
                <circle cx={leftHand.x} cy={leftHand.y} r="7" />
                <circle cx={rightHand.x} cy={rightHand.y} r="7" />
              </g>

              {/* Flag accessory (held in right hand when cheer) */}
              {accessory === "flag" && (
                <g>
                  <line x1="140" y1="100" x2="140" y2="56" stroke={INK} strokeWidth="4" strokeLinecap="round" />
                  <path d="M140 58H170L162 67L170 76H140Z" fill="#E8332B" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
                </g>
              )}

              {/* Head Group */}
              <g transform={headTransform}>
                <Fluff circles={HEAD_FLUFF} strokeWidth={5} />

                {/* Face Features */}
                <g>
                  {/* Blinking Eyes */}
                  <motion.ellipse
                    cx="87"
                    cy="76"
                    rx="4"
                    animate={{ ry: blinking ? 0.4 : 5.5 }}
                    transition={{ duration: 0.07 }}
                    fill={INK}
                  />
                  {!blinking && <circle cx="88.5" cy="73.5" r="1.6" fill="#FFFFFF" />}

                  <motion.ellipse
                    cx="113"
                    cy="76"
                    rx="4"
                    animate={{ ry: blinking ? 0.4 : 5.5 }}
                    transition={{ duration: 0.07 }}
                    fill={INK}
                  />
                  {!blinking && <circle cx="114.5" cy="73.5" r="1.6" fill="#FFFFFF" />}

                  {/* Muzzle */}
                  <ellipse cx="100" cy="94" rx="12" ry="9" fill="#FFFFFF" />

                  {/* Nose */}
                  <ellipse cx="100" cy="89" rx="4" ry="3" fill={INK} />

                  {/* Mouth */}
                  {isCheer ? (
                    <ellipse cx="100" cy="98" rx="7" ry="5.5" fill={INK} />
                  ) : (
                    <path
                      d="M100 92Q96 98 91 95M100 92Q104 98 109 95"
                      stroke={INK}
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Cheeks */}
                  <circle cx="76" cy="88" r="6.5" fill="#E8332B" opacity="0.16" />
                  <circle cx="124" cy="88" r="6.5" fill="#E8332B" opacity="0.16" />
                </g>

                {/* Headphones accessory */}
                {accessory === "headphones" && (
                  <g>
                    <path
                      d="M62 74V64A38 38 0 0 1 138 64V74"
                      stroke={INK}
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <rect
                      x="52"
                      y="72"
                      width="18"
                      height="26"
                      rx="9"
                      fill="#E8332B"
                      stroke={INK}
                      strokeWidth="4"
                    />
                    <rect
                      x="130"
                      y="72"
                      width="18"
                      height="26"
                      rx="9"
                      fill="#E8332B"
                      stroke={INK}
                      strokeWidth="4"
                    />
                  </g>
                )}
              </g>
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
