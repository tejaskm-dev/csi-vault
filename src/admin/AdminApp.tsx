import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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
      <Route path="" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
