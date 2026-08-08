import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Safe } from "../components/Safe";
import { useGame } from "../context/GameContext";
import { playTap, playUnlock } from "../lib/sound";

/**
 * The preloader between naming yourself and seeing your board.
 *
 * Four techniques, and each one is doing a specific job:
 *
 *   COUNTER — tabular figures climbing to 100, driven by requestAnimationFrame
 *   writing textContent through a ref. Not React state: sixty renders a second
 *   to change three characters is exactly the kind of thing the performance
 *   pass just removed.
 *
 *   NON-LINEAR RAMP — the number does NOT climb evenly. It rushes to 45,
 *   labours through the middle, then snaps home. A linear counter reads as a
 *   fake immediately; the hesitation is the whole reason this feels like
 *   something is actually happening.
 *
 *   MASK REVEAL — every line sits in an overflow-hidden box and slides up from
 *   below its own baseline, so the type is wiped into place rather than faded.
 *   Fades read as "content arrived"; masks read as "content was revealed".
 *
 *   CURTAIN — the panel leaves by translating up, with a curved shoulder
 *   trailing it so the edge is organic rather than a straight line. Transform
 *   only, so it composites; clip-path would also work but a translate is
 *   guaranteed to stay off the main thread on a cheap Android.
 *
 * The navigation fires when the curtain STARTS, and AnimatePresence runs in
 * mode="wait" — so Home does not mount until this exit has fully finished, and
 * its own stagger plays into a clear screen rather than underneath this one.
 */

const RUN_MS = 2400;

/** Expo-ish, the curve every good preloader uses. */
const EXPO: [number, number, number, number] = [0.76, 0, 0.24, 1];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInOutExpo = (t: number) =>
  t === 0 ? 0 : t === 1 ? 1 : t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;

/** Fast, then a deliberate drag, then a snap. */
function ramp(t: number) {
  if (t < 0.35) return easeOutCubic(t / 0.35) * 0.45;
  if (t < 0.7) return 0.45 + easeInOutSine((t - 0.35) / 0.35) * 0.28;
  return 0.73 + easeInOutExpo((t - 0.7) / 0.3) * 0.27;
}

const LINES = [
  "Reading your name",
  "Drawing nine locks",
  "Sealing the vault",
];

export function Booting() {
  const navigate = useNavigate();
  const { username } = useGame();

  const numberRef = useRef<HTMLSpanElement | null>(null);
  const [filled, setFilled] = useState(0);
  const [line, setLine] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 600 : RUN_MS;
    const start = performance.now();
    let raf = 0;
    let lastFilled = -1;
    let lastLine = -1;

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const p = ramp(t);

      // Direct DOM write — no re-render per frame.
      if (numberRef.current) {
        numberRef.current.textContent = String(Math.round(p * 100)).padStart(3, "0");
      }

      // Discrete state only changes nine times, not sixty times a second.
      const n = Math.min(9, Math.floor(p * 9.999));
      if (n !== lastFilled) {
        lastFilled = n;
        setFilled(n);
        if (n > 0 && !reduced) playTap();
      }
      // Guarded for the same reason as `filled`: this runs sixty times a
      // second and the value changes twice.
      const l = p < 0.35 ? 0 : p < 0.72 ? 1 : 2;
      if (l !== lastLine) {
        lastLine = l;
        setLine(l);
      }

      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        playUnlock();
        // Hold on 100 for a beat before the curtain — the pause is what makes
        // it land instead of feeling cut off.
        window.setTimeout(() => {
          setLeaving(true);
          navigate("/home", { replace: true });
        }, reduced ? 80 : 420);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [navigate]);

  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: 0 }}
      exit={{ y: "-105%", transition: { duration: 0.85, ease: EXPO } }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-red px-8"
    >
      {/* The curved shoulder that trails the curtain on its way out. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full h-24 rounded-b-[50%] bg-red"
      />

      {/* Hatching, same device and same angle as the headers, so the loader
          reads as this app's screen rather than a generic loading page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #FFFFFF 0 8px, transparent 8px 22px)",
        }}
      />

      <Reveal delay={0.05}>
        <span className="rounded-pill border-2 border-white/35 bg-red-deep px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.28em] text-white/85">
          Operation Vault
        </span>
      </Reveal>

      {/* The counter. Tabular so the digits do not jitter as they change, and
          carrying the same ink depth step the headers use — white on red with
          a hard ink shadow is this app's established way of setting type on a
          coloured panel. */}
      <Reveal delay={0.12}>
        <div className="mt-5 flex items-start">
          <span
            ref={numberRef}
            className="font-display text-[84px] leading-none tracking-tight text-white"
            style={{ fontVariantNumeric: "tabular-nums", textShadow: "0 5px 0 var(--color-ink)" }}
          >
            000
          </span>
          <span
            className="mt-3 ml-2 font-display text-[24px] leading-none text-brass"
            style={{ textShadow: "0 3px 0 var(--color-ink)" }}
          >
            %
          </span>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <span className="mt-3 font-body text-[13px] font-bold text-white/70">
          Building the board for{" "}
          <span className="text-brass">{username || "recruit"}</span>
        </span>
      </Reveal>

      {/* Nine safes stamping in — the loader is literally showing the thing it
          is building, which is what stops it being a spinner with a number. */}
      <div className="mt-9 grid w-full max-w-[300px] grid-cols-9 gap-1.5">
        {Array.from({ length: 9 }, (_, i) => (
          <motion.div
            key={i}
            // 0.3, not 0.12: a grey locked safe at 12% disappears entirely
            // against red, so the row read as empty until it filled.
            initial={{ opacity: 0.3, scale: 0.8 }}
            animate={
              i < filled ? { opacity: 1, scale: 1 } : { opacity: 0.3, scale: 0.8 }
            }
            transition={{ type: "spring", stiffness: 520, damping: 20 }}
            className="aspect-square w-full"
          >
            <Safe digit={i + 1} state={i < filled ? "available" : "locked"} />
          </motion.div>
        ))}
      </div>

      {/* Status line, swapped through a mask rather than cross-faded. */}
      <div className="mt-8 h-5 overflow-hidden">
        <motion.div
          animate={{ y: `-${line * 20}px` }}
          transition={{ duration: 0.5, ease: EXPO }}
        >
          {LINES.map((l) => (
            <div
              key={l}
              className="flex h-5 items-center justify-center font-readout text-[11px] font-bold tracking-[0.18em] text-white/60"
            >
              {l.toUpperCase()}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Progress rule. scaleX, not width — width forces layout every frame. */}
      {/* Track in the band's own deep tone rather than translucent white —
          on red, white/12 is nearly invisible. */}
      <div className="mt-4 h-1.5 w-full max-w-[300px] overflow-hidden rounded-pill bg-red-deep">
        <motion.div
          className="h-full origin-left rounded-pill bg-brass"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: leaving ? 1 : filled / 9 }}
          transition={{ duration: 0.45, ease: EXPO }}
        />
      </div>
    </motion.div>
  );
}

/**
 * A line wiped into place from behind its own baseline. The wrapper clips and
 * the child slides — the two-element structure is what makes it a reveal
 * rather than a slide-and-fade.
 */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="overflow-hidden">
      <motion.div
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.75, ease: EXPO, delay }}
      >
        {children}
      </motion.div>
    </div>
  );
}
