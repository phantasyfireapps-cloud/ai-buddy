import { useEffect, useState } from "react";
import { isFullscreen, quitApp, setFullscreen, showWindowsDesktop } from "../lib/desktop";

/** Always-available control for leaving full-screen or returning to Windows. */
export function WindowMenu() {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const refresh = () => void isFullscreen().then(setFull);
    refresh();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        void isFullscreen().then((f) => setFullscreen(!f).then(refresh));
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", refresh);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", refresh);
    };
  }, []);

  const run = (fn: () => Promise<void>) => async () => {
    setOpen(false);
    await fn();
    setFull(await isFullscreen());
  };

  return (
    <div className="window-menu">
      <button className="window-menu-toggle" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label="Window options">
        ⋯
      </button>
      {open && (
        <div className="window-menu-list" role="menu">
          <button role="menuitem" onClick={run(() => setFullscreen(!full))}>
            {full ? "Exit full screen" : "Full screen"}
          </button>
          <button role="menuitem" onClick={run(showWindowsDesktop)}>
            Show Windows desktop
          </button>
          <button role="menuitem" onClick={run(quitApp)}>
            Close AI Buddy
          </button>
        </div>
      )}
    </div>
  );
}
