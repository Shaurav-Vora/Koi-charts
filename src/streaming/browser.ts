import type { MicrophoneLike, SocketLike } from "./session";

/** Browser adapters for StreamingSession. Kept apart from the session so its logic stays testable in Node. */

export async function fetchStreamingToken(): Promise<{ token: string; expiresAt: string }> {
  // The provider key never reaches the browser; this app's own route mints a short-lived token.
  const response = await fetch("/api/assemblyai/token", {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}",
  });
  if (!response.ok) throw new Error(
    response.status === 503 ? "Voice editing is not set up on this server yet."
      : response.status === 429 ? "Too many voice requests. Wait a moment, then start voice again."
      : "Could not start voice input. Check your connection and try again.");
  const body = await response.json() as { token?: unknown; expiresAt?: unknown };
  if (typeof body.token !== "string" || !body.token) throw new Error("The server returned an invalid voice token.");
  return { token: body.token, expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : "" };
}

export function openBrowserSocket(url: string): SocketLike {
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  const adapter: SocketLike = {
    send: data => { if (socket.readyState === WebSocket.OPEN) socket.send(data); },
    close: () => { if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) socket.close(); },
    onopen: null, onmessage: null, onclose: null, onerror: null,
  };
  socket.onopen = () => adapter.onopen?.();
  // Control messages are text; anything binary is not part of the streaming protocol.
  socket.onmessage = event => { if (typeof event.data === "string") adapter.onmessage?.(event.data); };
  socket.onclose = () => adapter.onclose?.();
  socket.onerror = () => adapter.onerror?.();
  return adapter;
}

export async function openMicrophone(): Promise<MicrophoneLike> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot capture microphone audio.");
  // Echo cancellation keeps spoken feedback from being transcribed back as a command.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
  let context: AudioContext | undefined, node: AudioWorkletNode | undefined, source: MediaStreamAudioSourceNode | undefined;
  const release = async () => {
    node?.disconnect(); source?.disconnect();
    for (const track of stream.getTracks()) track.stop();
    if (context && context.state !== "closed") await context.close();
  };
  try {
    context = new AudioContext();
    await context.audioWorklet.addModule("/audio/pcm16-worklet.js");
    // A context created outside a user gesture can start suspended.
    if (context.state === "suspended") await context.resume();
    source = context.createMediaStreamSource(stream);
    node = new AudioWorkletNode(context, "koi-pcm16");
    source.connect(node);
    // A worklet with no path to the destination may be descheduled; a silent gain keeps it running.
    const silence = context.createGain();
    silence.gain.value = 0;
    node.connect(silence).connect(context.destination);
  } catch (error) {
    await release();
    throw error instanceof Error ? error : new Error("Could not start audio processing.");
  }
  const worklet = node;
  return {
    onFrame: callback => { worklet.port.onmessage = event => callback(event.data.buffer, event.data.level); },
    stop: release,
  };
}
