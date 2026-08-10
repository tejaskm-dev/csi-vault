import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { isLive, publicUrl, supabase } from "../lib/supabase";
import * as api from "../lib/api";

/**
 * The evidence wall.
 *
 * Photo challenges have no correct answer and no score attached — what they
 * produce instead is this: a slow rotation of pictures the room took of
 * itself, on the wall the room is already looking at. It is the single best
 * argument for the photo mechanic existing, and the reason it is worth the
 * storage bucket.
 *
 * It shows nothing at all until the first photo lands, so an empty room does
 * not get a panel of grey placeholders.
 */

/** How long each photo holds. Slow — this is ambient, not a slideshow. */
const HOLD_MS = 5200;

export function PhotoWall({ className }: { className?: string }) {
  const [photos, setPhotos] = useState<api.PhotoRow[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isLive) return;
    let stop = false;

    const pull = async () => {
      try {
        const s = await api.defaultSession();
        if (!s || stop) return;
        setPhotos(await api.fetchPhotos(s.id, 40));
      } catch { /* keep whatever is already on the wall */ }
    };

    void pull();
    // A new photo should appear within a few seconds of being taken — the
    // student who took it is standing in the room watching for it.
    const channel = supabase
      ?.channel("photo-wall")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "photos" },
        () => { void pull(); }
      )
      .subscribe();
    const poll = setInterval(pull, 15000);

    return () => {
      stop = true;
      clearInterval(poll);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, []);

  // Advance. Restarted whenever the set changes so a photo arriving does not
  // leave the wall stuck on a stale index.
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % photos.length), HOLD_MS);
    return () => clearInterval(t);
  }, [photos.length]);

  if (!photos.length) return null;

  const current = photos[index % photos.length];

  return (
    <section className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div className="mb-[0.6vh] flex shrink-0 items-baseline justify-between">
        <span
          className="font-display uppercase tracking-[0.18em] text-ink/45"
          style={{ fontSize: "0.9vw" }}
        >
          Evidence wall
        </span>
        <span className="font-readout font-bold text-ink/35" style={{ fontSize: "0.8vw" }}>
          {photos.length}
        </span>
      </div>

      {/* Matted and tilted, like the photo preview on the phone — the same
          instant-print language, so a picture on the projector reads as part
          of the same world as the app that took it. */}
      {/* Height in vh, NOT an aspect ratio.
          `aspect-[4/3]` derives height from the column's width, and this
          column is a third of a projector — so on a 1920px screen the frame
          demanded 460px and squeezed the podium above it into overlapping
          cards. The photo is cropped by object-cover anyway, so a bounded
          height costs a little framing and keeps the panel that matters. */}
      <div className="relative h-[18vh] w-full min-h-0 shrink">
        <AnimatePresence>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.4 } }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="ink absolute inset-0 overflow-hidden rounded-plate bg-white p-[0.6vh] shadow-ink"
          >
            <img
              src={publicUrl("photos", current.storage_path)}
              alt=""
              className="h-full w-full rounded-btn object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
