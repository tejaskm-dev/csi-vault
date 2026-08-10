import { useRef, useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Padlock } from "../components/Props";
import { Sprinkles } from "../components/Sprinkles";
import { playTap, playWrong, playUnlock } from "../lib/sound";
import { cn } from "../lib/utils";
import { isLive } from "../lib/supabase";
import * as api from "../lib/api";

/**
 * Operator sign-in.
 *
 * LIVE: the code is verified server-side. Every host action re-sends it and
 * every host function re-checks it against sessions.host_code, so there is no
 * client-side "signed in" flag worth forging — passing this screen with
 * devtools gets you a dashboard whose every button fails.
 *
 * OFFLINE: still a browser-side compare against DEMO_CODE, because there is no
 * server to ask. Do not mistake that path for auth; it exists so the screen
 * can be designed and demoed without a database.
 */
/** The offline code. Live, the real one lives in sessions.host_code. */
const DEMO_CODE = "801422";
const MAX_TRIES = 5;

export function Login({ onPass }: { onPass: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [tries, setTries] = useState(0);
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  /** Server-side reason for a rejection, when there is one worth showing. */
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const locked = tries >= MAX_TRIES;

  /**
   * This does not check a code. It CLAIMS the session.
   *
   * The distinction is the whole security model. host_claim() spends the six
   * digits once, binds the session to this browser's auth user, and from then
   * on every host action is authorised by that binding — so someone who
   * eventually guesses the code cannot act while a real host holds the room.
   *
   * The server also owns the lockout now. The five-try counter below is
   * cosmetic; the real one is in Postgres, keyed on the caller's identity, and
   * cannot be stepped over in devtools the way this one can.
   */
  const submit = async (value: string) => {
    if (checking) return;

    if (!isLive) {
      if (value === DEMO_CODE) { playUnlock(); onPass(value); return; }
      reject();
      return;
    }

    setChecking(true);
    try {
      const s = await api.defaultSession();
      if (!s) throw new Error("no session");
      await api.hostClaim(s.id, value);
      playUnlock();
      onPass(value);
    } catch (e) {
      // Only ONE of the things that can go wrong here is a wrong code, and
      // reporting all of them as one sent me chasing a passcode for twenty
      // minutes when the actual fault was a broken view. An operator staring
      // at "incorrect code" will retype a correct code until the server locks
      // them out, so anything that is not a rejected passcode says what it is.
      const msg = e instanceof Error ? e.message : String(e);
      if (/bad host code/i.test(msg)) {
        reject(null);                                   // genuinely wrong
      } else if (/already hosting/i.test(msg)) {
        reject("Another device is hosting. Release it there, or wait 12 hours.", false);
      } else if (/too many/i.test(msg)) {
        reject("Too many attempts on this device. Wait a few minutes.", false);
      } else if (/no session|no such session/i.test(msg)) {
        reject("No open session. Check the migrations have run.", false);
      } else if (/timed out|failed to fetch|networkerror/i.test(msg)) {
        // Code kept, so the fix is one tap rather than six.
        reject("Server did not answer. Tap UNLOCK to try again.", false);
      } else {
        reject(`Could not reach the server — ${msg.slice(0, 80)}`, false);
      }
      // Full detail to the console regardless. The screen has room for one
      // line; a Postgres error code belongs where it can be read properly.
      console.error("[vault] host claim failed", e);
    } finally {
      setChecking(false);
    }
  };

  /**
   * `wrongCode` separates "you typed the wrong six digits" from "the server
   * did not answer". Only the first should count against the try limit or
   * clear the field — losing a correct code to a dropped request, and then
   * being told you have four attempts left, is how a locked-out operator
   * happens thirty seconds before a game starts.
   */
  const reject = (message: string | null = null, wrongCode = true) => {
    playWrong();
    setNote(message);
    if (wrongCode) {
      setTries((t) => t + 1);
      setCode("");
    }
    setShake(true);
    window.setTimeout(() => setShake(false), 420);
  };

  const onChange = (raw: string) => {
    if (locked || checking) return;
    const next = raw.replace(/\D/g, "").slice(0, 6);
    setNote(null);
    setCode(next);
    if (next.length === 6) void submit(next);
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

          {/* `note` carries the server's actual reason — an already-claimed
              room or a server-side throttle — which are not wrong codes and
              must not be reported as one. */}
          {note ? (
            <p className="mt-3 text-center font-body text-[12px] font-bold text-red">
              {note}
            </p>
          ) : tries > 0 && !locked ? (
            <p className="mt-3 text-center font-body text-[12px] font-bold text-red">
              Incorrect code — {MAX_TRIES - tries} attempt
              {MAX_TRIES - tries === 1 ? "" : "s"} left.
            </p>
          ) : null}

          {/* This used to only focus the input.
              The single way to submit was typing the sixth digit, so after any
              failure — which also WIPED the code — tapping UNLOCK did nothing
              at all and the operator had to retype all six with no feedback.
              That is the "it does not register" behaviour. */}
          <PrimaryButton
            onClick={() => {
              if (code.length === 6) void submit(code);
              else inputRef.current?.focus();
            }}
            disabled={locked || checking}
            className="mt-5 h-14 w-full"
          >
            {checking ? "CHECKING…" : locked ? "LOCKED" : code.length === 6 ? "UNLOCK" : "ENTER CODE"}
          </PrimaryButton>

          {/* Offline, the check is a browser-side string compare and printing
              the code alongside that admission is honest. LIVE, it is a real
              claim against the server — so this must not print the secret. */}
          {isLive ? (
            <p className="mt-4 text-center font-body text-[11px] font-semibold leading-snug text-ink/35">
              Unlocking claims this room for this browser. Other devices are
              locked out until you release it.
            </p>
          ) : (
            <p className="mt-4 text-center font-body text-[11px] font-semibold leading-snug text-ink/35">
              Demo build — this check runs in the browser and protects nothing.
              Code <span className="font-readout text-ink/55">{DEMO_CODE}</span>.
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
