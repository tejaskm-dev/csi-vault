import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Lightbulb,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ProgressDots } from "../components/ProgressDots";
import { CountdownPill } from "../components/CountdownPill";
import { AnswerOptionCard } from "../components/AnswerOptionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { Toast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { Mascot } from "../components/art/Mascot";
import { GLYPHS } from "../components/art/Glyphs";
import { useGame } from "../context/GameContext";
import { soundSelect, soundCorrect, soundWrong, isMuted, toggleMute } from "../lib/sound";
import { cn } from "../lib/utils";
import { SHAKE_TOTAL_MS } from "../lib/motion";

const CHECKING_MS = 400;

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
  const [muted, setMuted] = useState(() => isMuted());
  const timers = useRef<number[]>([]);

  const isBonus = Boolean(challenge?.isBonus);
  const digit = isBonus ? 0 : parseInt(id ?? "1", 10);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const handleMuteToggle = () => {
    const next = toggleMute();
    setMuted(next);
  };

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
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-[15px] text-muted">That challenge isn't in your set.</p>
        <PrimaryButton onClick={() => navigate("/vault")} className="max-w-xs">
          BACK TO VAULT
        </PrimaryButton>
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
        ? textInput.trim().toLowerCase() ===
          challenge.correctAnswerText?.toLowerCase()
        : selectedId === challenge.correctAnswerId;

      if (correct) {
        setStatus("correct");
        soundCorrect();
        if (isBonus) solveBonus();
        const nav = window.setTimeout(
          () => navigate(isBonus ? "/success/bonus" : `/success/${digit}`),
          160
        );
        timers.current.push(nav);
      } else {
        setStatus("wrong");
        soundWrong();
        setWrongId(isTextInput ? "__text__" : selectedId);
        setToast("wrong");
        const reset = window.setTimeout(() => {
          setStatus("idle");
          setWrongId(null);
        }, SHAKE_TOTAL_MS);
        timers.current.push(reset);
      }
    }, CHECKING_MS);
    timers.current.push(t);
  };

  const busy = status === "checking" || status === "correct";
  const mascotAccessory = challenge.glyph === "headphones" ? "headphones" : "none";

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className={cn(
          "sticky top-0 z-10 flex items-center justify-between px-3 py-3 shadow-soft",
          isBonus ? "bg-reward-yellow text-charcoal" : "bg-csi-red text-white"
        )}
      >
        <div className="flex items-center gap-2">
          <Pressable
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-14 w-14 rounded-pill"
          >
            <ArrowLeft className="h-6 w-6" />
          </Pressable>
          <Pressable
            onClick={handleMuteToggle}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            className="h-14 w-14 rounded-pill"
          >
            {muted ? <VolumeX className="h-5 w-5 opacity-70" /> : <Volume2 className="h-5 w-5" />}
          </Pressable>
        </div>

        <span className="font-display text-base font-black uppercase tracking-wide">
          {isBonus ? "Bonus Round" : `Digit ${digit}`}
        </span>
        <CountdownPill time={time} />
      </header>

      <div className="flex flex-1 flex-col px-5 pb-6 pt-4">
        {!isBonus && (
          <div className="mb-3">
            <ProgressDots
              total={9}
              current={digit}
              solved={unlockedVaults.map(Number)}
            />
          </div>
        )}

        <div className="mb-3 text-center">
          <h1 className="mb-1 font-display text-[26px] font-black uppercase leading-tight">
            {challenge.title}
          </h1>
          <p className="text-[16px] leading-snug text-charcoal/70">
            {challenge.question}
          </p>
        </div>

        {/* Mascot sits between question and options with +3deg tilt and negative bottom margin */}
        <div className="relative z-20 my-1 flex justify-center -mb-4">
          <Mascot className="h-32 w-32" pose="think" accessory={mascotAccessory} tilt={3} />
        </div>

        <div className="mt-auto">
          <Toast
            isVisible={toast !== null}
            type={toast === "timeup" ? "info" : "error"}
            message={
              toast === "timeup" ? "Time's up — you can still answer" : "Not quite"
            }
            actionText="Need a hint?"
            onAction={() => {
              setToast(null);
              setHintOpen(true);
            }}
          />

          {isTextInput ? (
            <motion.div
              animate={wrongId === "__text__" ? { x: [0, -7, 7, -7, 7, -7, 7, 0] } : { x: 0 }}
              transition={{ duration: SHAKE_TOTAL_MS / 1000, ease: "linear" }}
              className="mb-5"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your answer"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                disabled={busy}
                className={cn(
                  "tap w-full rounded-btn border-2 bg-white px-4 text-center text-lg font-bold outline-none transition-colors shadow-chunk-white",
                  wrongId === "__text__"
                    ? "border-csi-red bg-red-tint text-csi-red shadow-chunk-red"
                    : "border-transparent focus:border-csi-red"
                )}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </motion.div>
          ) : (
            <div className="mb-5 grid grid-cols-2 gap-3">
              {challenge.options?.map((opt) => {
                const OptionGlyph = opt.glyph ? GLYPHS[opt.glyph] : GLYPHS[challenge.glyph];
                return (
                  <AnswerOptionCard
                    key={opt.id}
                    label={opt.label}
                    isSelected={selectedId === opt.id}
                    isWrong={wrongId === opt.id}
                    disabled={busy}
                    onClick={() => {
                      soundSelect();
                      setWrongId(null);
                      setToast(null);
                      setSelectedId(opt.id);
                    }}
                    variant="image"
                    icon={OptionGlyph ? <OptionGlyph className="h-8 w-8" /> : undefined}
                  />
                );
              })}
            </div>
          )}

          <PrimaryButton
            onClick={handleSubmit}
            disabled={!canSubmit || busy}
            variant={status === "correct" ? "secondary" : isBonus ? "reward" : "primary"}
            className="h-16 text-xl"
          >
            {status === "checking" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                CHECKING
              </>
            ) : status === "correct" ? (
              "CORRECT!"
            ) : (
              "SUBMIT ANSWER"
            )}
          </PrimaryButton>
        </div>
      </div>

      <Modal isOpen={hintOpen} onClose={() => setHintOpen(false)} variant="bottomSheet">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-pill bg-yellow-tint text-reward-yellow shadow-chunk-yellow">
            <Lightbulb className="h-8 w-8" fill="currentColor" />
          </div>
          <h2 className="mb-2 font-display text-2xl font-black">Here's a nudge</h2>
          <p className="mb-7 text-[17px] text-muted">{challenge.hint}</p>
          <PrimaryButton onClick={() => setHintOpen(false)}>GOT IT</PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
