import { Safe } from "../components/Safe";

/**
 * Dev-only comparison page. Delete once the safe is signed off.
 * Route: /safes
 */
const ROW: { label: string; state: "available" | "solved" | "locked" }[] = [
  { label: "Available (closed)", state: "available" },
  { label: "Solved (open)", state: "solved" },
  { label: "Locked (disabled)", state: "locked" },
];

export function SafePreview() {
  return (
    <div className="min-h-dvh bg-[#F5F2E8] p-5 font-body">
      <h1 className="font-display text-2xl text-ink">SAFE — CODE VERSION</h1>
      <p className="mb-6 mt-1 text-[13px] text-ink/60">
        Compare against your asset sheet. Middle block is actual board size.
      </p>

      {ROW.map(({ label, state }) => (
        <section key={state} className="mb-7">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">
            {label}
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <Safe key={i} digit={i + 1} state={state} />
            ))}
          </div>
        </section>
      ))}

      <section className="mb-7">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">
          Actual board — 3×3 at real size, mixed states
        </h2>
        <div className="grid max-w-[340px] grid-cols-3 gap-3">
          {[
            "solved", "solved", "available",
            "available", "available", "locked",
            "locked", "locked", "locked",
          ].map((s, i) => (
            <Safe key={i} digit={i + 1} state={s as "available" | "solved" | "locked"} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">
          Small (48px) — does it survive?
        </h2>
        <div className="flex gap-2">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="h-12 w-12">
              <Safe digit={i + 1} state={i < 3 ? "solved" : i < 6 ? "available" : "locked"} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
