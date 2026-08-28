import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "webilo.kitchen.sound";

function readPref() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

// New-order / order-ready audio cues for the kitchen board. Off by default and
// per-user (localStorage). Browsers block programmatic Audio.play() until the
// page has had a user gesture, so callers must flip this on via a visible
// button — setSoundEnabled(true) primes playback inside that click.
export function useKitchenSound() {
  const [soundEnabled, setSoundEnabled] = useState(readPref);
  const newOrderRef = useRef(null);
  const readyRef = useRef(null);

  useEffect(() => {
    newOrderRef.current = new Audio("/sounds/new-order.wav");
    readyRef.current = new Audio("/sounds/order-ready.wav");
    [newOrderRef, readyRef].forEach((ref) => {
      if (ref.current) ref.current.preload = "auto";
    });
  }, []);

  const persist = (next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      // Private browsing can block storage; the toggle still works in-session.
    }
  };

  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    persist(true);
    const cue = newOrderRef.current;
    if (!cue) return;
    // Prime within the click gesture, then rewind so it's silent now.
    cue.play()
      .then(() => {
        cue.pause();
        cue.currentTime = 0;
      })
      .catch(() => {});
  }, []);

  const disableSound = useCallback(() => {
    setSoundEnabled(false);
    persist(false);
  }, []);

  const playNewOrder = useCallback(() => {
    if (!soundEnabled || !newOrderRef.current) return;
    newOrderRef.current.currentTime = 0;
    newOrderRef.current.play().catch(() => {});
  }, [soundEnabled]);

  const playReady = useCallback(() => {
    if (!soundEnabled || !readyRef.current) return;
    readyRef.current.currentTime = 0;
    readyRef.current.play().catch(() => {});
  }, [soundEnabled]);

  return { soundEnabled, enableSound, disableSound, playNewOrder, playReady };
}
