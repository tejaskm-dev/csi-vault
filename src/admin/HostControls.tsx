import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { isLive } from "../lib/supabase";
import * as api from "../lib/api";
import { cn } from "../lib/utils";
import { humanError } from "../lib/errors";

/**
 * The four buttons an operator actually reaches for, and nothing else.
 *
 * The dashboard around this is monitoring — numbers you glance at. This is the
 * part that changes the room, so it is separated, labelled plainly, and the
 * destructive one is behind a confirm. Under pressure, in front of sixty
 * people, "which button starts it" has to be answerable in one look.
 *
 * Every action re-sends the host code and every RPC re-checks it. Getting past
 * the login screen by other means grants nothing.
 */
export function HostControls({ code }: { code: string }) {
  const [session, setSession] = useState<api.SessionRow | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.hostOverview>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pins, setPins] = useState<{ vault_no: number; name: string; pin: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isLive) return;
    let stop = false;
    const pull = async () => {
      try {
        const s = await api.defaultSession();
        if (stop || !s) return;
        setSession(s);
        setStats(await api.hostOverview(s.id, code));
      } catch (e) {
        if (!stop) setErr(humanError(e, "Could not read the room state."));
      }
    };
    void pull();
    const t = setInterval(pull, 5000);
    return () => { stop = true; clearInterval(t); };
  }, [code]);

  if (!isLive) {
    return (
      <div className="ink rounded-plate bg-white p-5 shadow-ink">
        <p className="font-display text-[18px] uppercase text-ink">Host controls</p>
        <p className="mt-2 font-body text-[13px] font-semibold text-ink/60">
          No Supabase connection in this build, so there is no room to start.
          These appear once the env vars are set.
        </p>
      </div>
    );
  }

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      const s = await api.defaultSession();
      if (s) { setSession(s); setStats(await api.hostOverview(s.id, code)); }
    } catch (e) {
      setErr(humanError(e, "That action did not go through."));
    } finally {
      setBusy(false);
      setConfirmReset(false);
    }
  };

  const phase = stats?.phase ?? session?.phase ?? "…";

  return (
    <div className="ink rounded-plate bg-white p-5 shadow-ink">
      <div className="flex items-center justify-between">
        <p className="font-display text-[18px] uppercase text-ink">Host controls</p>
        <span
          className={cn(
            "rounded-pill border-2 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.2em]",
            phase === "live"
              ? "border-green-deep bg-green text-white"
              : phase === "ended"
              ? "border-ink bg-steel text-white"
              : "border-brass-deep bg-brass text-ink"
          )}
        >
          {phase}
        </span>
      </div>

      {/* The join code is the single most-looked-at thing on this page during
          the five minutes before a game — it goes on a slide and gets read out
          loud — so it is set in the display face at a size that survives being
          photographed off a laptop screen by someone in the third row. */}
      <div className="mt-4 rounded-btn border-3 border-ink bg-paper-deep px-4 py-3 text-center">
        <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">
          Join code
        </span>
        <div className="font-display text-[38px] leading-none tracking-widest text-ink">
          {session?.join_code ?? "…"}
        </div>
      </div>

      {stats && (
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Players", stats.players],
            ["Vaults", stats.vaults],
            ["Meetings", stats.meetings],
            ["Photos", stats.photos],
            ["Bonus", stats.bonus],
            // The number that tells you the room is failing before anyone
            // says so: handshakes opened and never confirmed. Climbing means
            // players cannot find each other, and the fix is to call everyone
            // into the middle rather than to touch the app.
            ["Stalled", stats.stalled],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className={cn(
                "rounded-btn border-2 border-ink px-2 py-2 text-center",
                label === "Stalled" && Number(value) > 5 ? "bg-red text-white" : "bg-paper"
              )}
            >
              <dd className="font-display text-[22px] leading-none">{value as number}</dd>
              <dt className="mt-1 font-body text-[9px] font-bold uppercase tracking-[0.14em] opacity-60">
                {label as string}
              </dt>
            </div>
          ))}
        </dl>
      )}

      {err && (
        <p className="mt-3 rounded-btn border-2 border-red-deep bg-red px-3 py-2 font-body text-[12px] font-bold text-white">
          {err}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <HostButton
          tone="green"
          disabled={busy || !session || phase === "live"}
          onClick={() => session && act(() => api.hostSetPhase(session.id, code, "live"))}
        >
          Start the game
        </HostButton>
        <HostButton
          tone="brass"
          disabled={busy || !session || phase === "lobby"}
          onClick={() => session && act(() => api.hostSetPhase(session.id, code, "lobby"))}
        >
          {phase === "ended" ? "Reopen as lobby" : "Pause to lobby"}
        </HostButton>
        <HostButton
          tone="ink"
          disabled={busy || !session || phase === "ended"}
          onClick={() => session && act(() => api.hostSetPhase(session.id, code, "ended"))}
        >
          End the game
        </HostButton>

        {/* The escape hatch for a genuine latecomer.
            New joins are refused once the game is live — otherwise clearing
            browser storage would be a free board reroll. This opens the door
            for a moment so one real person can get in, without pausing sixty
            others. Close it again straight after. */}
        <HostButton
          tone={stats?.doors ? "red" : "steel"}
          disabled={busy || !session || phase !== "live"}
          onClick={() =>
            session && act(() => api.hostSetDoors(session.id, code, !stats?.doors))
          }
        >
          {stats?.doors ? "Close the doors" : "Let a latecomer in"}
        </HostButton>

        {/* Two taps, always. This deletes every player in the room, and the
            one time it will ever be pressed by accident is the one time it
            matters — mid-event, reaching for something else. */}
        {confirmReset ? (
          <HostButton
            tone="red"
            disabled={busy || !session}
            onClick={() => session && act(() => api.hostReset(session.id, code))}
          >
            Tap again to wipe everyone
          </HostButton>
        ) : (
          <HostButton tone="steel" disabled={busy} onClick={() => setConfirmReset(true)}>
            Reset room
          </HostButton>
        )}
      </div>

      {/* ── Recovery desk ───────────────────────────────────────────
          For the student who cleared their browser and lost their code. The
          host reads a number off this list and says it out loud — a lookup,
          not a judgement call, so it does not violate the "no manual
          verification" rule the rest of the game is built on. */}
      <div className="mt-4 border-t-3 border-ink/10 pt-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-[13px] uppercase tracking-[0.14em] text-ink/55">
            Recovery codes
          </span>
          <HostButton
            tone="steel"
            disabled={busy || !session}
            onClick={() =>
              pins.length
                ? setPins([])
                : session && act(async () => setPins(await api.hostPins(session.id, code)))
            }
          >
            {pins.length ? "Hide" : "Look up"}
          </HostButton>
        </div>

        {pins.length > 0 && (
          <div className="mt-3 max-h-56 overflow-y-auto rounded-btn border-2 border-ink bg-paper">
            {pins.map((p) => (
              <div
                key={p.vault_no}
                className="flex items-center gap-3 border-b border-ink/10 px-3 py-1.5 last:border-0"
              >
                <span className="w-8 shrink-0 font-display text-[15px] text-ink">
                  {p.vault_no}
                </span>
                <span className="min-w-0 flex-1 truncate font-body text-[12px] font-bold text-ink/70">
                  {p.name}
                </span>
                <span className="font-readout text-[14px] font-bold tracking-widest text-ink">
                  {p.pin}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Releasing matters more than it looks: without it, a laptop that dies
          mid-event locks the room for twelve hours. */}
      <button
        type="button"
        disabled={busy || !session}
        onClick={() => session && act(() => api.hostRelease(session.id))}
        className="mt-4 w-full text-center font-body text-[11px] font-bold uppercase tracking-[0.14em] text-ink/35 underline decoration-ink/15 underline-offset-4 disabled:opacity-40"
      >
        Release this room to another device
      </button>

      <p className="mt-3 font-body text-[11px] font-semibold leading-snug text-ink/45">
        Starting the game stamps the clock everyone is timed against. It is set
        once — pausing and restarting will not reset anybody's elapsed time.
      </p>
      {stats?.doors && phase === "live" && (
        <p className="mt-2 rounded-btn border-2 border-brass-deep bg-brass px-3 py-2 font-body text-[11px] font-bold leading-snug text-ink">
          Doors are OPEN. Anyone can join with a fresh board right now — close
          them once your latecomer is in.
        </p>
      )}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "bg-green text-white shadow-[0_4px_0_0_var(--color-green-deep)]",
  brass: "bg-brass text-ink shadow-[0_4px_0_0_var(--color-brass-deep)]",
  red:   "bg-red text-white shadow-[0_4px_0_0_var(--color-red-deep)]",
  steel: "bg-paper-deep text-ink shadow-[0_4px_0_0_var(--color-steel-deep)]",
  ink:   "bg-ink text-white shadow-[0_4px_0_0_#000]",
};

function HostButton({
  tone, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone: keyof typeof TONES }) {
  return (
    <motion.button
      type="button"
      whileTap={{ y: 4 }}
      className={cn(
        "ink rounded-btn px-4 py-2.5 font-display text-[13px] uppercase tracking-wide",
        "disabled:pointer-events-none disabled:opacity-35",
        TONES[tone]
      )}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}
