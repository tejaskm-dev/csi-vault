import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Sprinkles } from "../components/Sprinkles";
import { Review } from "./Review";
import { playTap, playWrong, playUnlock } from "../lib/sound";
import { humanError } from "../lib/errors";
import { isLive } from "../lib/supabase";
import { cn } from "../lib/utils";
import * as api from "../lib/api";

/**
 * The invigilator's door.
 *
 * Deliberately NOT the host login. host_claim is exclusive — one device owns
 * the room, and that is right for the buttons that can end a game for sixty
 * people. A review desk is two or three people working one queue on their own
 * phones, so this is membership: everybody who types the code gets in, nobody
 * evicts anybody, and what they get is four functions and nothing else.
 *
 * A reviewer cannot start, end, pause or reset the game, cannot broadcast, and
 * cannot see a recovery PIN. Handing this code to a volunteer is safe in a way
 * that handing them the host code is not.
 */
export function ReviewApp() {
  const [code, setCode] = useState("");
  const [name, setName] = useState(() => localStorage.getItem("csi_reviewer") || "");
  const [session, setSession] = useState<api.SessionRow | null>(null);
  const [inside, setInside] = useState(false);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.style.backgroundColor = "#F5F2E8";
    if (!isLive) return;
    api.defaultSession()
      .then(setSession)
      .catch(() => setNote("Could not reach the game."));
  }, []);

  const submit = async () => {
    if (checking || code.length !== 6) { inputRef.current?.focus(); return; }
    if (!session) { setNote("No open session yet."); return; }
    setChecking(true);
    setNote(null);
    try {
      await api.reviewClaim(session.id, code, name);
      localStorage.setItem("csi_reviewer", name.trim());
      playUnlock();
      setInside(true);
    } catch (e) {
      // Same split as the host login: only a genuinely wrong code clears the
      // field. Losing a correct code to a dropped request, and then being told
      // to try again, is how a volunteer gives up and finds the host.
      const msg = e instanceof Error ? e.message : String(e);
      playWrong();
      if (/bad review code/i.test(msg)) { setCode(""); setNote("That code is not right."); }
      else setNote(humanError(e, "Could not reach the server. Tap again."));
      setShake(true);
      window.setTimeout(() => setShake(false), 420);
    } finally {
      setChecking(false);
    }
  };

  if (inside && session) {
    return (
      <div className="min-h-dvh bg-paper">
        <header className="flex items-center justify-between bg-red px-4 py-3 shadow-[0_4px_0_0_var(--color-ink)]">
          <span
            className="font-display text-[17px] uppercase leading-none text-white"
            style={{ textShadow: "0 2px 0 var(--color-ink)" }}
          >
            Review Desk
          </span>
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
            {name || "Reviewer"}
          </span>
        </header>
        <Review sessionId={session.id} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-paper p-6">
      <Sprinkles />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="relative w-full max-w-[420px]"
      >
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
            Invigilator
          </span>
          <h1
            className="relative mt-3 font-display text-[32px] uppercase leading-none tracking-tight text-white"
            style={{ textShadow: "0 3px 0 var(--color-ink)" }}
          >
            Review Desk
          </h1>
        </div>

        <motion.div
          animate={shake ? { x: [0, -10, 10, -8, 8, -4, 0] } : { x: 0 }}
          transition={{ duration: 0.42 }}
          className="ink -mt-4 rounded-plate bg-white p-7 shadow-ink"
        >
          <p className="text-center font-body text-[13px] font-semibold text-ink/55">
            Your name, then the reviewer code.
          </p>

          {/* The name is not decoration: it lands on every verdict, so
              "who crossed mine?" has an answer. */}
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder="Your name"
            className="ink mt-4 w-full rounded-btn bg-paper-deep px-3 py-3 text-center font-body text-[15px] font-bold text-ink shadow-ink-sm focus:outline-none"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="mt-3 flex w-full cursor-text justify-center gap-2"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "ink flex h-14 w-full max-w-[52px] items-center justify-center rounded-btn font-readout text-[22px] font-bold shadow-chip-ink",
                  i < code.length ? "bg-brass text-ink" : "bg-paper text-ink/20"
                )}
              >
                {i < code.length ? "•" : ""}
              </span>
            ))}
          </button>

          <input
            ref={inputRef}
            value={code}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 6);
              setNote(null);
              if (next.length > code.length) playTap();
              setCode(next);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Reviewer code"
            className="sr-only"
          />

          {note && (
            <p className="mt-3 text-center font-body text-[12px] font-bold text-red">{note}</p>
          )}

          <PrimaryButton
            onClick={() => void submit()}
            disabled={checking || !name.trim()}
            className="mt-5 h-14 w-full"
          >
            {checking ? "CHECKING…" : code.length === 6 ? "OPEN THE QUEUE" : "ENTER CODE"}
          </PrimaryButton>

          <p className="mt-4 text-center font-body text-[11px] font-semibold leading-snug text-ink/35">
            Reviewers judge photos and nothing else. You cannot start, end or
            reset the game from here.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
