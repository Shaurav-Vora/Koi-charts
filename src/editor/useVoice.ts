"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { StreamingSession } from "../streaming/session";
import { fetchStreamingToken, openBrowserSocket, openMicrophone } from "../streaming/browser";
import type { createEditorCoordinator } from "./coordinator";
import type { VoiceStatus } from "./status";
import type { VoiceTurnMode } from "./voice-timing";

/**
 * Owns one StreamingSession for the editor. The session is created on first use so
 * loading the page never opens a microphone, a socket, or a billed provider session.
 */
export function useVoice(coordinator: ReturnType<typeof createEditorCoordinator>, isInputSuppressed?: () => boolean, turnMode: VoiceTurnMode = "balanced") {
  const [active, setActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<VoiceStatus>("idle");
  const [level, setLevel] = useState(0);
  const session = useRef<StreamingSession | null>(null);
  const ensure = useCallback(() => {
    session.current ??= new StreamingSession({
      fetchToken: fetchStreamingToken, openSocket: openBrowserSocket, openMicrophone,
      isInputSuppressed, turnMode,
      onSessionStart: id => coordinator.turns.start(id),
      onSessionEnd: () => coordinator.turns.stop(),
      onTurn: turn => { void coordinator.turns.accept(turn); },
      onStatus: status => {
        setConnectionStatus(status);
        setActive(status === "connecting" || status === "listening");
        if (status !== "listening") setLevel(0);
        coordinator.present({ status, preview: null, text: "" });
      },
      onLevel: setLevel,
      onError: message => coordinator.present({ status: "error", preview: null, text: "", error: message }),
    });
    return session.current;
  }, [coordinator, isInputSuppressed, turnMode]);
  useEffect(() => { session.current?.setTurnMode(turnMode); }, [turnMode]);
  // Streaming is billed for how long the socket stays open, so release it on unmount and on
  // the page going away — a closed tab must not leave a session running.
  useEffect(() => {
    const release = () => { void session.current?.stop(); };
    window.addEventListener("pagehide", release);
    return () => { window.removeEventListener("pagehide", release); release(); };
  }, []);
  return {
    active, level, connectionStatus,
    start: useCallback(() => { void ensure().start(); }, [ensure]),
    stop: useCallback(() => { void session.current?.stop(); }, []),
  };
}
