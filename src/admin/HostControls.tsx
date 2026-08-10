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
  const [stuck, setStuck] = useState<Awaited<ReturnType<typeof api.hostStuck>>>([]);
  const [errors, setErrors] = useState<Awaited<ReturnType<typeof api.hostErrors>>>([]);
  const [notice, setNotice] = useState("");
  const [killId, setKillId] = useState("");
  const [dupes, setDupes] = useState<Awaited<ReturnType<typeof api.hostDuplicateNames>>>([]);
  const [renameNo, setRenameNo] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  /** Photos nobody has looked at yet. Shown next to END THE GAME. */
  const [unreviewed, setUnreviewed] = useState(0);

  useEffect(() => {
    if (!isLive) return;
    let stop = false;
    const pull = async () => {
      try {
        const s = await api.defaultSession();
        if (stop || !s) return;
        setSession(s);
        setStats(await api.hostOverview(s.id, code));
        if (!stop) setStuck(await api.hostStuck(s.id, code));
        if (!stop) setErrors(await api.hostErrors(s.id, code));
        if (!stop) setDupes(await api.hostDuplicateNames(s.id, code));
        // The host is a reviewer by virtue of holding the claim, so this needs
        // no extra code — see reviewer_ok() in 0035.
        if (!stop) setUnreviewed((await api.reviewStats(s.id)).pending);
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

      {/* NOT a code players type.
          This used to be rendered huge and labelled "Join code", which is an
          instruction to put it on a slide — and sixty students would then hunt
          for a field that does not exist. Players are auto-joined into the
          open room; this is only here so the host can tell WHICH room is live
          when more than one exists. Sized accordingly. */}
      <div className="mt-4 flex items-center justify-between rounded-btn border-2 border-ink/15 bg-paper-deep px-3 py-2">
        <span className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-ink/45">
          Room
        </span>
        <span className="font-readout text-[14px] font-bold tracking-widest text-ink/70">
          {session?.join_code ?? "…"}
        </span>
      </div>
      <p className="mt-2 font-body text-[11px] font-semibold leading-snug text-ink/45">
        Players do not enter this. Send them the site link — they land in
        whichever room is open.
      </p>

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

      {/* A cross after the game ends still takes the vault back, so the final
          standings can move once the podium is already up. That is the honest
          behaviour — a correction is a correction — which makes this line the
          mitigation: the person deciding when to stop can see what is still
          waiting to be judged. */}
      {unreviewed > 0 && (
        <p className="mt-3 rounded-btn border-2 border-ink/15 bg-brass px-3 py-2 font-body text-[12px] font-bold text-ink">
          {unreviewed} photo{unreviewed === 1 ? "" : "s"} still unjudged. They
          count as accepted, but a late cross would move the standings — clear
          the queue before ending the game.
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

      {/* ── Say something to the room ────────────────────────────────
          The most useful control here, because it does not need to know what
          went wrong. Most unexpected problems at an event are solved by being
          able to tell sixty people one sentence. */}
      <div className="mt-4 border-t-3 border-ink/10 pt-4">
        <span className="font-display text-[13px] uppercase tracking-[0.14em] text-ink/55">
          Message every phone
        </span>
        <div className="mt-2 flex gap-2">
          <input
            value={notice}
            onChange={(e) => setNotice(e.target.value.slice(0, 240))}
            placeholder="e.g. Vault 5 is broken — use the skip button"
            className="ink flex-1 rounded-btn bg-paper-deep px-3 py-2 font-body text-[13px] font-semibold text-ink shadow-ink-sm focus:outline-none"
          />
          <HostButton
            tone="green"
            disabled={busy || !session || !notice.trim()}
            onClick={() => session && act(async () => {
              await api.hostBroadcast(session.id, code, notice);
              setNotice("");
            })}
          >
            Send
          </HostButton>
          <HostButton
            tone="steel"
            disabled={busy || !session}
            onClick={() => session && act(() => api.hostBroadcast(session.id, code, ""))}
          >
            Clear
          </HostButton>
        </div>
      </div>

      {/* ── Errors the phones are reporting ──────────────────────────
          Students whose phones are failing do not walk over and say so; they
          quietly stop playing. This is how you find out while you can still
          do something. */}
      {errors.length > 0 && (
        <div className="mt-4 rounded-btn border-3 border-red-deep bg-red p-3">
          <p className="font-display text-[13px] uppercase tracking-[0.14em] text-white">
            Errors on player phones
          </p>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {errors.map((e, i) => (
              <div key={i} className="rounded-btn bg-white/90 px-2 py-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[12px] text-ink">{e.where_at}</span>
                  <span className="font-body text-[10px] font-bold text-ink/50">
                    {e.hits}x · {e.players} player{Number(e.players) === 1 ? "" : "s"}
                  </span>
                </div>
                {/* Wrapped, not truncated. `truncate` sets white-space:nowrap,
                    which both made the panel the widest thing on the page and
                    cut the message at the point it starts being useful — the
                    host was reading "Could not find the function
                    public.game_snapshot with parameter p_session or with a
                    single unnamed json/jsonb parameter, but no matche…". Two
                    lines of a real sentence beats one line of a prefix. */}
                <p className="line-clamp-2 break-words font-body text-[10px] font-semibold text-ink/60">
                  {e.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Kill a broken challenge ──────────────────────────────────
          Deactivating alone leaves everyone already holding it stuck, so this
          also releases them. One id, one tap, problem contained. */}
      <div className="mt-4">
        <span className="font-display text-[13px] uppercase tracking-[0.14em] text-ink/55">
          Remove a broken challenge
        </span>
        <div className="mt-2 flex gap-2">
          <input
            value={killId}
            onChange={(e) => setKillId(e.target.value.trim())}
            placeholder="challenge id, e.g. t_clock"
            className="ink flex-1 rounded-btn bg-paper-deep px-3 py-2 font-readout text-[13px] text-ink shadow-ink-sm focus:outline-none"
          />
          <HostButton
            tone="red"
            disabled={busy || !session || !killId}
            onClick={() => session && act(async () => {
              const r = await api.hostKillChallenge(session.id, code, killId);
              setErr(`Removed ${killId} — freed ${r.freed} stuck player(s).`);
              setKillId("");
            })}
          >
            Remove
          </HostButton>
        </div>
        <p className="mt-1 font-body text-[10px] font-semibold text-ink/45">
          Stops it being dealt again AND marks it done for anyone holding it.
        </p>
      </div>

      {/* ── Who is jammed ───────────────────────────────────────────
          The number worth watching mid-event. A player sitting on one
          challenge for ten minutes is not thinking hard — something is broken
          for them, and they will not come and tell you. */}
      {stuck.length > 0 && (
        <div className="mt-4 rounded-btn border-3 border-ink bg-brass p-3">
          <p className="font-display text-[13px] uppercase tracking-[0.14em] text-ink">
            Stuck ({stuck.length})
          </p>
          <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
            {stuck.map((p) => (
              <div key={p.vault_no} className="flex items-center gap-2 rounded-btn bg-white/70 px-2 py-1.5">
                <span className="w-7 font-display text-[14px] text-ink">{p.vault_no}</span>
                <span className="min-w-0 flex-1 truncate font-body text-[11px] font-bold text-ink/70">
                  {p.name} · vault {p.vault} · {p.kind} · {p.minutes}m
                </span>
                <button
                  type="button"
                  disabled={busy || !session}
                  onClick={() => session && act(() => api.hostSkipStep(session.id, code, p.vault_no))}
                  className="ink rounded-btn bg-red px-2 py-1 font-display text-[10px] uppercase text-white"
                >
                  Skip
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 font-body text-[10px] font-semibold leading-snug text-ink/60">
            Skipping marks the step done and moves them on. Better a generous
            score than a student stuck watching everyone else play.
          </p>
        </div>
      )}

      {/* ── Rename a player ──────────────────────────────────────────
          The one moderation tool. A student types something rude, it goes on
          the projector in front of the whole year, and until now nobody could
          change it — not the host, and not them. Far likelier to matter on the
          day than two people sharing a name. */}
      <div className="mt-4 border-t-3 border-ink/10 pt-4">
        <span className="font-display text-[13px] uppercase tracking-[0.14em] text-ink/55">
          Rename a player
        </span>
        <div className="mt-2 flex gap-2">
          <input
            inputMode="numeric"
            value={renameNo}
            onChange={(e) => setRenameNo(e.target.value.replace(/\D/g, "").slice(0, 3))}
            placeholder="No."
            className="ink w-16 rounded-btn bg-paper-deep px-2 py-2 text-center font-display text-[15px] text-ink shadow-ink-sm focus:outline-none"
          />
          <input
            value={renameTo}
            onChange={(e) => setRenameTo(e.target.value.slice(0, 20))}
            placeholder="new name"
            className="ink flex-1 rounded-btn bg-paper-deep px-3 py-2 font-body text-[13px] font-bold text-ink shadow-ink-sm focus:outline-none"
          />
          <HostButton
            tone="brass"
            disabled={busy || !session || !renameNo || !renameTo.trim()}
            onClick={() => session && act(async () => {
              const r = await api.hostRename(session.id, code, parseInt(renameNo, 10), renameTo);
              setErr(`Renamed #${renameNo}: ${r.from} → ${r.to}`);
              setRenameNo(""); setRenameTo("");
            })}
          >
            Rename
          </HostButton>
        </div>

        {/* Duplicates are allowed on purpose, but worth SEEING — the app shows
            the vault number beside a shared name, and if two are causing
            confusion you can rename one here. */}
        {dupes.length > 0 && (
          <p className="mt-2 font-body text-[11px] font-semibold leading-snug text-ink/50">
            Shared names (fine, shown with numbers in-game):{" "}
            {dupes.map((d) => `${d.name} (#${d.numbers.join(", #")})`).join(" · ")}
          </p>
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
