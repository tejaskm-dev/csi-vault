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
import { GameProvider } from "./context/GameContext";
import { PageWrapper } from "./components/PageWrapper";
import { Blueprint } from "./components/Blueprint";

function GameShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const variant = pathname.startsWith("/challenge") ? "challenge"
                : pathname === "/vault-complete"    ? "dark"
                : pathname === "/success/bonus"     ? "yellow"
                : pathname.startsWith("/success")   ? "green"
                : pathname === "/bonus-found"       ? "yellow"
                : "default";

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
