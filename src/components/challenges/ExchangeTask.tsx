import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../PrimaryButton";
import { ConnectTask } from "./ConnectTask";
import { useGame } from "../../context/GameContext";
import * as api from "../../lib/api";
import { riseIn } from "../../lib/motion";
import type { TaskProps } from "./types";

/**
 * Information Exchange — Bible §4.
 *
 * You hold one number. Your target holds the other. Neither of you can answer
 * alone, and the app enforces that literally: the other half is not in your
 * payload, not in the bundle, and not on the wire until confirm_connect() has
 * verified you actually met.
 *
 * So this component is two screens in sequence. Before the meeting it IS a
 * find-and-connect, because that is the only thing you can do. After it, the
 * arithmetic is trivial on purpose — Bible §9 asks that the answer be obvious
 * once the pieces are collected. The difficulty is the walk, not the sum.
 */
export function ExchangeTask({ challenge, submit, onCorrect, onWrong, busy }: TaskProps) {
  const { live } = useGame();
  const [theirs, setTheirs] = useState<number | null>(null);
  const [value, setValue] = useState("");

  const mine = challenge.payload?.mine ?? null;
  const symbol = challenge.payload?.symbol ?? "▲";

  // Watch for the handshake landing. The context refreshes the board every few
  // seconds and on every realtime nudge; this reads the confirmed interaction
  // that refresh implies, which is where the other half actually lives.
  useEffect(() => {
    if (!live || !challenge.assignmentId || theirs !== null) return;
    let stop = false;
    const check = async () => {
      try {
        const row = await api.myInteraction(challenge.assignmentId!);
        if (!stop && row?.fact?.value != null) setTheirs(Number(row.fact.value));
      } catch { /* transient — the poll below tries again */ }
    };
    void check();
    const t = setInterval(check, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [live, challenge.assignmentId, theirs]);

  const handleSubmit = async () => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return;
    const result = await submit({ value: n });
    if (result.correct) onCorrect();
    else onWrong();
  };

  /* ---- before the meeting -------------------------------------------- */
  if (theirs === null) {
    return (
      <div className="flex flex-col gap-5">
        {/* Your half, shown the whole time. It is the thing you will read out
            loud when you get there, so it must be legible mid-conversation and
            never scroll off. */}
        <motion.div
          variants={riseIn}
          initial="initial"
          animate="animate"
          className="ink rounded-plate bg-white p-5 text-center shadow-ink"
        >
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-red-deep">
            You are carrying
          </span>
          <div className="mt-1 font-display text-[44px] leading-none text-ink">
            {symbol} = {mine ?? "—"}
          </div>
          <p className="mt-2 font-body text-[13px] font-semibold text-ink/55">
            Useless on its own. Go and get the other half.
          </p>
        </motion.div>

        <ConnectTask key={challenge.assignmentId} challenge={challenge} />
      </div>
    );
  }

  /* ---- after the meeting --------------------------------------------- */
  return (
    <div className="flex flex-col gap-5">
      <motion.div
        variants={riseIn}
        initial="initial"
        animate="animate"
        className="ink rounded-plate bg-green p-5 text-center shadow-[0_6px_0_0_var(--color-green-deep)]"
      >
        <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
          Exchange complete
        </span>
        <div className="mt-2 font-display text-[38px] leading-none text-white"
             style={{ WebkitTextStroke: "2px var(--color-ink)" }}>
          {mine} + {theirs}
        </div>
      </motion.div>

      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="TOTAL"
        disabled={busy}
        className="ink w-full rounded-btn bg-white px-6 py-4 text-center font-display text-[24px] tracking-wide text-ink shadow-ink placeholder:text-ink/30 focus:outline-none"
      />

      <PrimaryButton className="w-full" disabled={!value || busy} onClick={handleSubmit}>
        CRACK IT
      </PrimaryButton>
    </div>
  );
}
