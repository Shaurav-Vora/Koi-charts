import type { Turn } from "./turns";
import type { VoiceStatus } from "../editor/status";

/** Verified against AssemblyAI Streaming v3 documentation on 2026-09-06. */
const ENDPOINT = "wss://streaming.assemblyai.com/v3/ws";
const SAMPLE_RATE = 16000;
const SPEECH_MODEL = "universal-3-5-pro";
/** Matches max_session_duration_seconds requested when the server mints the token. */
export const MAX_SESSION_MS = 30 * 60 * 1000;

export interface SocketLike {
  send(data: string | ArrayBuffer): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((data: string) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}
export interface MicrophoneLike {
  onFrame(callback: (buffer: ArrayBuffer, level: number) => void): void;
  stop(): Promise<void>;
}
export interface SessionOptions {
  fetchToken: () => Promise<{ token: string; expiresAt: string }>;
  openSocket: (url: string) => SocketLike;
  openMicrophone: () => Promise<MicrophoneLike>;
  onTurn: (turn: Turn) => void;
  onStatus: (status: VoiceStatus) => void;
  onLevel: (level: number) => void;
  onError: (message: string) => void;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: () => void;
  isInputSuppressed?: () => boolean;
}

/**
 * Owns one streaming connection: a fresh token, the socket, the microphone, and their teardown.
 * Streaming is billed for socket duration, so every exit path terminates and closes explicitly.
 */
export class StreamingSession {
  private generation = 0;
  private socket: SocketLike | null = null;
  private microphone: MicrophoneLike | null = null;
  private sessionId: string | null = null;
  private ready = false;
  private stopping = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private options: SessionOptions) {}

  /** True once the provider has acknowledged the session with a Begin message. */
  get listening(): boolean { return this.ready; }

  async start(): Promise<void> {
    await this.stop();
    const generation = ++this.generation;
    this.stopping = false;
    this.options.onStatus("connecting");
    let microphone: MicrophoneLike;
    // Open the microphone before minting a token or a billable socket, so a denied
    // permission costs neither a credential nor an open connection.
    try {
      microphone = await this.options.openMicrophone();
    } catch {
      if (generation === this.generation) {
        // Status first, error second, so the explanation is what the reader is left with.
        this.options.onStatus("idle");
        this.options.onError("Microphone unavailable. Allow microphone access in your browser, then start voice again.");
      }
      return;
    }
    if (generation !== this.generation) { await microphone.stop(); return; }
    this.microphone = microphone;

    let token: string;
    try {
      token = (await this.options.fetchToken()).token;
    } catch (error) {
      await this.fail(generation, error instanceof Error ? error.message : "Could not start voice input.");
      return;
    }
    if (generation !== this.generation) return;

    const url = new URL(ENDPOINT);
    url.searchParams.set("token", token);
    url.searchParams.set("sample_rate", String(SAMPLE_RATE));
    url.searchParams.set("speech_model", SPEECH_MODEL);
    let socket: SocketLike;
    try {
      socket = this.options.openSocket(url.toString());
    } catch (error) {
      await this.fail(generation, error instanceof Error ? error.message : "Could not reach the speech service.");
      return;
    }
    this.socket = socket;
    socket.onmessage = data => this.receive(generation, data);
    socket.onerror = () => { if (generation === this.generation && !this.stopping) void this.lost(generation); };
    socket.onclose = () => { if (generation === this.generation && !this.stopping) void this.lost(generation); };

    microphone.onFrame((buffer, level) => {
      if (generation !== this.generation) return;
      const suppressed = this.options.isInputSuppressed?.() ?? false;
      this.options.onLevel(suppressed ? 0 : level);
      // Frames sent before Begin are rejected by the provider, so hold them until the session is ready.
      if (!this.ready || this.stopping) return;
      // Maintain PCM timing while keeping spoken replies out of transcription.
      try { socket.send(suppressed ? new ArrayBuffer(buffer.byteLength) : buffer); } catch { /* a closing socket is handled by onclose */ }
    });

    this.timer = setTimeout(() => { void this.stop(); }, MAX_SESSION_MS);
  }

  async stop(): Promise<void> {
    if (!this.socket && !this.microphone) { this.generation++; return; }
    this.generation++;
    this.stopping = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const socket = this.socket, microphone = this.microphone;
    this.socket = null; this.microphone = null; this.ready = false; this.sessionId = null;
    if (socket) {
      try { socket.send(JSON.stringify({ type: "Terminate" })); } catch { /* already closed */ }
      try { socket.close(); } catch { /* already closed */ }
    }
    if (microphone) await microphone.stop();
    this.options.onSessionEnd?.();
    this.options.onStatus("idle");
  }

  private async fail(generation: number, message: string): Promise<void> {
    if (generation !== this.generation) return;
    await this.stop();
    this.options.onError(message);
  }

  /** An unrequested close keeps committed work and manual editing available. */
  private async lost(generation: number): Promise<void> {
    if (generation !== this.generation) return;
    this.generation++;
    this.stopping = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const microphone = this.microphone;
    this.socket = null; this.microphone = null; this.ready = false; this.sessionId = null;
    // A dropped socket arrives from an event handler nobody awaits, so report the status
    // before releasing the device; otherwise the UI lags a microtask behind the loss.
    this.options.onSessionEnd?.();
    this.options.onStatus("voice_unavailable");
    if (microphone) await microphone.stop();
  }

  private receive(generation: number, data: string): void {
    if (generation !== this.generation) return;
    let message: unknown;
    try { message = JSON.parse(data); } catch { return; }
    if (!message || typeof message !== "object") return;
    const payload = message as Record<string, unknown>;
    if (payload.type === "Begin" && typeof payload.id === "string") {
      this.sessionId = payload.id; this.ready = true;
      this.options.onSessionStart?.(payload.id);
      this.options.onStatus("listening");
      return;
    }
    if (payload.type === "Turn" && this.sessionId) {
      const text = typeof payload.transcript === "string" ? payload.transcript : "";
      if (!text) return;
      this.options.onTurn({ sessionId: this.sessionId, turnId: String(payload.turn_order ?? 0),
        text, final: payload.end_of_turn === true });
      return;
    }
    if (payload.type === "Termination") void this.stop();
  }
}
