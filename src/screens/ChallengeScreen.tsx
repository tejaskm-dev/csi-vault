import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProgressDots } from "../components/ProgressDots";
import { CountdownPill } from "../components/CountdownPill";
import { AnswerOptionCard } from "../components/AnswerOptionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { Toast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { useGame } from "../context/GameContext";

/** How long the button sits in "checking" before resolving. Instant
 *  resolution reads as unjudged — the pause is what makes it feel scored. */
const CHECKING_MS = 400;
/** Matches the incorrect-answer shake the redesign will define. */
const WRONG_HOLD_MS = 360;

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
  const timers = useRef<number[]>([]);

  const isBonus = Boolean(challenge?.isBonus);
  const digit = isBonus ? 0 : parseInt(id ?? "1", 10);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Timer is informational — it never locks a player out mid-event.
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
      <div>
        <p>That challenge isn't in your set.</p>
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
        if (isBonus) solveBonus();
        const nav = window.setTimeout(
          () => navigate(isBonus ? "/success/bonus" : `/success/${digit}`),
          160
        );
        timers.current.push(nav);
      } else {
        // Inline state. Never a separate route.
        setStatus("wrong");
        setWrongId(isTextInput ? "__text__" : selectedId);
        setToast("wrong");
        const reset = window.setTimeout(() => {
          setStatus("idle");
          setWrongId(null);
        }, WRONG_HOLD_MS);
        timers.current.push(reset);
      }
    }, CHECKING_MS);
    timers.current.push(t);
  };

  const busy = status === "checking" || status === "correct";

  return (
    <div>
      {/* Bonus wears the same shell in a different colour — recognisable at a glance */}
      <header data-bonus={isBonus ? "true" : undefined}>
        <Pressable onClick={() => navigate(-1)} aria-label="Back">
          Back
        </Pressable>
        <span>{isBonus ? "Bonus Round" : `Digit ${digit}`}</span>
        <CountdownPill time={time} />
      </header>

      {!isBonus && (
        <ProgressDots total={9} current={digit} solved={unlockedVaults.map(Number)} />
      )}

      <h1>{challenge.title}</h1>
      <p>{challenge.question}</p>

      <Toast
        isVisible={toast !== null}
        type={toast === "timeup" ? "info" : "error"}
        message={toast === "timeup" ? "Time's up — you can still answer" : "Not quite"}
        actionText="Need a hint?"
        onAction={() => {
          setToast(null);
          setHintOpen(true);
        }}
      />

      {isTextInput ? (
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Type your answer"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          disabled={busy}
          data-wrong={wrongId === "__text__" ? "true" : undefined}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      ) : (
        <div>
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

      <PrimaryButton
        onClick={handleSubmit}
        disabled={!canSubmit || busy}
        variant={isBonus ? "reward" : "primary"}
      >
        {status === "checking" ? "CHECKING" : "SUBMIT ANSWER"}
      </PrimaryButton>

      <Modal isOpen={hintOpen} onClose={() => setHintOpen(false)} variant="bottomSheet">
        <h2>Here's a nudge</h2>
        <p>{challenge.hint}</p>
        <PrimaryButton onClick={() => setHintOpen(false)}>GOT IT</PrimaryButton>
      </Modal>
    </div>
  );
}
