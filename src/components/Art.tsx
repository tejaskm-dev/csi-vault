import { GLYPH_ART } from "../art";

interface ArtProps {
  name: string;
  alt: string;
  className?: string;
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

export function Art({ name, alt, className }: ArtProps) {
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
    />
  );
}
