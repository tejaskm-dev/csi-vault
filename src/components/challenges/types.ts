import type { Challenge } from "../../data/mockData";
import type { SubmitResult } from "../../lib/api";

/**
 * The contract every challenge kind implements.
 *
 * A task owns its own body and its own commit control, because the shape of
 * "how do I answer this" varies too much to force through one CRACK IT button:
 * a colour trap is answered by tapping a swatch, a photo task by opening a
 * camera, and a find-and-connect by walking across a room and waiting for
 * somebody else's phone.
 *
 * What a task never owns is the verdict. It calls `submit` and renders what
 * comes back — which, live, was decided in Postgres.
 */
export interface TaskProps {
  challenge: Challenge;
  /** Hands the answer to the server (or the mock key offline). */
  submit: (answer: Record<string, unknown>) => Promise<SubmitResult>;
  /** Correct. The screen takes over from here and runs the unlock. */
  onCorrect: () => void;
  /** Wrong. The screen raises the miss beat. */
  onWrong: () => void;
  /** Locked out while checking or after a win. */
  busy?: boolean;
}
