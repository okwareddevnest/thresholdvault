"use client";

import { useEffect } from "react";
import { useUiStore } from "@/state/uiStore";

export function OfflineBanner() {
  const offline = useUiStore((state) => state.offline);
  const setOffline = useUiStore((state) => state.setOffline);

  useEffect(() => {
    const handler = () => {
      setOffline(!navigator.onLine);
    };
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    handler();
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
    };
  }, [setOffline]);

  if (!offline) return null;

  return (
    <div className="bg-bitcoin-gold text-deep-navy">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-sm font-medium">
        <span>Offline Mode Enabled — cached data only</span>
        <span className="text-xs">Writes will resume once you reconnect.</span>
      </div>
    </div>
  );
}
