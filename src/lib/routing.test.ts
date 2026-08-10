import { redirectFor, landingFor, type RouteState } from "./routing";

const S = (o: Partial<RouteState>): RouteState =>
  ({ live: true, booted: true, hasPlayer: false, ...o });

const PATHS = ["/", "/name", "/booting", "/home", "/vault", "/challenge/3",
               "/waiting", "/leaderboard", "/winner", "/safes"];

let fails = 0;
const check = (label: string, s: RouteState, expect: Record<string,string|null>) => {
  for (const p of PATHS) {
    const got = redirectFor(s, p);
    const want = p in expect ? expect[p] : null;
    if (got !== want) { fails++; console.log(`  FAIL ${label} @ ${p}: got ${got} want ${want}`); }
  }
  console.log(`  ${label}`);
};

console.log("offline is never guarded");
check("offline", S({ live:false, hasPlayer:false }), {});

console.log("\nstill booting — never bounce a returning player");
check("connecting", S({ booted:false }), {});

console.log("\nno player, game live");
check("stranger", S({ phase:"live" }), {
  "/home":"/name", "/vault":"/name", "/challenge/3":"/name",
  "/waiting":"/name", "/leaderboard":"/name", "/winner":"/name" });

console.log("\njoined, lobby — boots then waits");
check("lobby", S({ hasPlayer:true, phase:"lobby" }), {
  "/":"/booting", "/name":"/booting",
  "/home":"/waiting", "/vault":"/waiting", "/challenge/3":"/waiting",
  "/leaderboard":"/waiting", "/winner":"/waiting" });

console.log("\njoined, live — pushed off the waiting room");
check("live", S({ hasPlayer:true, phase:"live" }), {
  "/":"/booting", "/name":"/booting", "/waiting":"/home" });

console.log("\nended, played");
check("ended+player", S({ hasPlayer:true, phase:"ended" }), {
  "/":"/winner", "/name":"/winner", "/booting":"/winner",
  "/home":"/winner", "/vault":"/winner", "/challenge/3":"/winner",
  "/waiting":"/winner", "/safes":null });

console.log("\nended, never played — may read results, not trapped");
check("ended+stranger", S({ hasPlayer:false, phase:"ended" }), {
  "/home":"/name", "/vault":"/name", "/challenge/3":"/name", "/waiting":"/name" });

console.log("\nboot hand-off");
const landings: [string, RouteState][] = [
  ["lobby",  S({ hasPlayer:true, phase:"lobby" })],
  ["live",   S({ hasPlayer:true, phase:"live"  })],
  ["ended",  S({ hasPlayer:true, phase:"ended" })],
];
for (const [n,s] of landings) console.log(`  ${n} -> ${landingFor(s)}`);

console.log("\nno redirect loops");
for (const s of [S({phase:"live"}), S({hasPlayer:true,phase:"lobby"}),
                 S({hasPlayer:true,phase:"live"}), S({hasPlayer:true,phase:"ended"}),
                 S({hasPlayer:false,phase:"ended"})]) {
  for (const p of PATHS) {
    let cur = p, hops = 0;
    while (hops++ < 6) { const n = redirectFor(s, cur); if (!n || n === cur) break; cur = n; }
    if (hops > 5) { fails++; console.log(`  FAIL loop from ${p}`); }
  }
}
console.log(fails ? `\n${fails} FAILURES` : "\nall routing cases pass, no loops");
