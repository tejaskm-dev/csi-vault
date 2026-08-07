import React from "react";

export type VaultState = "locked" | "active" | "solved";

interface VaultTileProps {
  digit: number;
  state: VaultState;
  icon?: React.ReactNode;
  onClick?: () => void;
  size?: "grid" | "compact";
  tilt?: number;
  className?: string;
}

/**
 * The signature component. Three states: locked / active / solved.
 * Currently unstyled — the redesign owns its entire visual treatment and the
 * locked -> solved unlock transition.
 */
export function VaultTile({ digit, state, icon, onClick, size }: VaultTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      data-state={state}
      data-size={size ?? "grid"}
      aria-label={`Digit ${digit} — ${state}`}
    >
      <span>{digit}</span>
      {state === "locked" ? <span>locked</span> : icon}
      {state === "solved" && <span>solved</span>}
    </button>
  );
}
