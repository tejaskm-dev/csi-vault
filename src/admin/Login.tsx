import { useRef, useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Padlock } from "../components/Props";
import { Sprinkles } from "../components/Sprinkles";
import { playTap, playWrong, playUnlock } from "../lib/sound";
import { cn } from "../lib/utils";

/**
 * Operator sign-in.
 *
 * UI ONLY. There is no auth behind this and it must not be mistaken for any:
 * the passcode is compared in the browser, which means anyone who opens
 * devtools can read it. It exists so the screen the operator sees is designed,
 * and so the shape of the flow — six digits, lockout after repeated failures,
 * a clear signed-in state — is settled before the real thing is wired up.
 *
 * When the backend lands this becomes a Supabase session and the check moves
 * to the server. Everything visual here survives that change; nothing about
 * the layout depends on where the check happens.
 */
const DEMO_CODE = "801422";
const MAX_TRIES = 5;

export function Login({ onPass }: { onPass: () => void }) {
  const [code, setCode] = useState("");
  const [tries, setTries] = useState(0);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const locked = tries >= MAX_TRIES;

  const submit = (value: string) => {
    if (value === DEMO_CODE) {
      playUnlock();
      onPass();
      return;
    }
    playWrong();
    setTries((t) => t + 1);
    setShake(true);
    setCode("");
    window.setTimeout(() => setShake(false), 420);
  };

  const onChange = (raw: string) => {
    if (locked) return;
    const next = raw.replace(/\D/g, "").slice(0, 6);
    setCode(next);
    if (next.length === 6) submit(next);
    else if (next.length > code.length) playTap();
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-paper p-6">
      <Sprinkles />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="relative w-full max-w-[420px]"
      >
        {/* Header plate, same language as the game's screens. */}
        <div className="relative overflow-hidden rounded-t-plate bg-red px-7 pb-8 pt-7 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.13]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, #FFFFFF 0 8px, transparent 8px 22px)",
            }}
          />
          <span className="relative inline-block rounded-pill border-2 border-white/35 bg-red-deep px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.24em] text-white/85">
            Operations
          </span>
          <h1
            className="relative mt-3 font-display text-[34px] uppercase leading-none tracking-tight text-white"
            style={{ textShadow: "0 3px 0 var(--color-ink)" }}
          >
            Control Room
          </h1>
        </div>

        <motion.div
          animate={shake ? { x: [0, -10, 10, -8, 8, -4, 0] } : { x: 0 }}
          transition={{ duration: 0.42 }}
          className="ink -mt-4 rounded-plate bg-white p-7 shadow-ink"
        >
          <div className="mx-auto mb-4 h-20 w-20">
            <Padlock open={false} />
          </div>

          <p className="text-center font-body text-[13px] font-semibold text-ink/55">
            {locked
              ? "Too many attempts. Reload to try again."
              : "Enter the six-digit operator code."}
          </p>

          {/* Six boxes, one hidden input. Individual inputs fight paste, backspace
              and every mobile keyboard; one field with a drawn representation of
              its value behaves correctly everywhere. */}
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            disabled={locked}
            className="mt-5 flex w-full cursor-text justify-center gap-2"
          >
            {Array.from({ length: 6 }, (_, i) => {
              const filled = i < code.length;
              return (
                <span
                  key={i}
                  className={cn(
                    "ink flex h-14 w-full max-w-[52px] items-center justify-center rounded-btn font-readout text-[22px] font-bold shadow-chip-ink transition-colors",
                    locked ? "bg-paper-deep text-ink/25" : filled ? "bg-brass text-ink" : "bg-paper text-ink/20"
                  )}
                >
                  {filled ? "•" : ""}
                </span>
              );
            })}
          </button>

          <input
            ref={inputRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Operator code"
            disabled={locked}
            className="sr-only"
          />

          {tries > 0 && !locked && (
            <p className="mt-3 text-center font-body text-[12px] font-bold text-red">
              Incorrect code — {MAX_TRIES - tries} attempt
              {MAX_TRIES - tries === 1 ? "" : "s"} left.
            </p>
          )}

          <PrimaryButton
            onClick={() => inputRef.current?.focus()}
            disabled={locked}
            className="mt-5 h-14 w-full"
          >
            {locked ? "LOCKED" : "UNLOCK"}
          </PrimaryButton>

          {/* Stated plainly rather than hidden, because a passcode checked in
              the browser is not security and nobody should think it is. */}
          <p className="mt-4 text-center font-body text-[11px] font-semibold leading-snug text-ink/35">
            Demo build — this check runs in the browser and protects nothing.
            Code <span className="font-readout text-ink/55">{DEMO_CODE}</span>.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
