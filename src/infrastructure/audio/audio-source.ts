// One way of feeding sound into the AudioEngine's analyser. New kinds of input are new classes, and the
// engine never changes (open/closed).

export type SourceKind = "demo" | "mic" | "file" | "stream";

export interface AudioGraph {
  ctx: AudioContext;
  /** Connect sound here to have it analysed. */
  analyser: AnalyserNode;
  /** Connect sound here to have it heard. */
  speakers: AudioNode;
}

export interface AudioSource {
  readonly kind: SourceKind;
  /** Start feeding the graph. Returns a function that stops and releases everything it started. */
  start(graph: AudioGraph): (() => void) | Promise<() => void>;
}
