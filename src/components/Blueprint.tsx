import React from "react";
import clsx from "clsx";

interface BlueprintProps {
  variant?: "default" | "challenge" | "dark" | "yellow" | "green";
}

export function Blueprint({ variant = "default" }: BlueprintProps) {
  // The hand-drawn wobble (feTurbulence + feDisplacementMap) used to run on
  // this full-viewport layer on every screen. It is the most expensive thing a
  // low-end GPU can be asked to composite, and the approved mockups show a
  // plain cream ground anyway — so the filter is gone and the grid is drawn
  // straight.
  return (
    <div className={clsx(
      "absolute inset-0 z-0 overflow-hidden pointer-events-none",
      variant === "dark" ? "bg-ink" : "bg-paper"
    )}>
      {/* SVG filter definition for the wobble effect */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <filter id="plot">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Grid Pattern applied with filter */}
      <div 
        className={clsx(
          "absolute inset-0 opacity-30 pointer-events-none",
          variant === "dark" ? "opacity-10" : ""
        )}
        style={{
          backgroundImage: `
            linear-gradient(var(--color-plot) 1px, transparent 1px),
            linear-gradient(90deg, var(--color-plot) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
          backgroundPosition: "center top",
        }}
      />

      {/* Decorative dashed lines (guides) */}
      <div 
        className="absolute inset-y-0 left-6 border-l-2 border-dashed border-plot opacity-40 pointer-events-none"
      />
      <div 
        className="absolute inset-y-0 right-6 border-r-2 border-dashed border-plot opacity-40 pointer-events-none"
      />
    </div>
  );
}
