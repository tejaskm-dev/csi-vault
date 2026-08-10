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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable("no camera api");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // Rear camera where there is one. `ideal` rather than `exact` so a
          // laptop with only a front camera still works instead of throwing.
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e) {
        onUnavailable(e instanceof Error ? e.message : "camera blocked");
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
  }, [onUnavailable]);

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
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side, side,
      0, 0, canvas.width, canvas.height
    );
    canvas.toBlob((b) => b && onCapture(b), "image/jpeg", 0.78);
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

      {/* A round shutter, because every camera anyone has ever used has one. */}
      <div className="flex justify-center">
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
      </div>
    </div>
  );
}
