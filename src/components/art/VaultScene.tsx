import React from "react";
import { motion } from "framer-motion";
import { INK, Fluff, type CircleData } from "./primitives";
import { cn } from "../../lib/utils";

interface VaultSceneProps {
  className?: string;
  state?: "closed" | "open";
  tone?: "light" | "dark";
  scenery?: boolean;
}

const CLOUD_1: CircleData[] = [
  { cx: 44, cy: 36, r: 14 },
  { cx: 34, cy: 38, r: 10 },
  { cx: 54, cy: 38, r: 10 },
];

const CLOUD_2: CircleData[] = [
  { cx: 196, cy: 28, r: 14 },
  { cx: 186, cy: 30, r: 10 },
  { cx: 206, cy: 30, r: 10 },
];

const BUSH_BACK_1: CircleData[] = [
  { cx: 30, cy: 132, r: 16 },
  { cx: 18, cy: 136, r: 11 },
  { cx: 42, cy: 136, r: 11 },
];

const BUSH_BACK_2: CircleData[] = [
  { cx: 206, cy: 128, r: 16 },
  { cx: 194, cy: 132, r: 11 },
  { cx: 218, cy: 132, r: 11 },
];

const BUSH_BACK_3: CircleData[] = [
  { cx: 120, cy: 120, r: 14 },
  { cx: 108, cy: 124, r: 10 },
  { cx: 132, cy: 124, r: 10 },
];

const BUSH_FRONT_1: CircleData[] = [
  { cx: 52, cy: 164, r: 18 },
  { cx: 38, cy: 168, r: 13 },
  { cx: 66, cy: 168, r: 13 },
];

const BUSH_FRONT_2: CircleData[] = [
  { cx: 190, cy: 160, r: 18 },
  { cx: 176, cy: 164, r: 13 },
  { cx: 204, cy: 164, r: 13 },
];

export function VaultScene({
  className,
  state = "closed",
  tone = "light",
  scenery = true,
}: VaultSceneProps) {
  const open = state === "open";
  const archFill = tone === "dark" ? "#3A322D" : "#EDEAE3";
  const viewBox = scenery ? "0 0 240 200" : "70 46 100 108";
  const hingeOrigin = scenery ? "36.6% 50%" : "18% 50%";

  return (
    <div className={cn("relative", className)} style={{ perspective: 900 }}>
      {/* Base static SVG scene */}
      <svg viewBox={viewBox} fill="none" className="h-full w-full" aria-hidden="true" focusable="false">
        {/* Layer 1: Sky (transparent) */}

        {/* Layer 2: Clouds (scenery only) */}
        {scenery && (
          <g fill="#FFFFFF" opacity="0.9">
            {CLOUD_1.map((c, i) => <circle key={`c1-${i}`} cx={c.cx} cy={c.cy} r={c.r} />)}
            {CLOUD_2.map((c, i) => <circle key={`c2-${i}`} cx={c.cx} cy={c.cy} r={c.r} />)}
          </g>
        )}

        {/* Layer 3: Back Bushes (scenery only) */}
        {scenery && (
          <g>
            <Fluff circles={BUSH_BACK_1} fill="#F3C9C6" strokeWidth={4} />
            <Fluff circles={BUSH_BACK_2} fill="#F3C9C6" strokeWidth={4} />
            <Fluff circles={BUSH_BACK_3} fill="#F3C9C6" strokeWidth={4} />
          </g>
        )}

        {/* Layer 4: Ground Hill (scenery only) */}
        {scenery && (
          <g>
            <path d="M0 150Q120 124 240 150V200H0Z" fill="#E7EEDD" />
            <path d="M0 150Q120 124 240 150" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          </g>
        )}

        {/* Layer 5: Vault Arch Structure & Revealed Interior */}
        <g>
          <path d="M76 148V96A44 44 0 0 1 164 96V148Z" fill={archFill} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          {/* Interior recess */}
          <path d="M88 148V100A32 32 0 0 1 152 100V148Z" fill="#1A1614" stroke={INK} strokeWidth="3" />

          {/* Revealed interior gold coin stack on open */}
          {open && (
            <g>
              <circle cx="120" cy="120" r="30" fill="#F4B93E" opacity="0.25" />
              {/* Stacked gold discs */}
              <ellipse cx="120" cy="138" rx="16" ry="6" fill="#F4B93E" stroke={INK} strokeWidth="2.5" />
              <ellipse cx="120" cy="131" rx="16" ry="6" fill="#F4B93E" stroke={INK} strokeWidth="2.5" />
              <ellipse cx="120" cy="124" rx="16" ry="6" fill="#F4B93E" stroke={INK} strokeWidth="2.5" />
              <circle cx="120" cy="108" r="6" fill="#F4B93E" stroke={INK} strokeWidth="2" />
            </g>
          )}

          {/* Arch seam lines */}
          <path d="M76 110H88M152 110H164M120 52V64" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>

      {/* Layer 6: Vault Door with 5px depth slab & 4-spoke handwheel */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: hingeOrigin, transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateY: open ? -112 : 0 }}
        transition={{
          duration: open ? 0.9 : 0.3,
          ease: [0.32, 1.06, 0.4, 1],
          delay: open ? 0.2 : 0,
        }}
      >
        <svg viewBox={viewBox} fill="none" className="h-full w-full" aria-hidden="true" focusable="false">
          {/* Dark red depth slab offset 5px down-right */}
          <rect x="97" y="109" width="56" height="44" rx="10" fill="#C4241D" stroke={INK} strokeWidth="4" />
          {/* Main door face */}
          <rect x="92" y="104" width="56" height="44" rx="10" fill="#E8332B" stroke={INK} strokeWidth="4" />

          {/* 3-unit inset bevel line */}
          <rect x="96" y="108" width="48" height="36" rx="7" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.3" />

          {/* 8 rivets around perimeter */}
          <circle cx="97" cy="109" r="1.5" fill={INK} />
          <circle cx="120" cy="109" r="1.5" fill={INK} />
          <circle cx="143" cy="109" r="1.5" fill={INK} />
          <circle cx="97" cy="143" r="1.5" fill={INK} />
          <circle cx="120" cy="143" r="1.5" fill={INK} />
          <circle cx="143" cy="143" r="1.5" fill={INK} />
          <circle cx="97" cy="126" r="1.5" fill={INK} />
          <circle cx="143" cy="126" r="1.5" fill={INK} />

          {/* 4-spoke Handwheel */}
          <g>
            <circle cx="120" cy="126" r="13" fill={INK} stroke={INK} strokeWidth="3" />
            <circle cx="120" cy="126" r="9" fill="#3D3530" />
            {/* Spokes */}
            <rect x="118" y="114" width="4" height="24" rx="2" fill="#FBF6EF" />
            <rect x="108" y="124" width="24" height="4" rx="2" fill="#FBF6EF" />
            {/* Center cap */}
            <circle cx="120" cy="126" r="4" fill="#FBF6EF" stroke={INK} strokeWidth="1.5" />
          </g>

          {/* Highlight */}
          <rect x="95" y="107" width="3" height="10" rx="1.5" fill="#FFFFFF" opacity="0.35" />
        </svg>
      </motion.div>

      {/* Front Bushes & Flag SVG overlay (scenery only) */}
      {scenery && (
        <svg viewBox="0 0 240 200" fill="none" className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true" focusable="false">
          <g>
            <Fluff circles={BUSH_FRONT_1} fill="#E8332B" strokeWidth={4} />
            <Fluff circles={BUSH_FRONT_2} fill="#E8332B" strokeWidth={4} />
          </g>
          <g>
            <line x1="120" y1="52" x2="120" y2="30" stroke={INK} strokeWidth="4" strokeLinecap="round" />
            <path d="M120 32H144L137 40L144 48H120Z" fill="#E8332B" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <text x="126" y="42" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="Nunito, sans-serif">
              CSI
            </text>
          </g>
        </svg>
      )}
    </div>
  );
}
