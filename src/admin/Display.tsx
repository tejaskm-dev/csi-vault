import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Medal, Trophy } from "../components/Props";
import { Safe } from "../components/Safe";
import { Sprinkles } from "../components/Sprinkles";
import { useHall } from "./useHall";
import { cn, formatClock } from "../lib/utils";

/**
 * THE HALL DISPLAY.
 *
 * This is the only admin surface a room full of people sees, projected from a
 * laptop onto a screen. That changes almost every rule the phone screens work
 * under:
 *
 *   READ DISTANCE, NOT SCREEN SIZE. Sizing is in `vw` and `vh`, not pixels,
 *   because the thing that matters is how large type is relative to the
 *   projected image — a 14px label is unreadable at 1920 wide and fine at
 *   1280. Nothing here is a fixed pt size.
 *
 *   NOBODY TOUCHES IT. No hover states, no controls, no scrolling. Everything
 *   that matters has to be on screen at once, which is why the board is capped
 *   at ten and the rest of the room is aggregated into counters.
 *
 *   IT RUNS FOR TWENTY MINUTES. A static board reads as broken within about a
 *   minute, so there is always something in motion: the leader breathes, the
 *   ticker moves, the counters roll. All of it transform and opacity.
 *
 *   MOVEMENT IS THE POINT. When someone overtakes, the rows physically swap —
 *   Framer's `layout` does the work. That single moment is what makes a room
 *   look up, and it is the reason the mock feed exists at all.
 */

const BOARD_SIZE = 10;

export function Display() {
  const { ranked, stats, events } = useHall();
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const leader = ranked[0];
  const board = ranked.slice(0, BOARD_SIZE);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-paper">
      <Sprinkles />

      {/* ── Band ────────────────────────────────────────────────── */}
      <header className="relative z-10 flex shrink-0 items-center justify-between overflow-hidden bg-red px-[2.5vw] py-[1.4vh] shadow-[0_0.5vh_0_0_var(--color-ink)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #FFFFFF 0 10px, transparent 10px 26px)",
          }}
        />
        <div className="relative flex items-baseline gap-[1.4vw]">
          <span
            className="font-display uppercase leading-none text-white"
            style={{ fontSize: "3.1vw", textShadow: "0 0.45vh 0 var(--color-ink)" }}
          >
            Operation Vault
          </span>
          <span
            className="rounded-pill border-2 border-white/40 bg-red-deep px-[1vw] py-[0.5vh] font-body font-bold uppercase tracking-[0.22em] text-white/90"
            style={{ fontSize: "0.85vw" }}
          >
            CSI ASIET
          </span>
        </div>

        <div className="relative flex items-center gap-[1.6vw]">
          <LiveDot />
          <BandStat value={String(stats.players)} label="In play" />
          <BandStat value={formatClock(clock)} label="Elapsed" />
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1 gap-[2vw] px-[2.5vw] py-[2.2vh]">
        {/* Left column — the leader, then the room in aggregate. */}
        <div className="flex w-[30%] shrink-0 flex-col gap-[2vh]">
          <LeaderCard leader={leader} />
          <StatsPanel stats={stats} />
        </div>

        {/* Right column — the board. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-[1.4vh] flex items-baseline justify-between">
            <span
              className="font-display uppercase tracking-[0.18em] text-ink/45"
              style={{ fontSize: "1vw" }}
            >
              The board
            </span>
            <span
              className="font-readout font-bold text-ink/35"
              style={{ fontSize: "0.9vw" }}
            >
              TOP {BOARD_SIZE} OF {stats.players}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-between gap-[0.9vh]">
            {board.map((p, i) => (
              <BoardRow key={p.id} rank={i + 1} player={p} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Ticker ──────────────────────────────────────────────── */}
      <Ticker events={events} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LiveDot() {
  return (
    <span
      className="flex items-center gap-[0.5vw] rounded-pill border-2 border-white bg-ink px-[1vw] py-[0.55vh] font-body font-bold uppercase tracking-[0.2em] text-white"
      style={{ fontSize: "0.85vw" }}
    >
      <span className="relative flex h-[0.7vw] w-[0.7vw]">
        <span className="absolute inset-0 animate-ping rounded-pill bg-green opacity-70" />
        <span className="relative h-full w-full rounded-pill bg-green" />
      </span>
      Live
    </span>
  );
}

function BandStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-end leading-none">
      <span
        className="font-readout font-bold text-white"
        style={{ fontSize: "1.9vw", fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
      <span
        className="mt-[0.4vh] font-body font-bold uppercase tracking-[0.22em] text-white/55"
        style={{ fontSize: "0.7vw" }}
      >
        {label}
      </span>
    </div>
  );
}

/** The runaway leader, big enough to read from the back row. */
function LeaderCard({ leader }: { leader?: ReturnType<typeof useHall>["ranked"][number] }) {
  if (!leader) return null;
  return (
    <div className="ink relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-plate bg-brass px-[1.5vw] py-[2vh] shadow-[0_0.8vh_0_0_var(--color-ink)]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-white/25"
      />

      <motion.div
        // The one continuously moving element on the left. A projector image
        // that never changes reads as a frozen laptop.
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="spin-layer relative"
        style={{ width: "7vw", height: "7vw" }}
      >
        <Trophy className="h-full w-full" />
      </motion.div>

      <span
        className="relative mt-[1vh] font-body font-bold uppercase tracking-[0.24em] text-ink/55"
        style={{ fontSize: "0.85vw" }}
      >
        Leading
      </span>

      {/* Keyed on the name so a change of leader replays the entrance — the
          swap should be an event, not a silent text substitution. */}
      <AnimatePresence mode="wait">
        <motion.span
          key={leader.id}
          initial={{ y: "60%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-60%", opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          className="relative mt-[0.6vh] block max-w-full truncate font-display uppercase leading-none text-ink"
          style={{ fontSize: "2.6vw" }}
        >
          {leader.name}
        </motion.span>
      </AnimatePresence>

      <div className="relative mt-[1.4vh] flex items-baseline gap-[0.4vw]">
        <span
          className="font-readout font-bold leading-none text-ink"
          style={{ fontSize: "3.4vw", fontVariantNumeric: "tabular-nums" }}
        >
          {leader.digits}
        </span>
        <span className="font-readout font-bold text-ink/40" style={{ fontSize: "1.4vw" }}>
          / 9
        </span>
      </div>

      {/* Their actual board, so the number has something behind it. */}
      <div className="relative mt-[1.6vh] grid w-full grid-cols-9 gap-[0.3vw]">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="aspect-square w-full">
            <Safe digit={i + 1} state={i < leader.digits ? "solved" : "locked"} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsPanel({ stats }: { stats: ReturnType<typeof useHall>["stats"] }) {
  const pct = Math.round((stats.cracked / Math.max(1, stats.possible)) * 100);
  return (
    <div className="ink shrink-0 rounded-plate bg-white px-[1.4vw] py-[1.6vh] shadow-[0_0.6vh_0_0_var(--color-ink)]">
      <div className="flex items-baseline justify-between">
        <span
          className="font-display uppercase tracking-[0.18em] text-ink/45"
          style={{ fontSize: "0.85vw" }}
        >
          Room progress
        </span>
        <span
          className="font-readout font-bold text-ink"
          style={{ fontSize: "1.2vw", fontVariantNumeric: "tabular-nums" }}
        >
          {pct}%
        </span>
      </div>

      <div className="ink mt-[1vh] h-[1.6vh] w-full overflow-hidden rounded-pill bg-paper-deep">
        <motion.div
          className="h-full origin-left rounded-pill bg-green"
          animate={{ scaleX: stats.cracked / Math.max(1, stats.possible) }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        />
      </div>

      <div className="mt-[1.6vh] grid grid-cols-3 gap-[0.8vw]">
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
      <Rolling value={value} />
      <span
        className="mt-[0.3vh] font-body font-bold uppercase tracking-[0.16em] text-ink/40"
        style={{ fontSize: "0.65vw" }}
      >
        {label}
      </span>
    </div>
  );
}

/** A number that arrives rather than blinking. */
function Rolling({ value }: { value: number }) {
  return (
    <span className="block h-[2vw] overflow-hidden" style={{ lineHeight: "2vw" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.42, ease: [0.76, 0, 0.24, 1] }}
          className="block font-readout font-bold text-ink"
          style={{ fontSize: "1.7vw", lineHeight: "2vw", fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function BoardRow({
  rank,
  player,
}: {
  rank: number;
  player: ReturnType<typeof useHall>["ranked"][number];
}) {
  const podium = rank <= 3;
  return (
    <motion.div
      // `layout` is the whole trick: when someone overtakes, the rows
      // physically swap places instead of their contents changing. That
      // movement is what makes a room look up.
      layout
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className={cn(
        "ink relative flex min-h-0 flex-1 items-center gap-[1.2vw] overflow-hidden rounded-btn px-[1.2vw]",
        "shadow-[0_0.45vh_0_0_var(--color-ink)]",
        player.justScored
          ? "bg-green"
          : rank === 1
            ? "bg-brass"
            : podium
              ? "bg-paper-deep"
              : "bg-white"
      )}
    >
      {/* Rank */}
      <span className="flex w-[3vw] shrink-0 items-center justify-center">
        {podium ? (
          <span style={{ width: "2.6vw", height: "2.6vw" }}>
            <Medal rank={rank as 1 | 2 | 3} />
          </span>
        ) : (
          <span
            className="font-readout font-bold text-ink/40"
            style={{ fontSize: "1.5vw", fontVariantNumeric: "tabular-nums" }}
          >
            {rank}
          </span>
        )}
      </span>

      {/* Avatar */}
      <span
        className="ink flex shrink-0 items-center justify-center rounded-pill bg-white font-display text-ink"
        style={{ width: "2.9vw", height: "2.9vw", fontSize: "1vw" }}
      >
        {player.initials}
      </span>

      {/* Name */}
      <span
        className="min-w-0 flex-1 truncate font-display uppercase leading-none text-ink"
        style={{ fontSize: "1.6vw" }}
      >
        {player.name}
      </span>

      {player.bonus && (
        <span
          className="ink shrink-0 rounded-pill bg-purple px-[0.7vw] py-[0.35vh] font-body font-bold uppercase tracking-[0.14em] text-white"
          style={{ fontSize: "0.6vw" }}
        >
          Bonus
        </span>
      )}

      {/* Nine pips — position, not just a count. Readable at distance in a way
          a fraction alone is not. */}
      <span className="flex shrink-0 items-center gap-[0.28vw]">
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "rounded-pill border-2 border-ink",
              i < player.digits ? "bg-green" : "bg-ink/10"
            )}
            style={{ width: "0.85vw", height: "0.85vw" }}
          />
        ))}
      </span>

      <span
        className="w-[3.6vw] shrink-0 text-right font-readout font-bold text-ink"
        style={{ fontSize: "1.4vw", fontVariantNumeric: "tabular-nums" }}
      >
        {player.digits}/9
      </span>
    </motion.div>
  );
}

/** Recent unlocks, so the room can see it is a live thing. */
function Ticker({ events }: { events: ReturnType<typeof useHall>["events"] }) {
  return (
    <footer className="relative z-10 flex shrink-0 items-center gap-[1.5vw] overflow-hidden border-t-3 border-ink bg-ink px-[2.5vw] py-[1.1vh]">
      <span
        className="shrink-0 rounded-pill bg-brass px-[0.9vw] py-[0.4vh] font-display uppercase tracking-[0.18em] text-ink"
        style={{ fontSize: "0.75vw" }}
      >
        Just cracked
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-[2vw] overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {events.map((e) => (
            <motion.span
              key={e.id}
              layout
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
              className="flex shrink-0 items-center gap-[0.5vw] whitespace-nowrap font-body font-bold text-white/75"
              style={{ fontSize: "1vw" }}
            >
              <span className="h-[0.5vw] w-[0.5vw] rounded-pill bg-green" />
              <span className="text-brass">{e.name}</span>
              <span className="text-white/45">reached</span>
              <span className="font-readout text-white">{e.digits}/9</span>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </footer>
  );
}
