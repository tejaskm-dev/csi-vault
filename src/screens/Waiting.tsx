import { useNavigate, useSearchParams } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";

/** Holding screen. `?state=post` for the after-the-run variant. */
export function Waiting() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isPost = params.get("state") === "post";

  return (
    <div>
      <h1>{isPost ? "You cracked it" : "Vault opens soon"}</h1>
      <p>
        {isPost
          ? "Results drop when everyone's done. Check the leaderboard in the meantime."
          : "Hang tight — the event is about to begin. Keep this screen open."}
      </p>

      {isPost && (
        <PrimaryButton onClick={() => navigate("/leaderboard")}>
          VIEW LEADERBOARD
        </PrimaryButton>
      )}
    </div>
  );
}
