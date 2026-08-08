import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ProgressDots } from "../components/ProgressDots";
import { CountdownPill } from "../components/CountdownPill";
import { AnswerOptionCard } from "../components/AnswerOptionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { ScreenHeader } from "../components/ScreenHeader";
import { Toast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { Art } from "../components/Art";
import { HintBulb } from "../components/Props";
import { useGame } from "../context/GameContext";
import { playCorrect, playWrong } from "../lib/sound";
import { shakeVariants, listStagger, riseIn } from "../lib/motion";
import { cn } from "../lib/utils";

const CHECKING_MS = 400;
const WRONG_HOLD_MS = 360;

/**
 * Escalating failure copy. One hardcoded string repeated on every miss is the
 * single loudest tell that nobody sat with the screen — and it's the message a
 * struggling player sees most often. Later lines nudge toward the hint.
 */
const MISS_LINES = [
  "The seal held.",
  "Not that one.",
  "Still shut. Try the nudge?",
  "That's three. Take the hint.",
];

/** Varying the wait keeps a 400ms pause from reading as a fixed spinner. */
const CHECKING_LINES = ["CHECKING", "TESTING", "READING DIAL"];

type Status = "idle" | "checking" | "wrong" | "correct";

export function ChallengeScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getChallenge, unlockedVaults, solveBonus } = useGame();

  const challenge = getChallenge(id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [time, setTime] = useState(challenge?.timeLimit ?? 45);
  const [status, setStatus] = useState<Status>("idle");
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [toast, setToast] = useState<null | "wrong" | "timeup">(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [misses, setMisses] = useState(0);
  const [showMiss, setShowMiss] = useState(false);
  const timers = useRef<number[]>([]);

  const isBonus = Boolean(challenge?.isBonus);
  const digit = isBonus ? 0 : parseInt(id ?? "1", 10);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (status === "correct") return;
    const interval = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setToast((prev) => prev ?? "timeup");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  if (!challenge) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="font-bold text-lg text-ink/70">That challenge isn't in your set.</p>
        <PrimaryButton onClick={() => navigate("/vault")}>BACK TO VAULT</PrimaryButton>
      </div>
    );
  }

  const isTextInput = challenge.type === "text_input";
  const canSubmit = isTextInput ? textInput.trim().length > 0 : Boolean(selectedId);

  const handleSubmit = () => {
    if (!canSubmit || status === "checking" || status === "correct") return;

    setToast(null);
    setWrongId(null);
    setStatus("checking");

    const t = window.setTimeout(() => {
      const correct = isTextInput
        ? textInput.trim().toLowerCase() === challenge.correctAnswerText?.toLowerCase()
        : selectedId === challenge.correctAnswerId;

      if (correct) {
        setStatus("correct");
        playCorrect();
        if (isBonus) solveBonus();
        const nav = window.setTimeout(
          () => navigate(isBonus ? "/success/bonus" : `/success/${digit}`),
          160
        );
        timers.current.push(nav);
      } else {
        setStatus("wrong");
        playWrong();
        setMisses((m) => m + 1);
        setWrongId(isTextInput ? "__text__" : selectedId);
        setToast("wrong");
        // Shake the wrong option first, then raise the full-screen miss.
        const rst = window.setTimeout(() => setShowMiss(true), WRONG_HOLD_MS);
        timers.current.push(rst);
      }
    }, CHECKING_MS);
    timers.current.push(t);
  };

  const busy = status === "checking" || status === "correct";

  return (
    <div className="relative flex-1 flex flex-col justify-between select-none">
      <ScreenHeader
        tone={isBonus ? "brass" : "red"}
        eyebrow={isBonus ? "Off the board" : "Cracking"}
        title={isBonus ? "Bonus Round" : `Digit ${digit}`}
        back
        right={<CountdownPill time={time} className="shadow-none" />}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col p-6 gap-5">
        {/* Progress Dots track (non-bonus only) */}
        {!isBonus && (
          <div className="flex justify-center">
            <ProgressDots total={9} current={digit} solved={unlockedVaults.map(Number)} className="w-full" />
          </div>
        )}

        {/* Question Title & Description */}
        <div className="relative">
          {/* Mascot thinking alongside the question, overlapping the card edge */}
          <div className="pointer-events-none absolute -right-4 -top-8 z-10 h-32 w-32 rotate-[5deg]">
            <Art name="mascot-thinking" alt="" className="h-full w-full object-contain" />
          </div>
          {/* pr-24 keeps the title out from under the mascot. The art used to
              occupy half its frame, so a 128px box only looked ~60px wide and
              long titles cleared it by accident. */}
          <span className="block pr-24 text-[11px] font-bold uppercase tracking-[0.2em] text-red-deep">
            CHALLENGE PUZZLE
          </span>
          <h1 className="mt-1 pr-24 text-[28px] font-extrabold uppercase leading-[0.95] tracking-tighter text-ink">
            {challenge.title}
          </h1>
          <p className="font-body text-base font-bold text-ink/75 leading-relaxed mt-3 bg-white ink rounded-card p-4 shadow-ink-sm rotate-[-1deg]">
            {challenge.question}
          </p>
        </div>

        {/* Inline Toast Notification */}
        <Toast
          isVisible={toast !== null}
          type={toast === "timeup" ? "info" : "error"}
          message={
            toast === "timeup"
              ? "Clock's out — the answer still counts."
              : MISS_LINES[Math.min(misses - 1, MISS_LINES.length - 1)] ?? MISS_LINES[0]
          }
          actionText="NUDGE?"
          onAction={() => {
            setToast(null);
            setHintOpen(true);
          }}
        />

        {/* Choices Layout */}
        <div className="grow flex flex-col justify-center my-2">
          {isTextInput ? (
            <motion.input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="TYPE YOUR ANSWER HERE"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              disabled={busy}
              variants={shakeVariants}
              animate={wrongId === "__text__" ? "shake" : "default"}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className={cn(
                "w-full text-center uppercase ink rounded-btn py-4 px-6 bg-white text-ink font-display font-bold text-[18px] tracking-wide placeholder:text-ink/30 shadow-ink focus:outline-none transition-colors",
                wrongId === "__text__" ? "border-red text-red shadow-[5px_5px_0_0_var(--color-red-deep)]" : ""
              )}
            />
          ) : (
            <motion.div
              // Re-keyed on the question so the options deal themselves in
              // again on every challenge, not just the first one.
              key={challenge.id}
              variants={listStagger}
              initial="initial"
              animate="animate"
              className={cn(
                challenge.type === "image_grid"
                  ? "grid grid-cols-2 gap-4"
                  : "flex flex-col gap-3"
              )}
            >
              {challenge.options?.map((opt) => (
                <motion.div key={opt.id} variants={riseIn}>
                  <AnswerOptionCard
                    label={opt.label}
                    isSelected={selectedId === opt.id}
                    isWrong={wrongId === opt.id}
                    disabled={busy}
                    onClick={() => {
                      setWrongId(null);
                      setToast(null);
                      setSelectedId(opt.id);
                    }}
                    variant={challenge.type === "image_grid" ? "image" : "text"}
                    icon={<span>{opt.glyph ?? challenge.glyph}</span>}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Submit CTA Block */}
      <div className="p-6 bg-white border-t-3 border-ink shrink-0">
        <PrimaryButton
          onClick={handleSubmit}
          disabled={!canSubmit || busy}
          variant={isBonus ? "reward" : "primary"}
          className="w-full"
        >
          {status === "checking"
            ? `${CHECKING_LINES[misses % CHECKING_LINES.length]}...`
            : "CRACK IT"}
        </PrimaryButton>
      </div>

      {/* ---- Full-screen miss. Approved over the inline-only rule because it
             gives the loss a beat, the way Duolingo does. ---- */}
      <AnimatePresence>
        {showMiss && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-50 flex flex-col bg-paper"
          >
            {/* A coloured plate, not a bare page. The screen was a small column
                of text floating in cream — the emptiness was the problem, not
                the wording. The plate also lets the mascot overlap something,
                which is what stops the layout reading as a stack of blocks. */}
            <div className="relative shrink-0 overflow-hidden rounded-b-[28px] bg-red px-6 pb-20 pt-9 text-center shadow-[0_4px_0_0_var(--color-ink)]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(115deg, rgba(255,255,255,0.14) 0 7px, transparent 7px 18px)",
                }}
              />
              <motion.h2
                initial={{ scale: 0.85, y: -8 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
                className="relative font-display text-[46px] uppercase leading-none tracking-tight text-white"
                style={{ textShadow: "0 4px 0 var(--color-ink)" }}
              >
                Not quite
              </motion.h2>
              <span className="relative mt-3 inline-block rounded-pill border-2 border-white/40 bg-red-deep px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                Attempt {misses + 1}
              </span>
            </div>

            {/* Mascot straddling the plate edge, large. */}
            <motion.div
              initial={{ scale: 0.7, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 18 }}
              className="pointer-events-none z-10 -mt-16 flex shrink-0 justify-center"
            >
              <Art name="mascot-sad" alt="" className="h-44 w-44 object-contain" />
            </motion.div>

            <div className="px-6">
              <div className="ink rotate-[-1deg] rounded-plate bg-white p-5 text-center shadow-ink">
                <p className="font-body text-[16px] font-bold leading-snug text-ink">
                  {MISS_LINES[Math.min(misses - 1, MISS_LINES.length - 1)] ?? MISS_LINES[0]}
                </p>
                {/* Redirect rather than punish — the miss costs nothing, and
                    saying so is what keeps a first-year tapping instead of
                    putting the phone down. */}
                <p className="mt-2 font-body text-[13px] font-semibold text-ink/55">
                  No digit lost. No time penalty. Just go again.
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3 p-6">
              <PrimaryButton
                className="h-16 w-full"
                onClick={() => {
                  setShowMiss(false);
                  setStatus("idle");
                  setWrongId(null);
                }}
              >
                TRY AGAIN
              </PrimaryButton>

              <Pressable
                className="h-14 w-full"
                onClick={() => { setShowMiss(false); setStatus("idle"); setWrongId(null); setHintOpen(true); }}
              >
                SHOW ME A NUDGE
              </Pressable>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint Modal */}
      <Modal isOpen={hintOpen} onClose={() => setHintOpen(false)}>
        <HintBulb className="mx-auto mb-2 h-24 w-24" />
        <h2 className="text-[26px] font-extrabold uppercase text-ink leading-tight">NEED A NUDGE?</h2>
        <p className="font-body text-base font-bold text-ink/70 leading-relaxed px-2">
          {challenge.hint}
        </p>
        <PrimaryButton onClick={() => setHintOpen(false)} variant="primary" className="w-full mt-2">
          GOT IT
        </PrimaryButton>
      </Modal>
    </div>
  );
}
