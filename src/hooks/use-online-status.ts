import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Tracks `navigator.onLine`. The server snapshot assumes online so the
 * indicator never flashes during hydration. Note that `onLine === true` only
 * means a network interface is up, not that the internet is reachable.
 */
export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
