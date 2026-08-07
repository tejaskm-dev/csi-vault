import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";

export function Splash() {
  const navigate = useNavigate();
  const { username } = useGame();

  useEffect(() => {
    const timer = setTimeout(
      () => navigate(username ? "/home" : "/name", { replace: true }),
      1800
    );
    return () => clearTimeout(timer);
  }, [navigate, username]);

  return (
    <div>
      <h1>Operation</h1>
      <h1>Vault</h1>
      <p>CSI ASIET</p>
    </div>
  );
}
