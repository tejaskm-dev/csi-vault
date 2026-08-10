import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as api from "../lib/api";
import { publicUrl } from "../lib/supabase";
import { humanError } from "../lib/errors";
import { cn } from "../lib/utils";

/**
 * THE REVIEW DESK.
 *
 * One photo at a time, the task above it, a tick and a cross. Everything about
 * this screen is shaped by the fact that it is used standing up, in a noisy
 * room, roughly a hundred and twenty times in half an hour.
 *
 *   THE TASK IS THE HEADLINE. A photo of a ceiling fan is correct or nonsense
 *   depending entirely on whether the challenge said "something that spins",
 *   and the reviewer has no way to know which challenge this player was
 *   dealt — boards are per-player. So the prompt travels with the image and
 *   sits above it, not in a tooltip.
 *
 *   ONE DECISION PER SCREEN. A grid of thumbnails invites scanning and
 *   mis-taps; a queue of one invites a decision. Auto-advance means the
 *   reviewer's eyes never leave the same spot on the screen.
 *
 *   THE TICK IS THE CHEAP ONE. Photos count unless crossed, so a tick is
 *   really "I looked, it's fine" — it is the larger, greener, easier button,
 *   and it is what the arrow keys and the muscle memory favour.
 *
 * Works for a reviewer holding the review code and for the host, because
 * reviewer_ok() accepts either. This component never knows which it is.
 */

/** Canned reasons, because typing on a phone in a crowd is not happening. */
const REASONS = [
  "Not what the task asked for",
  "Cannot tell what this is",
  "Too dark or blurry",
];

export function Review({ sessionId }: { sessionId: string }) {
  const [queue, setQueue] = useState<api.ReviewItem[]>([]);
  const [stats, setStats] = useState<api.ReviewStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  /** Judged on this device, so a stale poll cannot put one back on screen. */
  const done = useRef<Set<string>>(new Set());

  const pull = useCallback(async () => {
    // allSettled, not all: the counters are decoration and the queue is the
    // job. A failed stats call must not blank the photo somebody is looking at.
    const [rows, s] = await Promise.allSettled([
      api.reviewQueue(sessionId, 40),
      api.reviewStats(sessionId),
    ]);

    if (rows.status === "fulfilled") {
      setQueue(rows.value.filter((r) => !done.current.has(r.id)));
      setErr(null);
    } else {
      setErr(humanError(rows.reason, "Could not load the queue."));
    }

    if (s.status === "fulfilled") setStats(s.value);
  }, [sessionId]);

  useEffect(() => {
    void pull();
    // Slower than the game's poll on purpose: this is one laptop or three
    // phones, and a photo arriving six seconds late costs nothing.
    const t = setInterval(() => { if (!document.hidden) void pull(); }, 6000);
    return () => clearInterval(t);
  }, [pull]);

  const current = queue[0];

  const judge = useCallback(async (ok: boolean, reason?: string) => {
    if (!current || busy) return;
    setBusy(true);
    setErr(null);
    const id = current.id;
    try {
      await api.reviewPhoto(id, ok, reason);
      // Two reviewers WILL land on the same photo. review_photo is idempotent
      // and last-write-wins, so the only thing to do about it is drop this one
      // and move on.
      done.current.add(id);
      setQueue((q) => q.filter((r) => r.id !== id));
      setRejecting(false);
      setStats((s) =>
        s ? { ...s, pending: Math.max(0, s.pending - 1), [ok ? "ok" : "rejected"]: s[ok ? "ok" : "rejected"] + 1 } : s
      );
    } catch (e) {
      setErr(humanError(e, "That verdict did not go through."));
    } finally {
      setBusy(false);
    }
  }, [current, busy]);

  // Laptop shortcuts. A desk with a keyboard clears the queue twice as fast.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (rejecting) return;
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); void judge(true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setRejecting(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [judge, rejecting]);

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 p-4">
      {/* ── How the desk is doing ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="font-display text-[15px] uppercase tracking-[0.14em] text-ink">
          Evidence
        </span>
        <div className="flex items-center gap-2">
          <Pill tone="red" label="waiting" value={stats?.pending ?? 0} />
          <Pill tone="green" label="ok" value={stats?.ok ?? 0} />
          <Pill tone="ink" label="crossed" value={stats?.rejected ?? 0} />
        </div>
      </div>

      {err && (
        <p className="ink rounded-btn bg-red px-3 py-2 text-center font-body text-[13px] font-bold text-white">
          {err}
        </p>
      )}

      <AnimatePresence mode="wait">
        {!current ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="ink rounded-plate bg-white p-8 text-center shadow-ink"
          >
            <p className="font-display text-[20px] uppercase leading-tight text-ink">
              Nothing waiting
            </p>
            <p className="mt-2 font-body text-[13px] font-semibold leading-snug text-ink/55">
              Photos count as accepted until somebody crosses them, so an empty
              queue means the room is scoring correctly — not that it is stalled.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="flex flex-col gap-3"
          >
            {/* ── The task. Above the photo, because it is the question the
                   photo is an answer to, and a reviewer cannot judge without
                   it. ─────────────────────────────────────────────── */}
            <div className="ink rounded-plate bg-brass px-4 py-3 shadow-[0_5px_0_0_var(--color-brass-deep)]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-body text-[10px] font-bold uppercase tracking-[0.18em] text-ink/60">
                  {current.vault ? `Vault ${current.vault}` : "Bonus"}
                  {current.step ? ` · step ${current.step}` : ""}
                </span>
                <span className="shrink-0 font-body text-[11px] font-bold text-ink/60">
                  #{current.player_vault} {current.player_name}
                </span>
              </div>
              <p className="mt-1 font-display text-[17px] uppercase leading-tight text-ink">
                {current.task_title ?? "Photo challenge"}
              </p>
              {current.task_question && (
                <p className="mt-1 font-body text-[13px] font-semibold leading-snug text-ink/75">
                  {current.task_question}
                </p>
              )}
            </div>

            <div className="ink overflow-hidden rounded-plate bg-white p-2 shadow-ink">
              <img
                src={publicUrl("photos", current.storage_path)}
                alt=""
                className="aspect-square w-full rounded-btn bg-paper-deep object-cover"
              />
              {current.caption && (
                <p className="px-1 pb-1 pt-2 text-center font-body text-[13px] font-semibold text-ink/60">
                  “{current.caption}”
                </p>
              )}
            </div>

            {/* ── The verdict ───────────────────────────────────── */}
            {rejecting ? (
              <div className="ink rounded-plate bg-white p-4 shadow-ink">
                <p className="font-display text-[15px] uppercase tracking-wide text-ink">
                  Why?
                </p>
                <p className="mt-1 font-body text-[12px] font-semibold leading-snug text-ink/55">
                  This reopens their vault and tells them to retake it. The
                  reason is shown to the player.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={busy}
                      onClick={() => void judge(false, r)}
                      className="ink h-11 rounded-btn bg-paper-deep px-3 text-left font-body text-[13px] font-bold text-ink shadow-ink-sm disabled:opacity-40"
                    >
                      {r}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void judge(false)}
                    className="ink h-11 rounded-btn bg-red px-3 font-display text-[14px] uppercase tracking-wide text-white shadow-ink-sm disabled:opacity-40"
                  >
                    Cross it, no reason
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(false)}
                    className="h-10 font-body text-[12px] font-bold uppercase tracking-[0.14em] text-ink/40 underline decoration-ink/20 underline-offset-4"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_1.6fr] gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRejecting(true)}
                  className="ink flex h-16 items-center justify-center rounded-plate bg-white font-display text-[26px] text-red shadow-ink disabled:opacity-40"
                  aria-label="Reject"
                >
                  ✕
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void judge(true)}
                  className="ink flex h-16 items-center justify-center gap-2 rounded-plate bg-green font-display text-[26px] text-white shadow-[0_6px_0_0_var(--color-green-deep)] disabled:opacity-40"
                  aria-label="Approve"
                >
                  ✓
                </button>
              </div>
            )}

            <p className="text-center font-body text-[11px] font-semibold text-ink/35">
              {queue.length} in this batch · arrow keys work on a laptop
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pill({ tone, label, value }: { tone: "red" | "green" | "ink"; label: string; value: number }) {
  return (
    <span
      className={cn(
        "ink rounded-pill px-2.5 py-1 font-readout text-[12px] font-bold shadow-chip-ink",
        tone === "red" ? "bg-red text-white"
          : tone === "green" ? "bg-green text-white"
          : "bg-white text-ink/60"
      )}
    >
      {value} <span className="font-body text-[9px] uppercase tracking-[0.12em] opacity-70">{label}</span>
    </span>
  );
}
