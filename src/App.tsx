import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import { GameProvider } from "./context/GameContext";

export default function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/name" element={<NameEntry />} />
          <Route path="/home" element={<Home />} />
          <Route path="/vault" element={<VaultGrid />} />
          <Route path="/challenge/:id" element={<ChallengeScreen />} />
          <Route path="/success/:id" element={<Success />} />
          <Route path="/vault-complete" element={<VaultComplete />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/winner" element={<Winner />} />
          <Route path="/bonus-found" element={<BonusFound />} />
          <Route path="/waiting" element={<Waiting />} />
          <Route path="*" element={<Splash />} />
        </Routes>
      </Router>
    </GameProvider>
  );
}
