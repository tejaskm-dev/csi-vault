import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { playTap } from "../../lib/sound";

/**
 * A camera inside the app, instead of handing the player to the OS picker.
 *
 * The old version called a hidden `<input type="file" capture>`, which throws
 * the player out to the system camera, then back, with a confirm screen in
 * between that is not ours and cannot be styled. Three context switches to
 * take one photo, and the app looks like a form the whole time.
 *
 * This is a live preview with a shutter. It also gives the thing the file
 * picker never could: framing furniture — corner brackets and a caption strip
 * that make the shot feel like evidence being collected rather than an upload
 * being performed.
 *
 * getUserMedia can fail for reasons that are nobody's fault (permission
 * denied, camera in use by another app, or a browser that only allows it on
 * HTTPS). Every one of those falls back to the file picker rather than
 * dead-ending — see PhotoTask.
 */
export function Viewfinder({
  onCapture,
  onUnavailable,
}: {
  onCapture: (blob: Blob) => void;
  onUnavailable: (reason: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);

  /**
   * Which camera. Rear by default — most photo challenges point at the room —
   * but "get a photo with someone you have not met" is a selfie, and without
   * this the player had to hold the phone backwards and guess at the framing.
   *
   * This IS a legitimate effect dependency, unlike the callbacks: changing it
   * SHOULD tear the stream down and acquire the other camera. The bug was
   * never re-acquiring, it was re-acquiring for no reason.
   */
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [canFlip, setCanFlip] = useState(false);

  /**
   * Callbacks held in refs so the effect below can depend on NOTHING.
   *
   * This is the whole camera bug. `onUnavailable` was passed as an inline
   * arrow from PhotoTask, so it was a new function on every render, and the
   * effect listed it as a dependency. Every re-render therefore ran the
   * cleanup — stopping the camera track — and then re-acquired the stream.
   *
   * On desktop that shows up as the preview flickering. On a phone it is worse:
   * asking for the camera again while the previous track is still releasing
   * usually fails outright, so getUserMedia rejected and the whole thing fell
   * back to the file picker. The camera "not loading on mobile" was the app
   * restarting it dozens of times a second.
   */
  const onCaptureRef = useRef(onCapture);
  const onUnavailableRef = useRef(onUnavailable);
  onCaptureRef.current = onCapture;
  onUnavailableRef.current = onUnavailable;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailableRef.current("no camera api");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // `ideal` rather than `exact` so a laptop with only one camera still
          // works instead of throwing.
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 } },
          audio: false,
        });

        // Only offer the flip when there is something to flip to. A laptop
        // with one webcam should not show a button that does nothing.
        navigator.mediaDevices.enumerateDevices?.()
          .then((ds) => {
            if (!cancelled) {
              setCanFlip(ds.filter((d) => d.kind === "videoinput").length > 1);
            }
          })
          .catch(() => {});
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // play() rejects on some mobile browsers even for a muted inline
          // video. The stream is already attached at that point, so the
          // preview still works — swallowing it here is deliberate, and
          // treating it as a failure would send a working camera to the
          // fallback picker.
          try { await videoRef.current.play(); } catch { /* preview still live */ }
          if (!cancelled) setReady(true);
        }
      } catch (e) {
        onUnavailableRef.current(e instanceof Error ? e.message : "camera blocked");
      }
    })();

    // Releasing the stream matters more than usual here: a camera left running
    // keeps the indicator light on and drains a phone that has to survive the
    // whole event.
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // ONLY `facing`. The callbacks live in refs precisely so they cannot get
    // in here — anything that changes per render re-acquires the camera on
    // every render, which is what broke it on mobile.
  }, [facing]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    playTap();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 140);

    // Square crop from the centre, taken at capture time rather than after.
    // The wall on the projector is a grid, and a mix of portrait and landscape
    // photos in a grid looks like a mistake.
    const side = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(side, 1280);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror the capture too when using the front camera, so the photo saved
    // matches the preview the player framed rather than flipping at the last
    // moment.
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side, side,
      0, 0, canvas.width, canvas.height
    );
    canvas.toBlob((b) => b && onCaptureRef.current(b), "image/jpeg", 0.78);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="ink relative aspect-square w-full overflow-hidden rounded-plate bg-ink shadow-ink"
        style={{ rotate: "-1deg" }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          // Front cameras are mirrored by every phone camera app, and a
          // selfie preview that moves the wrong way is genuinely disorienting.
          style={facing === "user" ? { transform: "scaleX(-1)" } : undefined}
        />

        {/* Corner brackets. Cheap, and they do all the work of making a live
            video feel like a targeting device rather than a video element. */}
        {[
          "left-3 top-3 border-l-4 border-t-4",
          "right-3 top-3 border-r-4 border-t-4",
          "left-3 bottom-3 border-b-4 border-l-4",
          "right-3 bottom-3 border-b-4 border-r-4",
        ].map((cls) => (
          <span
            key={cls}
            aria-hidden
            className={`pointer-events-none absolute h-8 w-8 border-white/85 ${cls}`}
          />
        ))}

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-body text-[13px] font-bold uppercase tracking-[0.18em] text-white/60">
              Opening lens…
            </span>
          </div>
        )}

        {/* The shutter flash, which is the entire feedback for the tap. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-white"
          animate={{ opacity: flash ? 0.9 : 0 }}
          transition={{ duration: 0.12 }}
        />
      </div>

      {/* Shutter centred, flip to its right — the layout of every phone
          camera app, so nobody has to learn it. */}
      <div className="relative flex items-center justify-center">
        <motion.button
          type="button"
          onClick={shoot}
          disabled={!ready}
          whileTap={{ scale: 0.88 }}
          aria-label="Take the photo"
          className="ink flex h-20 w-20 items-center justify-center rounded-full bg-red shadow-[0_6px_0_0_var(--color-red-deep)] disabled:opacity-40"
        >
          <span className="h-14 w-14 rounded-full border-4 border-white/70" />
        </motion.button>

        {canFlip && (
          <motion.button
            type="button"
            onClick={() => {
              playTap();
              setReady(false);
              setFacing((f) => (f === "environment" ? "user" : "environment"));
            }}
            whileTap={{ scale: 0.9 }}
            aria-label={facing === "user" ? "Switch to the rear camera" : "Switch to the selfie camera"}
            className="ink absolute right-2 flex h-14 w-14 items-center justify-center rounded-full bg-paper-deep shadow-ink-sm"
          >
            <span className="font-display text-[11px] uppercase leading-tight text-ink">
              {facing === "user" ? "REAR" : "SELF"}
            </span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
