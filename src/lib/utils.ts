import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * mm:ss for the run timer, rolling over to h:mm:ss past the hour.
 *
 * Without the rollover a session left open reads "352:05", which is 352
 * MINUTES and looks like a broken counter. The event is twenty minutes, so
 * this only fires if a phone sits on the results screen — but that is exactly
 * the screen someone photographs.
 */
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  if (mm < 60) return `${mm}:${ss}`;
  return `${Math.floor(mm / 60)}:${(mm % 60).toString().padStart(2, "0")}:${ss}`;
}
