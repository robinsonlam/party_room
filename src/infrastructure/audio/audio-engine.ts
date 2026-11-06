// Web Audio adapter for the SpectrumSource port: plays one AudioSource at a time and reports its spectrum.

import type { SpectrumSource } from "../../application/ports.ts";
import type { AudioGraph, AudioSource, SourceKind } from "./audio-source.ts";
import { DemoBeat } from "./demo-beat.ts";
import { MediaElement } from "./media-element.ts";
import { Microphone } from "./microphone.ts";

export class AudioEngine implements SpectrumSource {
  readonly bins = new Uint8Array(1024); // fftSize 2048 -> 1024 bins, one per cube as in 2015
  kind: SourceKind | null = null;
  private graph: AudioGraph | null = null;
  private stopCurrent: (() => void) | null = null;
  /** Bumped on every play/stop, so a slow source (the mic prompt) can't start after it was replaced. */
  private generation = 0;

  /** Must first be called from a user gesture (click) so the browser allows audio. */
  private audioGraph(): AudioGraph {
    if (!this.graph) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      this.graph = { ctx, analyser, speakers: ctx.destination };
    }
    void this.graph.ctx.resume();
    return this.graph;
  }

  /** Fill `bins` with the latest spectrum; all zeros when nothing is playing. */
  read(): Uint8Array {
    if (this.graph && this.kind) this.graph.analyser.getByteFrequencyData(this.bins);
    else this.bins.fill(0);
    return this.bins;
  }

  /** Stop whatever is playing and start `source`. Call from a click. */
  async play(source: AudioSource): Promise<void> {
    this.stop();
    const generation = this.generation;
    const stop = await source.start(this.audioGraph());
    if (generation !== this.generation) return stop();
    this.kind = source.kind;
    this.stopCurrent = stop;
  }

  stop(): void {
    this.generation++;
    this.stopCurrent?.();
    this.stopCurrent = null;
    this.kind = null;
  }

  // Convenience methods for the built-in sources.

  playDemo(): void {
    void this.play(new DemoBeat());
  }

  useMicrophone(): Promise<void> {
    return this.play(new Microphone());
  }

  /** Returns the <audio> element (with controls) for the page to show. */
  playFile(file: File): HTMLAudioElement {
    const source = MediaElement.file(file);
    void this.play(source);
    return source.element;
  }

  /** Stream a CORS-enabled URL. `onError` fires if it can't be loaded or played. Returns the <audio> element. */
  playUrl(url: string, onError?: (message: string) => void): HTMLAudioElement {
    const source = MediaElement.stream(url, onError);
    void this.play(source);
    return source.element;
  }

  async close(): Promise<void> {
    this.stop();
    await this.graph?.ctx.close();
    this.graph = null;
  }
}
