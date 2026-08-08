import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { Splash } from "./screens/Splash";
import { NameEntry } from "./screens/NameEntry";
import { Home } from "./screens/Home";
import { VaultGrid } from "./screens/VaultGrid";
import { ChallengeScreen } from "./screens/ChallengeScreen";
import { Success } from "./screens/Success";
import { VaultComplete } from "./screens/VaultComplete";
import { Leaderboard } from "./screens/Leaderboard";
import { Winner } from "./screens/Winner";
import { BonusFound } from "./screens/BonusFound";
import { Waiting } from "./screens/Waiting";
import { SafePreview } from "./screens/SafePreview";
import { AssetsPreview } from "./screens/AssetsPreview";
import { GameProvider } from "./context/GameContext";
import { PageWrapper } from "./components/PageWrapper";
import { Blueprint } from "./components/Blueprint";
import { scrollToTop } from "./lib/scroll";

/**
 * What the browser paints ABOVE the page when you overscroll.
 *
 * On a phone, flicking up past the top rubber-bands and reveals whatever is
 * behind the document — which was the cream page colour, so a band of cream
 * appeared over a red header. Matching it to the header tone means the gap is
 * invisible: the header simply looks like it continues off the top.
 *
 * Keyed by the same routes that pick the header's tone, so the two cannot
 * drift apart.
 */
function topColorFor(pathname: string) {
  if (pathname === "/leaderboard") return "#E53935";        // red
  if (pathname === "/vault") return "#E53935";
  if (pathname === "/home") return "#E53935";
  if (pathname === "/name") return "#E53935";
  if (pathname === "/challenge/bonus") return "#FFB02E";    // brass
  if (pathname.startsWith("/challenge")) return "#E53935";
  if (pathname === "/bonus-found") return "#FFB02E";
  if (pathname === "/success/bonus") return "#6C5CE7";      // purple plate
  if (pathname.startsWith("/success")) return "#2ECC71";    // green plate
  if (pathname === "/waiting") return "#1F1F1F";            // ink
  return "#F5F2E8";                                          // paper
}

function GameShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const variant = pathname.startsWith("/challenge") ? "challenge"
                // Warm, not dark. The climax screen on an ink background read
                // as a different app from every other screen in the game.
                : pathname === "/vault-complete"    ? "yellow"
                : pathname === "/success/bonus"     ? "yellow"
                : pathname.startsWith("/success")   ? "green"
                : pathname === "/bonus-found"       ? "yellow"
                : "default";

  // `overscroll-behavior` (set in index.css) stops the bounce outright on
  // modern browsers; this is the fallback for anything that still rubber-bands,
  // and it costs one style write per navigation.
  useEffect(() => {
    document.documentElement.style.backgroundColor = topColorFor(pathname);

    // The browser keeps the scroll offset across a route change. That never
    // mattered while every screen fit the viewport, but the leaderboard and
    // the results now scroll — so leaving one of them halfway down dropped
    // you into the middle of the next screen.
    scrollToTop();
  }, [pathname]);

  return (
    <div className="min-h-dvh w-full bg-paper md:bg-paper-deep md:py-8">
      {/* The phone IS the frame on mobile. The decorative border and rounding
          only appear from md: up, where there is a desktop page around it. */}
      <div
        className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col
                   overflow-x-hidden bg-paper
                   md:min-h-0 md:rounded-[32px] md:border-3 md:border-ink md:shadow-[0_8px_0_0_var(--color-ink)]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <Blueprint variant={variant} />
        <main className="relative z-10 flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Splash /></PageWrapper>} />
        <Route path="/name" element={<PageWrapper><NameEntry /></PageWrapper>} />
        <Route path="/home" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/vault" element={<PageWrapper><VaultGrid /></PageWrapper>} />
        <Route path="/challenge/:id" element={<PageWrapper><ChallengeScreen /></PageWrapper>} />
        <Route path="/success/:id" element={<PageWrapper><Success /></PageWrapper>} />
        <Route path="/vault-complete" element={<PageWrapper><VaultComplete /></PageWrapper>} />
        <Route path="/leaderboard" element={<PageWrapper><Leaderboard /></PageWrapper>} />
        <Route path="/winner" element={<PageWrapper><Winner /></PageWrapper>} />
        <Route path="/bonus-found" element={<PageWrapper><BonusFound /></PageWrapper>} />
        <Route path="/safes" element={<SafePreview />} />
            <Route path="/assets" element={<AssetsPreview />} />
            <Route path="/waiting" element={<PageWrapper><Waiting /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><Splash /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Router>
        <GameShell>
          <AnimatedRoutes />
        </GameShell>
      </Router>
    </GameProvider>
  );
}
