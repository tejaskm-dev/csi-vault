import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Medal, Trophy, MysteryBox } from "../components/Props";
import { Safe } from "../components/Safe";
import { RayBurst, Laurel, RankDelta, Halftone, Sparkline } from "./DisplayArt";
import { useHall } from "./useHall";
import { cn, formatClock } from "../lib/utils";

/**
 * THE HALL DISPLAY.
 *
 * Projected from a laptop onto a screen, which changes almost every rule the
 * phone screens work under:
 *
 *   READ DISTANCE, NOT SCREEN SIZE. Everything is sized in vw/vh, because what
 *   matters is type size relative to the projected image, not pixels.
 *
 *   NOBODY TOUCHES IT. No hover, no controls, no scrolling. Everything is on
 *   screen at once, which is why the board caps at ten and the other
 *   forty-eight players become counters.
 *
 *   IT RUNS FOR TWENTY MINUTES. Something is always moving — the halo turns,
 *   the marquee scrolls, counters roll, the leader breathes. All transform and
 *   opacity, so a laptop driving a projector for a whole event never drops the
 *   frame rate.
 *
 *   MOVEMENT IS THE STORY. Broadcast overlays live on "what just happened":
 *   rank arrows, a row that flashes when it scores, a sparkline of the room
 *   accelerating. Position alone is a table; position plus movement is an
 *   event. The first version had no way to express any of it.
 *
 * The marquee is a genuine continuous scroll rather than a list of entries
 * appearing and leaving — that is the difference between a ticker and a log.
 */

const BOARD_SIZE = 10;
const EXPO: [number, number, number, number] = [0.76, 0, 0.24, 1];

export function Display() {
  const { ranked, stats, events, deltas, history } = useHall();
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const podium = ranked.slice(0, 3);
  const board = ranked.slice(0, BOARD_SIZE);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-paper">
      {/* ── Depth stack ─────────────────────────────────────────
          Flat cream on a four-metre screen looks like an unpainted wall. Three
          cheap static layers give it somewhere to sit: a halftone field, the
          blueprint grid, and two big slow shapes drifting behind everything. */}
      <Halftone className="pointer-events-none absolute inset-0 opacity-[0.045]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-plot) 1px, transparent 1px), linear-gradient(90deg, var(--color-plot) 1px, transparent 1px)",
          backgroundSize: "3vw 3vw",
        }}
      />
      <Drifter />

      <Band players={stats.players} clock={clock} />

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1 gap-[1.8vw] px-[2.2vw] py-[1.8vh]">
        <div className="flex w-[29%] shrink-0 flex-col gap-[1.6vh]">
          <Podium top={podium} />
          <RoomPanel stats={stats} history={history} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-[1.1vh] flex items-baseline justify-between">
            <span
              className="font-display uppercase tracking-[0.18em] text-ink/45"
              style={{ fontSize: "1vw" }}
            >
              The board
            </span>
            <span className="font-readout font-bold text-ink/35" style={{ fontSize: "0.9vw" }}>
              TOP {BOARD_SIZE} OF {stats.players}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-between gap-[0.75vh]">
            {board.map((p, i) => (
              <BoardRow key={p.id} rank={i + 1} player={p} delta={deltas[p.id] ?? 0} />
            ))}
          </div>
        </div>
      </div>

      <Marquee events={events} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Two large shapes drifting behind everything, very slowly. */
function Drifter() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="spin-layer absolute -left-[8vw] top-[12vh] opacity-[0.04]"
        style={{ width: "26vw", height: "26vw" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 190, repeat: Infinity, ease: "linear" }}
      >
        <RayBurst color="#1F1F1F" deep="#1F1F1F" spokes={26} />
      </motion.div>
      <motion.div
        className="spin-layer absolute -right-[10vw] bottom-[8vh] opacity-[0.035]"
        style={{ width: "34vw", height: "34vw" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 240, repeat: Infinity, ease: "linear" }}
      >
        <RayBurst color="#1F1F1F" deep="#1F1F1F" spokes={18} />
      </motion.div>
    </div>
  );
}

function Band({ players, clock }: { players: number; clock: number }) {
  return (
    <header className="relative z-20 flex shrink-0 items-center justify-between overflow-hidden bg-red px-[2.2vw] py-[1.3vh] shadow-[0_0.5vh_0_0_var(--color-ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #FFFFFF 0 10px, transparent 10px 26px)",
        }}
      />
      {/* items-center, not items-baseline: baseline-aligning a small badge to a
          3vw wordmark drops it to the bottom of the type rather than sitting it
          against the block. */}
      <div className="relative flex items-center gap-[1.2vw]">
        <span
          className="font-display uppercase leading-none text-white"
          style={{ fontSize: "3vw", textShadow: "0 0.45vh 0 var(--color-ink)" }}
        >
          Operation Vault
        </span>
        <span
          className="flex items-center justify-center rounded-pill border-2 border-white/40 bg-red-deep px-[0.9vw] py-[0.5vh] font-body font-bold uppercase text-white/90"
          style={{ fontSize: "0.8vw", lineHeight: 1 }}
        >
          {/* Letter-spacing is added AFTER the last character too, so tracked
              text inside a centred box always sits left of centre by half the
              tracking. Pulling the same amount back off the right edge is the
              fix — this is why the chip looked off despite being centred. */}
          <span style={{ letterSpacing: "0.22em", marginRight: "-0.22em" }}>CSI ASIET</span>
        </span>
      </div>

      <div className="relative flex items-center gap-[1.5vw]">
        <span
          className="flex items-center gap-[0.5vw] rounded-pill border-2 border-white bg-ink px-[0.9vw] py-[0.5vh] font-body font-bold uppercase text-white"
          style={{ fontSize: "0.8vw" }}
        >
          <span className="relative flex h-[0.65vw] w-[0.65vw]">
            <span className="absolute inset-0 animate-ping rounded-pill bg-green opacity-70" />
            <span className="relative h-full w-full rounded-pill bg-green" />
          </span>
          <span style={{ letterSpacing: "0.2em", marginRight: "-0.2em" }}>Live</span>
        </span>
        <BandStat value={String(players)} label="In play" />
        <BandStat value={formatClock(clock)} label="Elapsed" />
      </div>
    </header>
  );
}

function BandStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-end leading-none">
      <span
        className="font-readout font-bold text-white"
        style={{ fontSize: "1.8vw", fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
      <span
        className="mt-[0.35vh] font-body font-bold uppercase tracking-[0.22em] text-white/55"
        style={{ fontSize: "0.65vw" }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * THE PODIUM — all three visible, focus rotating between them.
 *
 * A single leader card told the room one name and hid the race. Three cards
 * with a rotating focus keeps every contender on screen while still having a
 * clear subject: the focused card grows and shows the full treatment (halo,
 * trophy, their nine safes), the other two stay compact.
 *
 * The skin follows the RANK, not the focus — gold, silver, bronze — so the
 * colour always tells you which position you are looking at even as the sizes
 * change. Framer's `layout` animates the resize, so focus moving is one smooth
 * redistribution rather than three cards popping.
 */
const FOCUS_MS = 7000;
/** How long a manual pick holds before the rotation resumes. */
const RESUME_MS = 20000;

const SKIN = {
  1: { bg: "bg-brass", face: "#FFFFFF", label: "Leading" },
  2: { bg: "bg-[#E6E9F0]", face: "#FFFFFF", label: "Second" },
  3: { bg: "bg-[#F2DEC9]", face: "#FFFFFF", label: "Third" },
} as const;

/**
 * Focused card big across the top, the other two side by side beneath it.
 *
 * All three cards are permanent children of ONE grid; focus only changes which
 * grid area each is assigned to. That is what makes the switch a physical
 * move — Framer's `layout` sees the same element land in a different box and
 * travels it there. Rendering the focused one in a separate container from the
 * other two would unmount and remount them on every switch, and there is
 * nothing to animate between an element that died and one that was born.
 *
 * Auto-rotates, but every card is also a button, and 1/2/3 and the arrow keys
 * work — an operator driving the projector should not have to wait seven
 * seconds for the card they want. A manual pick pauses the rotation for twenty
 * seconds rather than killing it, so an untouched laptop still cycles.
 */
function Podium({ top }: { top: ReturnType<typeof useHall>["ranked"] }) {
  const [focus, setFocus] = useState(0);
  const [auto, setAuto] = useState(true);
  const resume = useRef<number | undefined>(undefined);

  const pick = (i: number) => {
    setFocus(i);
    setAuto(false);
    window.clearTimeout(resume.current);
    resume.current = window.setTimeout(() => setAuto(true), RESUME_MS);
  };

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setFocus((f) => (f + 1) % 3), FOCUS_MS);
    return () => clearInterval(id);
  }, [auto]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "3") pick(Number(e.key) - 1);
      else if (e.key === "ArrowRight") pick((focus + 1) % 3);
      else if (e.key === "ArrowLeft") pick((focus + 2) % 3);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  useEffect(() => () => window.clearTimeout(resume.current), []);

  // The two unfocused cards keep their rank order left to right, so the small
  // slots do not swap sides for no reason as focus moves.
  const others = [0, 1, 2].filter((i) => i !== focus);
  const area = (i: number) => (i === focus ? "big" : i === others[0] ? "l" : "r");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[0.8vh]">
      <div
        className="grid min-h-0 flex-1 gap-[0.8vh]"
        style={{
          gridTemplateAreas: '"big big" "l r"',
          gridTemplateRows: "2.7fr 1fr",
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        {[0, 1, 2].map((i) => {
          const p = top[i];
          if (!p) return null;
          return (
            <PodiumCard
              key={p.id}
              rank={(i + 1) as 1 | 2 | 3}
              player={p}
              focused={i === focus}
              area={area(i)}
              onPick={() => pick(i)}
            />
          );
        })}
      </div>

      {/* Manual control, and a visible read of which card is up. */}
      <div className="flex shrink-0 items-center justify-center gap-[0.5vw]">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => pick(i)}
            aria-label={`Show rank ${i + 1}`}
            className={cn(
              "ink cursor-pointer rounded-pill transition-[width,background-color] duration-300",
              i === focus ? "bg-ink" : "bg-ink/15"
            )}
            style={{ height: "0.55vh", width: i === focus ? "2.6vw" : "1vw" }}
          />
        ))}
        {!auto && (
          <span
            className="ml-[0.4vw] font-body font-bold uppercase tracking-[0.16em] text-ink/30"
            style={{ fontSize: "0.55vw" }}
          >
            manual
          </span>
        )}
      </div>
    </div>
  );
}

function PodiumCard({
  rank,
  player,
  focused,
  area,
  onPick,
}: {
  rank: 1 | 2 | 3;
  player: ReturnType<typeof useHall>["ranked"][number];
  focused: boolean;
  area: string;
  onPick: () => void;
}) {
  const skin = SKIN[rank];

  return (
    <motion.div
      layout
      onClick={onPick}
      role="button"
      tabIndex={0}
      aria-label={`Rank ${rank}, ${player.name}`}
      style={{ gridArea: area }}
      transition={{ type: "spring", stiffness: 190, damping: 26 }}
      className={cn(
        "ink relative flex min-h-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-plate px-[1vw] shadow-[0_0.8vh_0_0_var(--color-ink)]",
        skin.bg
      )}
    >
      {/* Halo, focused card only — three spinning haloes at once would be
          noise, and the point of focus is that only one thing has it. */}
      <AnimatePresence>
        {focused && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              className="spin-layer absolute opacity-[0.22]"
              style={{ width: "180%", height: "180%" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
            >
              <RayBurst color={skin.face} deep={skin.face} spokes={20} />
            </motion.div>
            <span
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(255,255,255,0.4), rgba(255,255,255,0) 72%)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score burst — fires on the focused card when its player unlocks. */}
      <AnimatePresence>
        {player.justScored && (
          <motion.div
            aria-hidden
            key="burst"
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.95, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: "60%", aspectRatio: "1" }}
          >
            <RayBurst color="#FFFFFF" deep="#FFFFFF" spokes={16} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Focused layout ─────────────────────────────────────── */}
      {focused ? (
        <>
          {/* Two nested motion elements on purpose. The outer holds the idle
              float; the inner does the full turn as the card takes focus.
              Putting both on one element means the loop and the float fight
              over the same transform and neither reads cleanly. */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ y: { duration: 4.2, repeat: Infinity, ease: "easeInOut" } }}
            className="spin-layer relative"
            style={{ width: "5.6vw", height: "5.6vw" }}
          >
            <motion.div
              // Keyed on the player so the turn replays every time this card
              // becomes the focused one, not just on first mount.
              key={player.id}
              initial={{ rotate: -180, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 170, damping: 17 }}
              className="h-full w-full"
            >
              {rank === 1 ? <Trophy className="h-full w-full" /> : <Medal rank={rank} />}
            </motion.div>
          </motion.div>

          <span
            className="relative mt-[0.5vh] font-body font-bold uppercase text-ink/55"
            style={{ fontSize: "0.75vw" }}
          >
            <span style={{ letterSpacing: "0.28em", marginRight: "-0.28em" }}>{skin.label}</span>
          </span>

          <div className="relative mt-[0.3vh] flex w-full items-center justify-center gap-[0.5vw]">
            <span className="shrink-0" style={{ width: "1.8vw", height: "2.5vw" }}>
              <Laurel />
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={player.id}
                initial={{ y: "55%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-55%", opacity: 0 }}
                transition={{ duration: 0.5, ease: EXPO }}
                className="block min-w-0 flex-1 truncate text-center font-display uppercase leading-none text-ink"
                style={{ fontSize: "2vw", textShadow: "0 0.28vh 0 rgba(255,255,255,0.5)" }}
              >
                {player.name}
              </motion.span>
            </AnimatePresence>
            <span className="shrink-0" style={{ width: "1.8vw", height: "2.5vw" }}>
              <Laurel flip />
            </span>
          </div>

          <div className="relative mt-[0.6vh] flex items-baseline gap-[0.3vw]">
            <Odometer value={player.digits} size="2.6vw" />
            <span className="font-readout font-bold text-ink/40" style={{ fontSize: "1.1vw" }}>
              / 9
            </span>
          </div>

          {/* Their board. The Safe component owns its own open sequence, so a
              digit landing here plays the real door swing rather than a
              colour change. */}
          <div className="relative mt-[0.8vh] grid w-full grid-cols-9 gap-[0.24vw]">
            {Array.from({ length: 9 }, (_, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={
                  player.justScored && i === player.digits - 1
                    ? { scale: [1, 1.3, 1], y: [0, -4, 0] }
                    : { scale: 1, y: 0 }
                }
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="aspect-square w-full"
              >
                <Safe digit={i + 1} state={i < player.digits ? "solved" : "locked"} />
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        /* ── Compact layout ─────────────────────────────────────────
           Stacked, not a row. Side by side the small cards are ~232px of
           usable width at 1080p, and a medal plus a ten-character name plus a
           score needs ~267px in a row — every name would have truncated. */
        <div className="relative flex w-full flex-col items-center gap-[0.3vh]">
          <motion.span
            key={player.id}
            initial={{ rotate: -140, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="shrink-0"
            style={{ width: "2.6vw", height: "2.6vw" }}
          >
            <Medal rank={rank} />
          </motion.span>
          <span
            className="w-full truncate text-center font-display uppercase leading-none text-ink"
            style={{ fontSize: "1.05vw" }}
          >
            {player.name}
          </span>
          <span
            className="font-readout font-bold leading-none text-ink/65"
            style={{ fontSize: "0.95vw" }}
          >
            {player.digits}/9
          </span>
        </div>
      )}

      {/* Bonus chest — flies in the moment a bonus lands, then settles into a
          badge in the corner. */}
      <AnimatePresence>
        {player.bonus && (
          <motion.div
            key="bonus"
            initial={
              player.justBonus
                ? { scale: 0, rotate: -40, y: "-60%", opacity: 0 }
                : { scale: 1, rotate: -8, opacity: 1 }
            }
            animate={{ scale: 1, rotate: -8, y: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 15 }}
            className="pointer-events-none absolute right-[0.7vw] top-[0.7vh]"
            style={{ width: focused ? "3vw" : "1.8vw", height: focused ? "3vw" : "1.8vw" }}
          >
            <MysteryBox className="h-full w-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RoomPanel({
  stats,
  history,
}: {
  stats: ReturnType<typeof useHall>["stats"];
  history: number[];
}) {
  const pct = Math.round((stats.cracked / Math.max(1, stats.possible)) * 100);
  return (
    <div className="ink shrink-0 rounded-plate bg-white px-[1.2vw] py-[1.4vh] shadow-[0_0.7vh_0_0_var(--color-ink)]">
      <div className="flex items-baseline justify-between">
        <span
          className="font-display uppercase tracking-[0.18em] text-ink/45"
          style={{ fontSize: "0.8vw" }}
        >
          Room progress
        </span>
        <span
          className="font-readout font-bold text-ink"
          style={{ fontSize: "1.15vw", fontVariantNumeric: "tabular-nums" }}
        >
          {pct}%
        </span>
      </div>

      {/* Progress over time. A percentage says where the room is; the curve
          says whether it is speeding up, which is the read that matters when
          you are deciding whether to call time. */}
      <div className="mt-[0.8vh]" style={{ height: "4.4vh" }}>
        <Sparkline points={history} className="h-full" />
      </div>

      <div className="ink mt-[0.6vh] h-[1.5vh] w-full overflow-hidden rounded-pill bg-paper-deep">
        <motion.div
          className="h-full origin-left rounded-pill bg-green"
          animate={{ scaleX: stats.cracked / Math.max(1, stats.possible) }}
          transition={{ duration: 0.6, ease: EXPO }}
        />
      </div>

      <div className="mt-[1.3vh] grid grid-cols-3 gap-[0.7vw]">
        <PanelStat value={stats.cracked} label="Digits" />
        <PanelStat value={stats.finished} label="Finished" />
        <PanelStat value={stats.bonuses} label="Bonuses" />
      </div>
    </div>
  );
}

function PanelStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <Odometer value={value} size="1.6vw" />
      <span
        className="mt-[0.2vh] font-body font-bold uppercase tracking-[0.16em] text-ink/40"
        style={{ fontSize: "0.62vw" }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * A real odometer, not a swap.
 *
 * The previous version replaced the whole number: the old value slid out and
 * the new one appeared, so 279 -> 280 moved all three digits and read as a
 * flicker rather than a count.
 *
 * This is the mechanical version. Each digit is its own column holding 0-9 in
 * a strip ten digits tall, clipped to a one-digit window. Landing on a digit
 * is a translate of -digit * 10% of the strip. Because each column is
 * independent, 279 -> 280 rolls the units from 9 to 0 and the tens from 7 to
 * 8, and the hundreds does not move at all — which is exactly what makes it
 * read as a counter.
 *
 * Columns are keyed by PLACE VALUE, not index, so when a number grows a digit
 * the units column stays the units column instead of every digit reshuffling.
 *
 * Spring rather than a duration: a mechanical counter settles, it does not
 * arrive on a schedule.
 */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Odometer({ value, size }: { value: number; size: string }) {
  const chars = String(Math.max(0, Math.round(value))).split("");
  return (
    <span
      className="flex font-readout font-bold text-ink"
      style={{ fontSize: size, lineHeight: size, fontVariantNumeric: "tabular-nums" }}
    >
      {chars.map((c, i) => (
        <DigitColumn key={chars.length - i} digit={Number(c)} size={size} />
      ))}
    </span>
  );
}

function DigitColumn({ digit, size }: { digit: number; size: string }) {
  return (
    <span className="block overflow-hidden" style={{ height: size }}>
      <motion.span
        className="flex flex-col"
        animate={{ y: `-${digit * 10}%` }}
        transition={{ type: "spring", stiffness: 190, damping: 24, mass: 0.9 }}
      >
        {DIGITS.map((n) => (
          <span
            key={n}
            className="block text-center"
            style={{ height: size, lineHeight: size }}
          >
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function BoardRow({
  rank,
  player,
  delta,
}: {
  rank: number;
  player: ReturnType<typeof useHall>["ranked"][number];
  delta: number;
}) {
  const podium = rank <= 3;
  return (
    <motion.div
      // `layout` is the whole trick: on an overtake the rows physically swap
      // rather than their contents changing. That movement is what makes a
      // room look up from their phones.
      layout
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className={cn(
        "ink relative flex min-h-0 flex-1 items-center gap-[1vw] overflow-hidden rounded-btn px-[1vw]",
        "shadow-[0_0.45vh_0_0_var(--color-ink)]",
        rank === 1 ? "bg-brass" : podium ? "bg-paper-deep" : "bg-white"
      )}
    >
      {/* The score highlight is a LAYER, not the row's background colour.
          Swapping the class gave it an entrance and no exit — the green
          appeared, sat there, then vanished on a frame. As an element it can
          fade out properly, and the row's own colour is never disturbed. */}
      <AnimatePresence>
        {player.justScored && (
          <motion.span
            key="flash"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.75, ease: "easeOut" } }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-0 bg-green"
          />
        )}
      </AnimatePresence>

      {/* A light sweep across the row the moment it scores. Colour alone says
          "this one is different"; the sweep says "this one just happened". */}
      <AnimatePresence>
        {player.justScored && (
          <motion.span
            key="sweep"
            aria-hidden
            initial={{ x: "-120%" }}
            animate={{ x: "120%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: EXPO }}
            className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-[-18deg] bg-white/35"
          />
        )}
      </AnimatePresence>

      <span className="relative flex w-[1.6vw] shrink-0 justify-center" style={{ height: "1.4vw" }}>
        <RankDelta delta={delta} className="h-full" />
      </span>

      <span className="relative flex w-[2.6vw] shrink-0 items-center justify-center">
        {podium ? (
          <span style={{ width: "2.5vw", height: "2.5vw" }}>
            <Medal rank={rank as 1 | 2 | 3} />
          </span>
        ) : (
          <span
            className="font-readout font-bold text-ink/40"
            style={{ fontSize: "1.45vw", fontVariantNumeric: "tabular-nums" }}
          >
            {rank}
          </span>
        )}
      </span>

      <span
        className="ink relative flex shrink-0 items-center justify-center rounded-pill bg-white font-display text-ink"
        style={{ width: "2.7vw", height: "2.7vw", fontSize: "0.95vw" }}
      >
        {player.initials}
      </span>

      <span
        className="relative min-w-0 flex-1 truncate font-display uppercase leading-none text-ink"
        style={{ fontSize: "1.55vw" }}
      >
        {player.name}
      </span>

      {player.bonus && (
        <span
          className="ink relative shrink-0 rounded-pill bg-purple px-[0.6vw] py-[0.3vh] font-body font-bold uppercase tracking-[0.14em] text-white"
          style={{ fontSize: "0.58vw" }}
        >
          Bonus
        </span>
      )}

      {/* Nine pips: position, not just a count. The newest one pops so the eye
          is told exactly what changed. */}
      <span className="relative flex shrink-0 items-center gap-[0.26vw]">
        {Array.from({ length: 9 }, (_, i) => (
          <motion.span
            key={i}
            initial={false}
            animate={
              player.justScored && i === player.digits - 1
                ? { scale: [1, 1.55, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "rounded-pill border-2 border-ink",
              i < player.digits ? "bg-green" : "bg-ink/10"
            )}
            style={{ width: "0.8vw", height: "0.8vw" }}
          />
        ))}
      </span>

      <span
        className="relative w-[3.4vw] shrink-0 text-right font-readout font-bold text-ink"
        style={{ fontSize: "1.35vw", fontVariantNumeric: "tabular-nums" }}
      >
        {player.digits}/9
      </span>
    </motion.div>
  );
}

/**
 * A continuous marquee that does not jump.
 *
 * The previous version fed live events straight into the track, and a new one
 * arrived every 2.2 seconds. Three separate things then went wrong at once:
 * the item count changed, so the track's width changed; -50% therefore meant a
 * different distance mid-flight; and the keyframe array was rebuilt, which
 * restarted the animation from x:0. That is the jump.
 *
 * All three are addressed structurally rather than by easing it away:
 *
 *   FIXED SLOT COUNT — always SLOTS items, padded when there are fewer, so the
 *   number of children never changes.
 *
 *   FIXED SLOT WIDTH — each item is a fixed vw with the name truncating, so
 *   the track's width does not depend on how long anyone's name is.
 *
 *   CONTENT COMMITTED AT THE SEAM — the animation is a single pass, and the
 *   newest events are only adopted when it completes. At -50% the second copy
 *   sits exactly where the first started, so remounting at x:0 with fresh
 *   content is invisible. Nothing ever changes mid-pass.
 */
const SLOTS = 6;
const PASS_MS = 22000;

function Marquee({ events }: { events: ReturnType<typeof useHall>["events"] }) {
  const [pass, setPass] = useState(0);
  const [track, setTrack] = useState<typeof events>([]);
  const latest = useRef(events);
  latest.current = events;

  // Adopt whatever has arrived, but only at a seam.
  useEffect(() => {
    if (track.length === 0 && events.length > 0) setTrack(events);
  }, [events, track.length]);

  const padded = Array.from({ length: SLOTS }, (_, i) => track[i % Math.max(1, track.length)]);
  const loop = [...padded, ...padded];

  return (
    <footer className="relative z-20 flex shrink-0 items-center gap-[1.2vw] overflow-hidden border-t-3 border-ink bg-ink py-[1vh] pl-[2.2vw]">
      <span
        className="relative z-10 shrink-0 rounded-pill bg-brass px-[0.85vw] py-[0.4vh] font-display uppercase text-ink"
        style={{ fontSize: "0.72vw" }}
      >
        <span style={{ letterSpacing: "0.18em", marginRight: "-0.18em" }}>Just cracked</span>
      </span>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        {track.length === 0 ? (
          <span className="font-body font-bold text-white/30" style={{ fontSize: "0.95vw" }}>
            Waiting for the first unlock…
          </span>
        ) : (
          <motion.div
            key={pass}
            className="flex w-max items-center"
            initial={{ x: "0%" }}
            animate={{ x: "-50%" }}
            transition={{ duration: PASS_MS / 1000, ease: "linear" }}
            onAnimationComplete={() => {
              setTrack(latest.current);
              setPass((p) => p + 1);
            }}
          >
            {loop.map((e, i) => (
              <span
                key={i}
                // Fixed width — this is what keeps the track geometry constant.
                className="flex shrink-0 items-center gap-[0.45vw] pr-[2.4vw] font-body font-bold text-white/75"
                style={{ fontSize: "0.95vw", width: "16vw" }}
              >
                <span className="h-[0.45vw] w-[0.45vw] shrink-0 rounded-pill bg-green" />
                <span className="min-w-0 truncate text-brass">{e?.name ?? "—"}</span>
                <span className="shrink-0 text-white/45">reached</span>
                <span className="shrink-0 font-readout text-white">{e?.digits ?? 0}/9</span>
              </span>
            ))}
          </motion.div>
        )}
        {/* Fade the right edge so items leave rather than being chopped. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-[6vw]"
          style={{ background: "linear-gradient(90deg, transparent, var(--color-ink))" }}
        />
      </div>
    </footer>
  );
}
