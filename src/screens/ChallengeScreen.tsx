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
import { ObserveTask } from "../components/challenges/ObserveTask";
import { ConnectTask } from "../components/challenges/ConnectTask";
import { ExchangeTask } from "../components/challenges/ExchangeTask";
import { RecallTask } from "../components/challenges/RecallTask";
import { PhotoTask } from "../components/challenges/PhotoTask";
import { CharadesTask } from "../components/challenges/CharadesTask";
import { Minigame } from "../minigames";
import { useGame } from "../context/GameContext";
import { playCorrect, playWrong } from "../lib/sound";
import { useReactions, triggerForSolve } from "../lib/reactions";
import { humanError } from "../lib/errors";
import { SOCIAL_TYPES, type ChallengeType } from "../data/mockData";
import {
  shakeVariants,
  listStagger,
  riseIn,
  screenChoreo,
  dropIn,
  popIn,
} from "../lib/motion";
import { cn } from "../lib/utils";
import { revealElement } from "../lib/scroll";

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

/**
 * Kinds that supply their own commit control.
 *
 * The three original kinds share one CRACK IT bar pinned to the bottom, and
 * that is right for them — pick an option, commit it. The rest cannot use it:
 * a colour trap is committed by the tap itself, a photo task by a camera
 * button, and a find-and-connect has nothing to commit until somebody else's
 * phone says so. Showing a dead CRACK IT under those is worse than showing
 * none, so the bar is conditional on this set.
 */
const OWNS_COMMIT: ReadonlySet<ChallengeType> = new Set<ChallengeType>([
  "observe",
  "connect",
  "exchange",
  "recall",
  "photo",
  "minigame",
  "charades",
]);

export function ChallengeScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getChallenge, unlockedVaults, solveBonus, submit, streak, challenges } = useGame();
  const { fire } = useReactions();

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
  /** A request that failed, as opposed to an answer that was wrong. */
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  const isBonus = Boolean(challenge?.isBonus);
  const digit = isBonus ? 0 : parseInt(id ?? "1", 10);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /**
   * Wipe the per-question state when the question changes.
   *
   * Steps inside one vault navigate to the SAME path — /challenge/2 step 1 and
   * step 2 are both "/challenge/2" — so React never unmounts this screen and
   * every piece of local state survived into the next question. The previous
   * answer stayed selected, CRACK IT stayed enabled, and one tap submitted a
   * stale option for a question the player had not read.
   *
   * Keyed on assignmentId, which is unique per question per player, rather
   * than on the route, which is exactly what failed to change.
   */
  useEffect(() => {
    setSelectedId(null);
    setTextInput("");
    setWrongId(null);
    setToast(null);
    setStatus("idle");
    setMisses(0);
    setShowMiss(false);
    setSubmitError(null);
    setHintOpen(false);
    setTime(challenge?.timeLimit ?? 45);
  }, [challenge?.assignmentId]);

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

  /**
   * The win beat, shared by every kind however it got here.
   *
   * `vaultComplete` decides where it lands. A vault of three challenges should
   * play the unlock celebration once — on the third — not three times. Solving
   * an earlier step drops the player back on the vault, which re-resolves to
   * the next unsolved challenge in the stage.
   */
  const win = (vaultComplete = true) => {
    setStatus("correct");
    playCorrect();
    if (isBonus) solveBonus();

    // The reaction is chosen from what actually happened — how fast, how many
    // in a row, whether this was the ninth. `fire` rate-limits itself, so a
    // player who triggers three of these in quick succession sees one.
    const spent = (challenge.timeLimit ?? 45) - time;
    const trigger = triggerForSolve({
      seconds: spent,
      streak: streak + 1, // submit() has not re-rendered this yet
      isBonus,
      allDone: !isBonus && unlockedVaults.length + 1 >= 9,
    });
    if (trigger) fire(trigger);

    const nav = window.setTimeout(() => {
      if (!vaultComplete && !isBonus) {
        // More steps left in this stage. Straight back to the vault, which
        // hands out the next one.
        navigate(`/challenge/${digit}`, { replace: true });
        return;
      }
      navigate(isBonus ? "/success/bonus" : `/success/${digit}`);
    }, 160);
    timers.current.push(nav);
  };

  /** The miss beat, likewise. */
  const miss = (which: string | null) => {
    setStatus("wrong");
    playWrong();
    const n = misses + 1;
    setMisses(n);
    setWrongId(which);
    setToast("wrong");
    // Three in a row is the "are you okay" moment, and the one place a joke
    // genuinely helps — it reframes a run of failure as part of the bit.
    if (n >= 3) fire("miss_3");
    // Shake the wrong option first, then raise the full-screen miss.
    const rst = window.setTimeout(() => setShowMiss(true), WRONG_HOLD_MS);
    timers.current.push(rst);
  };

  /**
   * Vaults are strictly sequential, and the board is not the only way in — a
   * player can type /challenge/7 or hit back into one they are not up to yet.
   * Bounce them to the board rather than letting them play out of order and
   * skip the tutorial ramp.
   */
  useEffect(() => {
    if (isBonus) return;
    const solvedCount = unlockedVaults.length;
    const alreadyDone = unlockedVaults.includes(String(digit));
    if (!alreadyDone && digit > solvedCount + 1) {
      navigate("/vault", { replace: true });
    }
  }, [digit, isBonus, unlockedVaults, navigate]);

  /**
   * Connect and photo challenges are completed by something that is not a tap
   * on this screen — the other player's phone, or an upload finishing. Both
   * land as `solved` on the next board refresh, and this is where that turns
   * into the same unlock the other seven vaults get.
   *
   * Sits above the missing-challenge guard below because hooks cannot run
   * after a conditional return.
   */
  useEffect(() => {
    if (challenge?.solved && status !== "correct") {
      // Reached here by something other than a tap — a partner confirming, or
      // an upload finishing. Work out whether that closed the vault.
      const siblings = challenges.filter(
        (c) => c.slot === challenge.slot && c.assignmentId !== challenge.assignmentId
      );
      win(siblings.every((c) => c.solved));
    }
    // `win` is recreated every render and stable in behaviour; depending on it
    // would re-fire the navigation timer on each refresh tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge?.solved]);

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
  const ownsCommit = OWNS_COMMIT.has(challenge.type);
  /** How many challenges this vault holds. 1 on a pre-stage board. */
  const stageTotal = challenges.filter((c) => c.slot === challenge.slot).length || 1;

  /**
   * Hand the answer over and render the verdict.
   *
   * The 400ms pause is theatre and worth keeping — an instant flip from tap to
   * green reads as "the app already knew", which is exactly what it used to be
   * doing. Live, the round trip usually fills most of that window anyway.
   */
  const commit = async (answer: Record<string, unknown>, wrongKey: string | null) => {
    setToast(null);
    setWrongId(null);
    setSubmitError(null);
    setStatus("checking");

    const started = Date.now();
    try {
      const result = await submit(challenge, answer);
      const remaining = Math.max(0, CHECKING_MS - (Date.now() - started));
      const t = window.setTimeout(() => {
        if (result.correct) win(result.vaultComplete !== false);
        else miss(wrongKey);
      }, remaining);
      timers.current.push(t);
      return result;
    } catch (e) {
      // A failed request is not a wrong answer — but silence is worse than
      // either. This used to reset to idle and say NOTHING, so an RPC error
      // looked exactly like a dead button: the player taps SUBMIT, the screen
      // twitches, and nothing happens. Forever. That is how the tumbler bug
      // hid for a whole build.
      setStatus("idle");
      setSubmitError(humanError(e, "That did not go through. Try again."));
      console.error("[vault] submit failed", e);
      return { correct: false, solved: false };
    }
  };

  const handleSubmit = () => {
    if (!canSubmit || status === "checking" || status === "correct") return;
    void commit(
      isTextInput ? { text: textInput.trim() } : { option: selectedId },
      isTextInput ? "__text__" : selectedId
    );
  };

  const busy = status === "checking" || status === "correct";

  /** Props shared by every task component. */
  const taskProps = {
    challenge,
    busy,
    submit: (answer: Record<string, unknown>) => commit(answer, null),
    onCorrect: () => {},   // commit() already ran the win beat
    onWrong: () => {},     // …and the miss beat
  };

  return (
    <div className="relative flex-1 flex flex-col justify-between select-none">
      <ScreenHeader
        tone={isBonus ? "brass" : "red"}
        eyebrow={isBonus ? "Off the board" : "Cracking"}
        title={
          isBonus
            ? "Bonus Round"
            : challenge?.vaultLabel
            ? challenge.vaultLabel
            : `Digit ${digit}`
        }
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
          {/* The mascot sits BEHIND the question card (z-0 against the card's
              z-10), so it peeks over the top edge and can never cover a word.
              Padding alone could not fix this: the card wraps to two or three
              lines depending on the question, so any reserved gutter is either
              wasted on short questions or too small on long ones. Occlusion
              is the only version that is right for all eighteen. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 17, delay: 0.1 }}
            className="pointer-events-none absolute -right-3 -top-10 z-0 h-[min(8rem,14vh)] w-[min(8rem,14vh)]"
          >
            <Art priority name="mascot-thinking" alt="" className="h-full w-full object-contain" />
          </motion.div>

          {/* pr-32, not pr-24. The mascot is 128px wide sitting at -right-3,
              so it covers the rightmost 116px of the row — a 96px gutter left
              it clipping the last letter of a long title like SPOT THE MATCH. */}
          {/* The eyebrow now carries the one thing a player needs to know
              before reading the question: can I do this sitting down? A board
              that mixes puzzles and go-and-talk-to-someone tasks is confusing
              until that distinction is legible at a glance. */}
          <span className="relative z-10 block pr-32 text-[11px] font-bold uppercase tracking-[0.2em] text-red-deep">
            {SOCIAL_TYPES.has(challenge.type) ? "ON YOUR FEET" : "CHALLENGE PUZZLE"}
            {/* Where you are inside the stage. Without this a three-part vault
                feels like the app forgot you already solved something —
                you answer, the screen changes, and the tile is still shut. */}
            {stageTotal > 1 && (
              <span className="ml-2 text-ink/40">
                · STEP {challenge.step ?? 1} OF {stageTotal}
              </span>
            )}
          </span>
          <h1 className="relative z-10 mt-1 pr-32 text-[26px] font-extrabold uppercase leading-[0.95] tracking-tighter text-ink">
            {challenge.title}
          </h1>
          <p className="relative z-10 mt-3 rotate-[-1deg] rounded-card bg-white p-4 font-body text-base font-bold leading-relaxed text-ink/75 ink shadow-ink-sm">
            {challenge.question}
          </p>
        </div>

        {submitError && (
          <div className="rounded-btn border-3 border-ink bg-red px-4 py-3 text-center">
            <p className="font-body text-[13px] font-bold text-white">{submitError}</p>
          </div>
        )}

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
          {challenge.type === "observe" ? (
            <ObserveTask {...taskProps} />
          ) : challenge.type === "connect" ? (
            <ConnectTask challenge={challenge} />
          ) : challenge.type === "exchange" ? (
            <ExchangeTask {...taskProps} />
          ) : challenge.type === "recall" ? (
            <RecallTask {...taskProps} />
          ) : challenge.type === "photo" ? (
            <PhotoTask challenge={challenge} />
          ) : challenge.type === "charades" ? (
            <CharadesTask challenge={challenge} />
          ) : challenge.type === "minigame" ? (
            <Minigame
              game={challenge.payload?.game ?? "tumbler"}
              // Seeded server-side at deal time. Two players get different
              // puzzles, the same player gets the same one back after a
              // refresh, and the server can regenerate it to grade the answer.
              seed={challenge.payload?.seed ?? 1}
              level={challenge.payload?.level ?? 1}
              payload={challenge.payload}
              busy={busy}
              onSubmit={taskProps.submit}
            />
          ) : isTextInput ? (
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
                      // Four image options push CRACK IT below the fold, so
                      // picking one used to leave the player looking at a
                      // selected card and no visible way to commit it.
                      // revealElement no-ops when it is already on screen.
                      requestAnimationFrame(() => revealElement(ctaRef.current, 12));
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

      {/* Submit CTA Block — only for the kinds that do not carry their own.
          See OWNS_COMMIT. */}
      {!ownsCommit && (
        <div ref={ctaRef} className="p-6 bg-white border-t-3 border-ink shrink-0">
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
      )}

      {/* ---- Full-screen miss. Approved over the inline-only rule because it
             gives the loss a beat, the way Duolingo does. ---- */}
      <AnimatePresence>
        {showMiss && (
          <motion.div
            variants={screenChoreo}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="absolute inset-0 z-50 flex flex-col bg-paper"
          >
            {/* Sequenced by stability: the plate lands first because it is the
                most fixed thing here, and TRY AGAIN lands last because that is
                where attention should finish. Everything arriving at once is
                what made this read as a page load rather than a beat. */}
            <motion.div
              variants={dropIn}
              className="relative shrink-0 overflow-hidden rounded-b-[28px] bg-red px-6 pb-20 pt-9 text-center shadow-[0_4px_0_0_var(--color-ink)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(115deg, rgba(255,255,255,0.14) 0 7px, transparent 7px 18px)",
                }}
              />
              <h2
                className="relative font-display text-[46px] uppercase leading-none tracking-tight text-white"
                style={{ textShadow: "0 4px 0 var(--color-ink)" }}
              >
                Not quite
              </h2>
              <span className="relative mt-3 inline-block rounded-pill border-2 border-white/40 bg-red-deep px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                Attempt {misses + 1}
              </span>
            </motion.div>

            {/* The middle region centres itself in whatever space is left, so
                the slack is shared above and below instead of collecting into
                one dead gap above the buttons. */}
            <div className="flex flex-1 flex-col justify-center gap-1 px-6">
              <motion.div
                variants={popIn}
                className="pointer-events-none z-10 -mt-24 flex shrink-0 justify-center"
              >
                <Art name="mascot-sad" alt="" className="h-[min(13rem,22vh)] w-[min(13rem,22vh)] object-contain" />
              </motion.div>

              <motion.div
                variants={riseIn}
                style={{ rotate: -1 }}
                className="ink -mt-2 rounded-plate bg-white p-5 text-center shadow-ink"
              >
                <p className="font-body text-[17px] font-bold leading-snug text-ink">
                  {MISS_LINES[Math.min(misses - 1, MISS_LINES.length - 1)] ?? MISS_LINES[0]}
                </p>
                {/* Redirect rather than punish — the miss costs nothing, and
                    saying so is what keeps a first-year tapping instead of
                    putting the phone down. */}
                <p className="mt-2 font-body text-[13px] font-semibold text-ink/55">
                  No digit lost. No time penalty. Just go again.
                </p>
              </motion.div>
            </div>

            <motion.div variants={riseIn} className="flex flex-col gap-3 p-6">
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
            </motion.div>
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
