import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
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
import { Backdrop } from "./components/Backdrop";
import { GameProvider } from "./context/GameContext";
import { AnimatePresence, motion } from "framer-motion";
import { SETTLE } from "./lib/motion";

/**
 * SETTLE lives here and only here. Screens must not add their own entrance
 * animation — two stacked transitions is what made the first pass feel mushy.
 */
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={SETTLE.initial}
      animate={SETTLE.animate}
      exit={SETTLE.exit}
      transition={SETTLE.transition}
      className="relative z-10 w-full min-h-dvh"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  const backdropVariant = location.pathname === "/vault-complete"
    ? "dark"
    : location.pathname.startsWith("/challenge")
      ? "challenge"
      : "default";

  return (
    <>
      <Backdrop variant={backdropVariant} />
      <AnimatePresence mode="wait" initial={false}>
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
          <Route path="/waiting" element={<PageWrapper><Waiting /></PageWrapper>} />
          <Route path="*" element={<PageWrapper><Splash /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Router>
        <div className="relative mx-auto min-h-dvh max-w-md overflow-x-hidden bg-off-white font-sans text-charcoal">
          <AnimatedRoutes />
        </div>
      </Router>
    </GameProvider>
  );
}
