import { useCallback, useEffect, useRef, useState } from "react";
import { PrimaryButton } from "../components/PrimaryButton";
import { playTap, playWrong } from "../lib/sound";
import type { MinigameProps } from "./types";

/**
 * VAULT RUNNER — one-button survival. Tap to rise, gravity does the rest.
 *
 * The Flappy Bird of the set, and the only genuinely twitchy thing in the
 * game. It exists because every other challenge is deliberate and considered,
 * and a room needs one moment of pure noise where everybody is jabbing at a
 * screen and groaning.
 *
 * Rendered to a canvas rather than DOM: sixty phones running a 60fps loop over
 * animated divs is how you find out which ones are three years old.
 *
 * Gradeable only within bounds — the client reports gates passed and how long
 * it took, and the server rejects the physically impossible (more gates than
 * the elapsed time allows). That is weaker than the seeded games and it is
 * stated plainly rather than pretended otherwise; the cost of cheating it is
 * half a vault, and the effort is more than just playing.
 */
const GATES_TO_WIN = 6;
const GAP = 0.34;        // gap height as a fraction of canvas height
const SPEED = 0.19;      // canvas widths per second
const GRAVITY = 1.9;
const FLAP = -0.62;

export function Survival({ seed, onSubmit, busy }: MinigameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<"ready" | "running" | "dead" | "won">("ready");
  const [gates, setGates] = useState(0);

  // All mutable game state in a ref. Putting it in React state would re-render
  // the tree sixty times a second to redraw a canvas that React never touches.
  const game = useRef({
    y: 0.5, vy: 0, t: 0, started: 0, gates: 0,
    pipes: [] as { x: number; gapY: number; scored: boolean }[],
    seedN: seed,
  });

  const flap = useCallback(() => {
    if (state === "ready") { start(); return; }
    if (state !== "running") return;
    game.current.vy = FLAP;
    playTap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const start = () => {
    game.current = {
      y: 0.5, vy: 0, t: 0, started: performance.now(), gates: 0,
      pipes: [], seedN: seed,
    };
    setGates(0);
    setState("running");
  };

  /**
   * Paint a still frame whenever the game is NOT running.
   *
   * The render loop lives in the effect below and only starts on "running", so
   * before the first tap — and after a crash — the canvas was never drawn at
   * all. A blank white rectangle the height of the screen, with no indication
   * it is even a game. That is what "TAP TO FLY" was sitting under.
   *
   * This draws the ground state: the bird where it starts, and on a crash the
   * pipes it died against, so the player can see what happened.
   */
  useEffect(() => {
    if (state === "running") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#F5F2E8";
    ctx.fillRect(0, 0, W, H);

    // The blueprint grid, so an idle canvas belongs to the same world as every
    // other surface in the app rather than being a white hole in the page.
    ctx.strokeStyle = "#DED8C6";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.strokeStyle = "#1F1F1F";
    ctx.lineWidth = 3;

    // On a crash, leave the wreck on screen.
    if (state === "dead") {
      for (const p of game.current.pipes) {
        const px = p.x * W, pw = 0.14 * W;
        ctx.fillStyle = "#2ECC71";
        const topH = (p.gapY - GAP / 2) * H;
        const botY = (p.gapY + GAP / 2) * H;
        ctx.fillRect(px - pw / 2, 0, pw, topH);
        ctx.strokeRect(px - pw / 2, 0, pw, topH);
        ctx.fillRect(px - pw / 2, botY, pw, H - botY);
        ctx.strokeRect(px - pw / 2, botY, pw, H - botY);
      }
    }

    const y = state === "dead" ? game.current.y : 0.5;
    ctx.fillStyle = "#E53935";
    ctx.beginPath();
    ctx.arc(0.26 * W, Math.min(Math.max(y, 0), 1) * H, 0.035 * W, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }, [state]);

  useEffect(() => {
    if (state !== "running") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    let last = performance.now();
    // Pipe positions come from the seed so every player on the same challenge
    // gets the same run — otherwise "I got a harder one" is a real complaint.
    let nextSeed = game.current.seedN;
    const nextGapY = () => {
      nextSeed = (nextSeed * 1664525 + 1013904223) >>> 0;
      return 0.22 + (nextSeed / 4294967296) * 0.56;
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp: tab switches
      last = now;
      const g = game.current;

      g.vy += GRAVITY * dt;
      g.y += g.vy * dt;
      g.t += dt;

      if (!g.pipes.length || g.pipes[g.pipes.length - 1].x < 0.62) {
        g.pipes.push({ x: 1.1, gapY: nextGapY(), scored: false });
      }
      for (const p of g.pipes) p.x -= SPEED * dt;
      g.pipes = g.pipes.filter((p) => p.x > -0.2);

      const W = canvas.width, H = canvas.height;
      const bx = 0.26, br = 0.035;

      let dead = g.y < 0 || g.y > 1;
      for (const p of g.pipes) {
        if (Math.abs(p.x - bx) < 0.07 + br) {
          if (g.y < p.gapY - GAP / 2 || g.y > p.gapY + GAP / 2) dead = true;
        }
        if (!p.scored && p.x < bx - 0.07) {
          p.scored = true;
          g.gates += 1;
          setGates(g.gates);
        }
      }

      // --- paint ---
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#F5F2E8"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#1F1F1F"; ctx.lineWidth = 3;
      for (const p of g.pipes) {
        const px = p.x * W, pw = 0.14 * W;
        ctx.fillStyle = "#2ECC71";
        const topH = (p.gapY - GAP / 2) * H;
        const botY = (p.gapY + GAP / 2) * H;
        ctx.fillRect(px - pw / 2, 0, pw, topH);
        ctx.strokeRect(px - pw / 2, 0, pw, topH);
        ctx.fillRect(px - pw / 2, botY, pw, H - botY);
        ctx.strokeRect(px - pw / 2, botY, pw, H - botY);
      }
      ctx.fillStyle = "#E53935";
      ctx.beginPath();
      ctx.arc(bx * W, g.y * H, br * W, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      if (g.gates >= GATES_TO_WIN) {
        setState("won");
        void onSubmit({
          gates: g.gates,
          ms: Math.round(performance.now() - g.started),
        });
        return;
      }
      if (dead) { playWrong(); setState("dead"); return; }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, onSubmit]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">
          Gates
        </span>
        <span className="font-display text-[20px] text-ink">
          {gates} / {GATES_TO_WIN}
        </span>
      </div>

      <div
        className="ink overflow-hidden rounded-plate shadow-ink"
        onPointerDown={(e) => { e.preventDefault(); flap(); }}
        style={{ touchAction: "none" }}
      >
        <canvas ref={canvasRef} width={360} height={440} className="block w-full" />
      </div>

      {state === "ready" && (
        <PrimaryButton className="w-full" disabled={busy} onClick={start}>
          TAP TO FLY
        </PrimaryButton>
      )}
      {state === "dead" && (
        <PrimaryButton className="w-full" disabled={busy} onClick={start}>
          AGAIN — {gates} GATE{gates === 1 ? "" : "S"}
        </PrimaryButton>
      )}
      {state === "running" && (
        <p className="text-center font-body text-[13px] font-semibold text-ink/55">
          Tap anywhere on the screen.
        </p>
      )}
    </div>
  );
}
