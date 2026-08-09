import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import { Display } from "./Display";
import { Login } from "./Login";

/**
 * Admin lives outside the game shell.
 *
 * The player app is locked to a 480px column because it is a phone screen.
 * These are a laptop and a projector, so they render straight into the
 * viewport with no phone frame around them.
 *
 * The session is component state and nothing more: no token, no storage, gone
 * on refresh. That is on purpose while there is no backend — persisting a
 * client-side "signed in" flag would look like auth without being any.
 *
 * /admin/display is deliberately NOT behind the gate. It is the screen that
 * gets thrown at a wall, it shows only what the room can already see, and
 * having to sign in on the projector laptop mid-event is a way to lose two
 * minutes in front of an audience.
 */
export function AdminApp() {
  const [authed, setAuthed] = useState(false);

  // GameShell tints the document to the current header colour, and it does not
  // render here — so arriving from a game route would leave the page behind
  // the admin screens red. Overscroll on a projector would show it.
  useEffect(() => {
    document.documentElement.style.backgroundColor = "#F5F2E8";
  }, []);

  return (
    <Routes>
      <Route path="display" element={<Display />} />
      {/* `*` already covers the empty path, which is what /admin resolves to
          inside this nested router. There used to be a `path=""` route here
          redirecting to /admin — and React Router ranks an exact "" ABOVE a
          splat, so it won every time, redirected to the URL it was already on,
          matched again, and looped until React tore the tree down. That is
          what rendered as a blank cream page. */}
      <Route
        path="*"
        element={
          authed ? (
            <Dashboard onSignOut={() => setAuthed(false)} />
          ) : (
            <Login onPass={() => setAuthed(true)} />
          )
        }
      />
    </Routes>
  );
}
