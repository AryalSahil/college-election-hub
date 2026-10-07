import { useCallback, useEffect, useState } from "react";

/**
 * Browser Fullscreen API wrapper. `toggle()` must be called from a user
 * gesture (button click). We follow the browser's own `fullscreenchange`
 * events, so pressing Esc or using browser controls keeps our state truthful
 * — normal browser behavior is never blocked.
 */
export function useFullscreen() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function onChange() {
      setActive(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // The browser refused (unsupported context or permission) — the app
      // simply stays in normal windowed mode.
    }
  }, []);

  return { active, toggle };
}

export default useFullscreen;
