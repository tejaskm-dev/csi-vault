import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PrimaryButton } from "../PrimaryButton";
import { Pressable } from "../Pressable";
import { Art } from "../Art";
import { useGame } from "../../context/GameContext";
import * as api from "../../lib/api";
import { downscale } from "../../lib/image";
import { playTap } from "../../lib/sound";
import { riseIn } from "../../lib/motion";
import type { Challenge } from "../../data/mockData";
import { humanError } from "../../lib/errors";
import { Viewfinder } from "./Viewfinder";

/**
 * Photo tasks — and the deliberate absence of a correctness check.
 *
 * "Photograph something red." There is no automated way to grade that, no
 * appetite for a staff member grading sixty of them, and — the part that makes
 * it work — no way to fake it from a chair. You have to stand up, look around
 * the room and point a camera at something. That is the entire mechanic, and
 * checking it would add nothing except a way to be wrong.
 *
 * What the game gets back is better than a score: a wall of real photographs
 * of the actual room, taken by the actual people in it, going up on the
 * projector while they play.
 */
export function PhotoTask({ challenge }: { challenge: Challenge }) {
  const { live, refresh } = useGame();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /**
   * Which capture path is in play.
   *
   *   "live"   the in-app viewfinder — what everyone should get
   *   "picker" the OS file input, used when getUserMedia is refused
   *
   * The fallback is not a nicety. getUserMedia needs HTTPS (or localhost), a
   * granted permission, and a camera nobody else is holding. On venue wifi
   * with sixty phones, some of those will fail, and a photo challenge that
   * dead-ends is a vault the player simply cannot open.
   */
  const [mode, setMode] = useState<"live" | "picker">("live");

  // Object URLs are a real leak on a long session — a player retaking a photo
  // four times leaves four decoded bitmaps pinned until the tab closes.
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  /** Straight from the viewfinder: already square and already JPEG. */
  const captured = (b: Blob) => {
    if (preview) URL.revokeObjectURL(preview);
    setErr(null);
    setBlob(b);
    setPreview(URL.createObjectURL(b));
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    try {
      // Shrink first, preview second, so what you see is what will be sent.
      const small = await downscale(file);
      if (preview) URL.revokeObjectURL(preview);
      setBlob(small);
      setPreview(URL.createObjectURL(small));
    } catch {
      setErr("Could not read that photo. Try again?");
    }
  };

  const send = async () => {
    if (!blob || !challenge.assignmentId) return;
    playTap();
    setBusy(true);
    setErr(null);
    try {
      await api.uploadPhoto(challenge.assignmentId, blob);
      await refresh();
      // No success beat here. The parent screen sees challenge.solved flip and
      // runs the same unlock choreography every other vault gets — the payoff
      // should not be different just because this one used a camera.
    } catch (e) {
      setErr(humanError(e, "Upload failed. Check your signal and retry."));
      setBusy(false);
    }
  };

  if (!live) {
    return (
      <div className="ink rounded-plate bg-white p-6 text-center shadow-ink">
        <Art name="camera" alt="" className="mx-auto h-20 w-20 object-contain" />
        <p className="mt-3 font-display text-[20px] uppercase leading-tight text-ink">
          Camera challenge
        </p>
        <p className="mt-2 font-body text-[14px] font-semibold leading-snug text-ink/60">
          Needs a live session to upload to. The camera opens; there is just
          nowhere to send it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* `capture="environment"` opens the rear camera directly on a phone
          rather than the photo library. The library is still reachable from
          the picker, which matters — a player who took the shot thirty seconds
          ago should not have to retake it. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            variants={riseIn}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0, scale: 0.96 }}
            // Rotated a degree and matted in white: the photo reads as an
            // instant print dropped onto the blueprint, not as an <img> in a
            // form. Same trick the question card uses.
            className="ink overflow-hidden rounded-plate bg-white p-3 shadow-ink"
            style={{ rotate: -1 }}
          >
            <img
              src={preview}
              alt="Your evidence"
              className="aspect-square w-full rounded-btn object-cover"
            />
          </motion.div>
        ) : mode === "live" ? (
          <motion.div key="live" variants={riseIn} initial="initial" animate="animate">
            <Viewfinder
              onCapture={captured}
              // Silently degrade. The player does not care why the camera was
              // refused, only that there is still a way to do the challenge.
              onUnavailable={(reason) => {
                console.warn("[vault] viewfinder unavailable:", reason);
                setMode("picker");
              }}
            />
          </motion.div>
        ) : (
          <motion.button
            key="empty"
            type="button"
            variants={riseIn}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0 }}
            onClick={() => { playTap(); inputRef.current?.click(); }}
            whileTap={{ x: 4, y: 4 }}
            className="ink flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-plate bg-white shadow-ink"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--color-plot) 0 10px, transparent 10px 20px)",
            }}
          >
            <Art name="camera" alt="" className="h-24 w-24 object-contain" />
            <span className="font-display text-[20px] uppercase tracking-wide text-ink">
              Open camera
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {err && (
        <p className="text-center font-body text-[13px] font-bold text-red-deep">{err}</p>
      )}

      {preview ? (
        <div className="flex flex-col gap-3">
          <PrimaryButton className="w-full" disabled={busy} onClick={send}>
            {busy ? "SENDING…" : "SUBMIT EVIDENCE"}
          </PrimaryButton>
          <Pressable
            className="w-full"
            disabled={busy}
            onClick={() => {
              if (preview) URL.revokeObjectURL(preview);
              setPreview(null);
              setBlob(null);
              if (mode === "picker") inputRef.current?.click();
            }}
          >
            RETAKE
          </Pressable>
        </div>
      ) : (
        <p className="text-center font-body text-[13px] font-semibold text-ink/55">
          No right answer here. Just proof you went and looked.
        </p>
      )}
    </div>
  );
}
