import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ProgressDots } from "../components/ProgressDots";
import { CountdownPill } from "../components/CountdownPill";
import { AnswerOptionCard } from "../components/AnswerOptionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { Toast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { Art } from "../components/Art";
import { HintBulb } from "../components/Props";
import { useGame } from "../context/GameContext";
import { playCorrect, playWrong } from "../lib/sound";
import { shakeVariants } from "../lib/motion";
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
      {/* Header Bar */}
      <header
        className={cn(
          "flex justify-between items-center p-4 border-b-3 border-ink shrink-0",
          isBonus ? "bg-yellow text-ink" : "bg-red text-white"
        )}
      >
        <Pressable
          onClick={() => navigate(-1)}
          aria-label="Back"
          icon
          className={isBonus ? "bg-paper-deep text-ink" : "bg-red-deep text-white"}
        >
          <ArrowLeft className="w-5 h-5" />
        </Pressable>
        <span className="font-display font-extrabold text-[18px] uppercase tracking-wide">
          {isBonus ? "Bonus Round" : `Digit ${digit}`}
        </span>
        <CountdownPill time={time} className="shadow-none" />
      </header>

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
          <div className="pointer-events-none absolute -right-3 -top-4 z-10 h-20 w-20 rotate-[5deg]">
            <Art name="mascot-thinking" alt="" className="h-full w-full object-contain" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-deep">
            CHALLENGE PUZZLE
          </span>
          <h1 className="text-[28px] font-extrabold uppercase leading-[0.95] tracking-tighter text-ink mt-1">
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
            <div
              className={cn(
                challenge.type === "image_grid"
                  ? "grid grid-cols-2 gap-4"
                  : "flex flex-col gap-3"
              )}
            >
              {challenge.options?.map((opt) => (
                <AnswerOptionCard
                  key={opt.id}
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
              ))}
            </div>
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
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-paper p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0.7, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 18 }}
              className="h-40 w-40"
            >
              <Art name="mascot-sad" alt="" className="h-full w-full object-contain" />
            </motion.div>

            <div>
              <h2 className="font-display text-[34px] uppercase leading-none tracking-tighter text-red">
                Not quite
              </h2>
              <p className="mt-2 font-body text-[15px] font-bold text-ink/65">
                {MISS_LINES[Math.min(misses - 1, MISS_LINES.length - 1)] ?? MISS_LINES[0]}
              </p>
            </div>

            <PrimaryButton
              className="w-full max-w-xs"
              onClick={() => {
                setShowMiss(false);
                setStatus("idle");
                setWrongId(null);
              }}
            >
              TRY AGAIN
            </PrimaryButton>

            <button
              type="button"
              onClick={() => { setShowMiss(false); setStatus("idle"); setWrongId(null); setHintOpen(true); }}
              className="font-body text-[14px] font-bold text-ink/50 underline underline-offset-4"
            >
              Show me a nudge
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint Modal */}
      <Modal isOpen={hintOpen} onClose={() => setHintOpen(false)}>
        <HintBulb className="mx-auto mb-2 h-16 w-16" />
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
