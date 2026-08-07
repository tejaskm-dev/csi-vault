import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";

export function BonusFound() {
  const navigate = useNavigate();

  return (
    <div>
      <p>Bonus found</p>
      <h1>You spotted the extra</h1>
      <p>
        One more question, off the board. It doesn't cost you a digit and it
        doesn't cost you time.
      </p>

      <PrimaryButton variant="reward" onClick={() => navigate("/challenge/bonus")}>
        PLAY BONUS
      </PrimaryButton>
      <Pressable onClick={() => navigate("/vault")}>Maybe later</Pressable>
    </div>
  );
}
