import { Safe } from "../components/Safe";
import {
  Trophy, GiftBox, Key, Stopwatch, HintBulb,
  Padlock, Medal, Flag, MysteryBox,
} from "../components/Props";
import { GLYPH_ART } from "../art";

/**
 * Dev-only asset inventory. Route: /assets
 * Shows every code-built prop plus whichever exported PNGs have landed.
 */

const REQUIRED_ART: { name: string; where: string }[] = [
  { name: "csi-logo", where: "Splash header" },
  { name: "vault-door-scene", where: "Splash hero" },
  { name: "mascot-thinking", where: "Challenge screen" },
  { name: "mascot-celebrate", where: "Success / Mission Complete" },
  { name: "mascot-sad", where: "Not Quite screen" },
];

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">{title}</h2>
      {note && <p className="mb-2 mt-0.5 text-[12px] text-ink/45">{note}</p>}
      <div className={note ? "" : "mt-2"}>{children}</div>
    </section>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="ink flex h-20 w-20 items-center justify-center rounded-btn bg-white p-2 shadow-ink-sm">
        {children}
      </div>
      <span className="text-center text-[10px] font-bold uppercase tracking-wider text-ink/50">
        {label}
      </span>
    </div>
  );
}

export function AssetsPreview() {
  const missing = REQUIRED_ART.filter((a) => !GLYPH_ART[a.name]);

  return (
    <div className="min-h-dvh bg-paper p-5 font-body">
      <h1 className="font-display text-2xl text-ink">ASSETS</h1>
      <p className="mb-6 mt-1 text-[13px] text-ink/60">
        Code-built props and exported art, at real size.
      </p>

      {/* ---- status ---- */}
      <div
        className={`ink mb-8 rounded-plate p-4 shadow-ink-sm ${
          missing.length ? "bg-red/10" : "bg-green/15"
        }`}
      >
        <h2 className="font-display text-[15px] text-ink">
          {missing.length ? `${missing.length} OF 5 EXPORTS MISSING` : "ALL EXPORTS PRESENT"}
        </h2>
        <ul className="mt-2 space-y-1">
          {REQUIRED_ART.map((a) => {
            const have = Boolean(GLYPH_ART[a.name]);
            return (
              <li key={a.name} className="flex items-center gap-2 text-[12px]">
                <span className={have ? "text-green" : "text-red"}>{have ? "●" : "○"}</span>
                <code className="font-readout text-[11px] text-ink">
                  src/art/props/{a.name}.png
                </code>
                <span className="text-ink/40">— {a.where}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ---- exported art that has landed ---- */}
      {REQUIRED_ART.some((a) => GLYPH_ART[a.name]) && (
        <Panel title="Exported art" note="Yours. Check these look right on cream — not on a grey or black square.">
          <div className="flex flex-wrap gap-4">
            {REQUIRED_ART.filter((a) => GLYPH_ART[a.name]).map((a) => (
              <div key={a.name} className="flex flex-col items-center gap-1.5">
                <div className="ink flex h-28 w-28 items-center justify-center rounded-plate bg-paper p-2 shadow-ink-sm">
                  <img src={GLYPH_ART[a.name]} alt={a.name} className="max-h-full max-w-full object-contain" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
                  {a.name}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ---- code-built props ---- */}
      <Panel title="Props — built in code" note="No exports needed. Recolour and animate from tokens.">
        <div className="flex flex-wrap gap-4">
          <Cell label="Trophy"><Trophy /></Cell>
          <Cell label="Gift box"><GiftBox /></Cell>
          <Cell label="Key"><Key /></Cell>
          <Cell label="Stopwatch"><Stopwatch /></Cell>
          <Cell label="Hint bulb"><HintBulb /></Cell>
          <Cell label="Locked"><Padlock /></Cell>
          <Cell label="Unlocked"><Padlock open /></Cell>
          <Cell label="Flag"><Flag /></Cell>
          <Cell label="Bonus box"><MysteryBox /></Cell>
        </div>
      </Panel>

      <Panel title="Rank medals">
        <div className="flex flex-wrap gap-4">
          <Cell label="1st"><Medal rank={1} /></Cell>
          <Cell label="2nd"><Medal rank={2} /></Cell>
          <Cell label="3rd"><Medal rank={3} /></Cell>
        </div>
      </Panel>

      <Panel title="Safes" note="Nine colours × three states, all from one component.">
        <div className="grid max-w-[360px] grid-cols-5 gap-2">
          {Array.from({ length: 9 }, (_, i) => <Safe key={i} digit={i + 1} state="available" />)}
        </div>
        <div className="mt-3 grid max-w-[360px] grid-cols-5 gap-2">
          {Array.from({ length: 9 }, (_, i) => <Safe key={i} digit={i + 1} state="solved" />)}
        </div>
      </Panel>

      <Panel title="At real size" note="Props render around 40–64px in the app. This is the honest test.">
        <div className="flex items-end gap-3">
          {[
            <Trophy key="t" />, <GiftBox key="g" />, <Key key="k" />,
            <Stopwatch key="s" />, <HintBulb key="h" />, <Medal key="m" rank={1} />,
          ].map((el, i) => (
            <div key={i} className="h-11 w-11">{el}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
