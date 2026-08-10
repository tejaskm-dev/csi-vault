/**
 * Shrink a camera photo before it goes anywhere near the network.
 *
 * A modern phone camera produces 4–12MB per shot. Sixty of those, uploaded
 * over shared college wifi, in the middle of a timed game, is the single most
 * likely way this event falls over — and the photos are destined for a
 * projector and a 100px avatar, so the extra pixels buy nothing at all.
 *
 * 1280px on the long edge at JPEG 0.72 lands around 150–250KB, which is a
 * second or two on bad wifi and still looks sharp on a hall screen.
 */
const MAX_EDGE = 1280;
const QUALITY = 0.72;

export async function downscale(file: File, maxEdge = MAX_EDGE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  // OffscreenCanvas where it exists (every browser that matters on a 2024
  // phone), falling back to a detached <canvas> for anything older. The
  // fallback path is why this is not simply `new OffscreenCanvas(...)`.
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });

  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) {
    bitmap.close();
    return file; // no canvas: send the original rather than losing the photo
  }

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
  }
  return new Promise<Blob>((resolve) =>
    (canvas as HTMLCanvasElement).toBlob(
      (b) => resolve(b ?? file),
      "image/jpeg",
      QUALITY
    )
  );
}
