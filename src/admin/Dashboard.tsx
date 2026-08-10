import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Medal, Stopwatch, Padlock, MysteryBox } from "../components/Props";
import { Sprinkles } from "../components/Sprinkles";
import { useHall } from "./useHall";
import { HostControls } from "./HostControls";
import { Review } from "./Review";
import * as api from "../lib/api";
import { useEffect, useState } from "react";
import { listStagger, riseIn } from "../lib/motion";
import { cn } from "../lib/utils";

/**
 * Operator dashboard — the laptop view, not the projected one.
 *
 * Mostly monitoring, and deliberately: at an event the operator is watching a
 * room, not administering records. The things that actually get looked at are
 * how far along the room is, who is stuck, and whether anything has broken —
 * so those are the whole page, and the controls are the few that would be
 * reached for under pressure.
 *
 * Those controls are real now, and live in HostControls so the one part of
 * this page that changes the room is visually separate from the parts that
 * only report on it.
 */
export function Dashboard({
  hostCode,
  onSignOut,
}: {
  hostCode: string;
  onSignOut: () => void;
}) {
  const { ranked, stats, events } = useHall();

  /**
   * The room, for the review panel.
   *
   * Fetched once rather than threaded down from AdminApp: the host is already
   * authorised by their claim, so reviewer_ok() lets them judge without a
   * second code, and this panel is the same component the invigilators use.
   */
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    api.defaultSession().then((s) => setSessionId(s?.id ?? null)).catch(() => {});
  }, []);

  const stuck = ranked.filter((p) => p.digits <= 2).length;
  const pct = Math.round((stats.cracked / Math.max(1, stats.possible)) * 100);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-paper">
      <Sprinkles />

      {/* ── Bar ─────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between overflow-hidden bg-red px-6 py-4 shadow-[0_4px_0_0_var(--color-ink)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #FFFFFF 0 8px, transparent 8px 22px)",
          }}
        />
        <div className="relative flex items-baseline gap-3">
          <span
            className="font-display text-[22px] uppercase leading-none text-white"
            style={{ textShadow: "0 3px 0 var(--color-ink)" }}
          >
            Control Room
          </span>
          <span className="rounded-pill border-2 border-white/35 bg-red-deep px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">
            Operator
          </span>
        </div>

        <div className="relative flex items-center gap-3">
          <Link
            to="/admin/display"
            target="_blank"
            className="ink rounded-btn bg-brass px-4 py-2.5 font-display text-[13px] uppercase tracking-wide text-ink shadow-chip-ink transition-transform hover:-translate-y-0.5"
          >
            Open hall display
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="ink cursor-pointer rounded-btn bg-ink px-4 py-2.5 font-display text-[13px] uppercase tracking-wide text-white shadow-chip-ink transition-transform hover:-translate-y-0.5"
          >
            Sign out
          </button>
        </div>
      </header>

      <motion.div
        variants={listStagger}
        initial="initial"
        animate="animate"
        className="relative z-10 mx-auto max-w-[1200px] p-6"
      >
        {/* ── Headline numbers ──────────────────────────────────── */}
        <motion.div variants={riseIn} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile icon={<Padlock open className="h-full w-full" />} value={String(stats.players)} label="Players in play" />
          <Tile icon={<Medal rank={1} className="h-full w-full" />} value={`${stats.finished}`} label="Cracked all nine" />
          <Tile icon={<Stopwatch className="h-full w-full" />} value={`${pct}%`} label="Room progress" tone="brass" />
          <Tile icon={<MysteryBox className="h-full w-full" />} value={String(stats.bonuses)} label="Bonus rounds won" />
        </motion.div>

        {/* minmax(0, …), not a bare fr.
            An `fr` track will not shrink below the MIN-CONTENT width of what
            is in it, and the errors panel below sets `white-space: nowrap` on
            a Postgres message — whose min-content width is the entire
            sentence. So one long error pushed the right-hand track wider than
            its share, the grid grew past max-w-[1200px], and the whole
            dashboard ran off the edge of the window while the standings
            column was squeezed. minmax(0, …) says the track may shrink. */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* ── Standings ───────────────────────────────────────── */}
          <motion.section variants={riseIn} className="ink rounded-plate bg-white p-5 shadow-ink">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[15px] uppercase tracking-[0.14em] text-ink">
                Standings
              </h2>
              <span className="font-readout text-[12px] font-bold text-ink/40">
                TOP 12 OF {stats.players}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {ranked.slice(0, 12).map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  transition={{ type: "spring", stiffness: 340, damping: 32 }}
                  className={cn(
                    "ink flex items-center gap-3 rounded-btn px-3 py-2 shadow-chip-ink",
                    p.justScored ? "bg-green" : i === 0 ? "bg-brass" : "bg-paper"
                  )}
                >
                  <span className="w-7 shrink-0 text-center font-readout text-[13px] font-bold text-ink/55">
                    {i + 1}
                  </span>
                  <span className="ink flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-white font-display text-[11px] text-ink">
                    {p.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-body text-[14px] font-bold text-ink">
                    {p.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {Array.from({ length: 9 }, (_, d) => (
                      <span
                        key={d}
                        className={cn(
                          "h-2 w-2 rounded-pill border border-ink",
                          d < p.digits ? "bg-green" : "bg-ink/10"
                        )}
                      />
                    ))}
                  </span>
                  <span className="w-10 shrink-0 text-right font-readout text-[13px] font-bold text-ink">
                    {p.digits}/9
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* min-w-0 for the same reason as the track above: a flex item's
              default min-width is auto, so one nowrap child would push this
              column wider than the space it was given. */}
          <div className="flex min-w-0 flex-col gap-5">
            {/* ── Evidence ──────────────────────────────────────────
                The same queue the invigilators hold on /review. It sits here
                too because at a small event the host IS the review desk, and
                because the person deciding when to press END THE GAME is the
                one who should see how many photos are still waiting. */}
            {sessionId && (
              <motion.section variants={riseIn} className="ink rounded-plate bg-white shadow-ink">
                <Review sessionId={sessionId} />
              </motion.section>
            )}

            {/* ── Needs attention ───────────────────────────────── */}
            <motion.section variants={riseIn} className="ink rounded-plate bg-white p-5 shadow-ink">
              <h2 className="font-display text-[15px] uppercase tracking-[0.14em] text-ink">
                Needs attention
              </h2>
              <p className="mt-1 font-body text-[12px] font-semibold text-ink/50">
                Players on two digits or fewer. Worth a walk over.
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-readout text-[38px] font-bold leading-none text-red">
                  {stuck}
                </span>
                <span className="font-body text-[13px] font-bold text-ink/45">
                  of {stats.players}
                </span>
              </div>
              <div className="ink mt-3 h-3 w-full overflow-hidden rounded-pill bg-paper-deep">
                <div
                  className="h-full rounded-pill bg-red transition-[width] duration-500"
                  style={{ width: `${(stuck / Math.max(1, stats.players)) * 100}%` }}
                />
              </div>
            </motion.section>

            {/* ── Feed ──────────────────────────────────────────── */}
            <motion.section variants={riseIn} className="ink flex-1 rounded-plate bg-ink p-5 shadow-ink">
              <h2 className="font-display text-[15px] uppercase tracking-[0.14em] text-brass">
                Live feed
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {events.length === 0 && (
                  <span className="font-body text-[12px] font-semibold text-white/35">
                    Waiting for the first unlock…
                  </span>
                )}
                {events.map((e) => (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 font-body text-[13px] font-semibold text-white/70"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-pill bg-green" />
                    <span className="truncate text-brass">{e.name}</span>
                    <span className="text-white/35">reached</span>
                    <span className="font-readout text-white">{e.digits}/9</span>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* ── Controls, now actually wired ──────────────────── */}
            <motion.section variants={riseIn}>
              <HostControls code={hostCode} />
            </motion.section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Tile({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: "brass";
}) {
  return (
    <div
      className={cn(
        "ink flex items-center gap-3 rounded-plate p-4 shadow-ink",
        tone === "brass" ? "bg-brass" : "bg-white"
      )}
    >
      <span className="h-11 w-11 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block font-readout text-[26px] font-bold leading-none text-ink">
          {value}
        </span>
        <span className="mt-1 block truncate font-body text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">
          {label}
        </span>
      </span>
    </div>
  );
}
