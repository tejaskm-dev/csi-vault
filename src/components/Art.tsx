import { memo } from "react";
import { GLYPH_ART } from "../art";

interface ArtProps {
  name: string;
  alt: string;
  className?: string;
  /**
   * Set on art that is visible the moment its screen mounts — the splash
   * logo, the mascot on a result. Those decode eagerly at high priority;
   * everything else waits until it is near the viewport.
   */
  priority?: boolean;
}

export function ArtPlaceholder({ name, className }: { name: string; className?: string }) {
  // Deterministic color tile-1 through tile-9 based on a simple hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = (Math.abs(hash) % 9) + 1;
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div
      className={`ink rounded-btn flex items-center justify-center font-display font-extrabold text-ink select-none bg-tile-${index} ${className || "w-12 h-12 text-lg"}`}
      style={{
        boxShadow: "var(--shadow-ink-sm)",
      }}
    >
      {initials}
    </div>
  );
}

function ArtBase({ name, alt, className, priority }: ArtProps) {
  const src = GLYPH_ART[name];
  if (!src) {
    return <ArtPlaceholder name={name} className={className} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      // `async` keeps decoding off the main thread, so a 576px mascot cannot
      // stall a frame while it paints. Answer glyphs are lazy because a
      // question shows at most four of twenty-two.
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      {...(priority ? { fetchPriority: "high" as const } : null)}
    />
  );
}

/** Memoised — An <img>; re-rendering it re-runs nothing useful. */
export const Art = memo(ArtBase);
