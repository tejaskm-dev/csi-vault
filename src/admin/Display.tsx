import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Medal, Trophy } from "../components/Props";
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

  const leader = ranked[0];
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
          <LeaderCard leader={leader} />
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
      <div className="relative flex items-baseline gap-[1.2vw]">
        <span
          className="font-display uppercase leading-none text-white"
          style={{ fontSize: "3vw", textShadow: "0 0.45vh 0 var(--color-ink)" }}
        >
          Operation Vault
        </span>
        <span
          className="rounded-pill border-2 border-white/40 bg-red-deep px-[0.9vw] py-[0.45vh] font-body font-bold uppercase tracking-[0.22em] text-white/90"
          style={{ fontSize: "0.8vw" }}
        >
          CSI ASIET
        </span>
      </div>

      <div className="relative flex items-center gap-[1.5vw]">
        <span
          className="flex items-center gap-[0.5vw] rounded-pill border-2 border-white bg-ink px-[0.9vw] py-[0.5vh] font-body font-bold uppercase tracking-[0.2em] text-white"
          style={{ fontSize: "0.8vw" }}
        >
          <span className="relative flex h-[0.65vw] w-[0.65vw]">
            <span className="absolute inset-0 animate-ping rounded-pill bg-green opacity-70" />
            <span className="relative h-full w-full rounded-pill bg-green" />
          </span>
          Live
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

function LeaderCard({ leader }: { leader?: ReturnType<typeof useHall>["ranked"][number] }) {
  if (!leader) return null;
  return (
    <div className="ink relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-plate bg-brass px-[1.2vw] py-[1.6vh] shadow-[0_0.9vh_0_0_var(--color-ink)]">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-white/25" />

      {/* Halo. Two counter-rotating fans so it never looks like one spinning
          wheel — the interference between them is what makes it feel alive. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <motion.div
          className="spin-layer absolute opacity-[0.3]"
          style={{ width: "150%", height: "150%" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
        >
          <RayBurst color="#FFFFFF" deep="#FFD888" spokes={22} />
        </motion.div>
        <motion.div
          className="spin-layer absolute opacity-[0.18]"
          style={{ width: "120%", height: "120%" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 52, repeat: Infinity, ease: "linear" }}
        >
          <RayBurst color="var(--color-brass-deep)" deep="var(--color-brass-deep)" spokes={14} />
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        className="spin-layer relative"
        style={{ width: "7.5vw", height: "7.5vw" }}
      >
        <Trophy className="h-full w-full" />
      </motion.div>

      <span
        className="relative mt-[0.8vh] font-body font-bold uppercase tracking-[0.28em] text-ink/55"
        style={{ fontSize: "0.8vw" }}
      >
        Leading
      </span>

      {/* Name flanked by laurels, re-animating on every change of leader — a
          takeover should be an event, not a text substitution. */}
      <div className="relative mt-[0.5vh] flex w-full items-center justify-center gap-[0.6vw]">
        <span className="shrink-0" style={{ width: "2.2vw", height: "3vw" }}>
          <Laurel />
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={leader.id}
            initial={{ y: "55%", opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "-55%", opacity: 0 }}
            transition={{ duration: 0.5, ease: EXPO }}
            className="block min-w-0 flex-1 truncate text-center font-display uppercase leading-none text-ink"
            style={{ fontSize: "2.3vw", textShadow: "0 0.3vh 0 rgba(255,255,255,0.5)" }}
          >
            {leader.name}
          </motion.span>
        </AnimatePresence>
        <span className="shrink-0" style={{ width: "2.2vw", height: "3vw" }}>
          <Laurel flip />
        </span>
      </div>

      <div className="relative mt-[1.1vh] flex items-baseline gap-[0.35vw]">
        <RollingNumber value={leader.digits} size="3.2vw" />
        <span className="font-readout font-bold text-ink/40" style={{ fontSize: "1.3vw" }}>
          / 9
        </span>
      </div>

      <div className="relative mt-[1.3vh] grid w-full grid-cols-9 gap-[0.28vw]">
        {Array.from({ length: 9 }, (_, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={i === leader.digits - 1 ? { scale: [1, 1.22, 1] } : { scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="aspect-square w-full"
          >
            <Safe digit={i + 1} state={i < leader.digits ? "solved" : "locked"} />
          </motion.div>
        ))}
      </div>
    </div>
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
      <RollingNumber value={value} size="1.6vw" />
      <span
        className="mt-[0.2vh] font-body font-bold uppercase tracking-[0.16em] text-ink/40"
        style={{ fontSize: "0.62vw" }}
      >
        {label}
      </span>
    </div>
  );
}

/** A number that arrives from below rather than blinking to a new value. */
function RollingNumber({ value, size }: { value: number; size: string }) {
  return (
    <span className="block overflow-hidden" style={{ height: size, lineHeight: size }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.42, ease: EXPO }}
          className="block font-readout font-bold text-ink"
          style={{ fontSize: size, lineHeight: size, fontVariantNumeric: "tabular-nums" }}
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
        player.justScored ? "bg-green" : rank === 1 ? "bg-brass" : podium ? "bg-paper-deep" : "bg-white"
      )}
    >
      {/* A light sweep across the row the moment it scores. Colour alone says
          "this one is different"; the sweep says "this one just happened". */}
      <AnimatePresence>
        {player.justScored && (
          <motion.span
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
 * A genuine continuous marquee, not a list that shuffles.
 *
 * The content is rendered twice and the track translates exactly -50%, so the
 * second copy is in the first's place at the moment it loops and the seam is
 * invisible. Duration scales with how much content there is, which keeps the
 * speed constant instead of the whole thing accelerating as events pile up.
 */
function Marquee({ events }: { events: ReturnType<typeof useHall>["events"] }) {
  const items = events.length ? events : [];
  const loop = [...items, ...items];

  return (
    <footer className="relative z-20 flex shrink-0 items-center gap-[1.2vw] overflow-hidden border-t-3 border-ink bg-ink py-[1vh] pl-[2.2vw]">
      <span
        className="relative z-10 shrink-0 rounded-pill bg-brass px-[0.85vw] py-[0.4vh] font-display uppercase tracking-[0.18em] text-ink"
        style={{ fontSize: "0.72vw" }}
      >
        Just cracked
      </span>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        {items.length === 0 ? (
          <span className="font-body font-bold text-white/30" style={{ fontSize: "0.95vw" }}>
            Waiting for the first unlock…
          </span>
        ) : (
          <motion.div
            className="flex w-max items-center gap-[2.2vw]"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: Math.max(14, items.length * 4), repeat: Infinity, ease: "linear" }}
          >
            {loop.map((e, i) => (
              <span
                key={`${e.id}-${i}`}
                className="flex shrink-0 items-center gap-[0.45vw] whitespace-nowrap font-body font-bold text-white/75"
                style={{ fontSize: "0.95vw" }}
              >
                <span className="h-[0.45vw] w-[0.45vw] rounded-pill bg-green" />
                <span className="text-brass">{e.name}</span>
                <span className="text-white/45">reached</span>
                <span className="font-readout text-white">{e.digits}/9</span>
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
