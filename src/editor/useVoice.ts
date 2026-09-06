"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { StreamingSession } from "../streaming/session";
import { fetchStreamingToken, openBrowserSocket, openMicrophone } from "../streaming/browser";
import type { createEditorCoordinator } from "./coordinator";

/**
 * Owns one StreamingSession for the editor. The session is created on first use so
 * loading the page never opens a microphone, a socket, or a billed provider session.
 */
export function useVoice(coordinator: ReturnType<typeof createEditorCoordinator>) {
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const session = useRef<StreamingSession | null>(null);
  const ensure = useCallback(() => {
    session.current ??= new StreamingSession({
      fetchToken: fetchStreamingToken, openSocket: openBrowserSocket, openMicrophone,
      onSessionStart: id => coordinator.turns.start(id),
      onSessionEnd: () => coordinator.turns.stop(),
      onTurn: turn => { void coordinator.turns.accept(turn); },
      onStatus: status => {
        setActive(status === "connecting" || status === "listening");
        if (status !== "listening") setLevel(0);
        coordinator.present({ status, preview: null, text: "" });
      },
      onLevel: setLevel,
      onError: message => coordinator.present({ status: "error", preview: null, text: "", error: message }),
    });
    return session.current;
  }, [coordinator]);
  // Streaming is billed for how long the socket stays open, so release it on unmount and on
  // the page going away — a closed tab must not leave a session running.
  useEffect(() => {
    const release = () => { void session.current?.stop(); };
    window.addEventListener("pagehide", release);
    return () => { window.removeEventListener("pagehide", release); release(); };
  }, []);
  return {
    active, level,
    start: useCallback(() => { void ensure().start(); }, [ensure]),
    stop: useCallback(() => { void session.current?.stop(); }, []),
  };
}
