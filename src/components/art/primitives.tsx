import React from "react";

export const INK = "#221D1A";

export const DEFAULT_STROKE = {
  stroke: INK,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export interface CircleData {
  cx: number;
  cy: number;
  r: number;
}

interface FluffProps {
  circles: CircleData[];
  fill?: string;
  strokeWidth?: number;
  className?: string;
}

/**
 * Two-Pass Silhouette technique for fluffy/blobby forms.
 * Pass 1: Stroked outline (renders outer and inner bounds)
 * Pass 2: Identical filled circles painted on top to erase internal seams.
 */
export function Fluff({
  circles,
  fill = "#FFFFFF",
  strokeWidth = 5,
  className,
}: FluffProps) {
  return (
    <g className={className}>
      {/* Pass 1: Stroked outline */}
      <g stroke={INK} strokeWidth={strokeWidth} strokeLinejoin="round" fill={fill}>
        {circles.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
      </g>

      {/* Pass 2: Identical fill painted on top to erase internal seams */}
      <g fill={fill} stroke="none">
        {circles.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
      </g>
    </g>
  );
}
