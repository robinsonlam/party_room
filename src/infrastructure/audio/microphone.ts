import type { AudioGraph, AudioSource } from "./audio-source.ts";

/** Listen to the microphone (e.g. music playing in the room). Analysed only, never sent to the speakers, so no feedback. */
export class Microphone implements AudioSource {
  readonly kind = "mic";

  async start({ ctx, analyser }: AudioGraph): Promise<() => void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    const src = ctx.createMediaStreamSource(stream);
    src.connect(analyser);
    return () => {
      src.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    };
  }
}
