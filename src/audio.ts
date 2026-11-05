// Audio sources that work in browsers today: a generated demo beat, the microphone, a local file, or a
// streamed track from a CORS-enabled source (the music picker uses Audius; see music.ts).
// (The 2015 app streamed from SoundCloud's v1 API with a hard-coded client id; that access is gone.)

export type SourceKind = "demo" | "mic" | "file" | "stream";

export class AudioEngine {
  readonly bins = new Uint8Array(1024); // fftSize 2048 -> 1024 bins, one per cube as in 2015
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stopCurrent: (() => void) | null = null;
  kind: SourceKind | null = null;

  /** Must be called from a user gesture (click) so the browser allows audio. */
  private context(): { ctx: AudioContext; analyser: AnalyserNode } {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
    }
    void this.ctx.resume();
    return { ctx: this.ctx, analyser: this.analyser! };
  }

  /** Fill `bins` with the latest spectrum; all zeros when nothing is playing. */
  read(): Uint8Array {
    if (this.analyser && this.kind) this.analyser.getByteFrequencyData(this.bins);
    else this.bins.fill(0);
    return this.bins;
  }

  stop(): void {
    this.stopCurrent?.();
    this.stopCurrent = null;
    this.kind = null;
  }

  /** A short generated loop (kick, hats, bass, chords) at 118 bpm. No samples or copyrighted audio. */
  playDemo(): void {
    this.stop();
    const { ctx, analyser } = this.context();
    const out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(analyser);
    analyser.connect(ctx.destination);

    const beat = 60 / 118;
    const roots = [45, 41, 48, 43]; // A, F, C, G (MIDI)
    const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    noise.getChannelData(0).forEach((_, i, d) => (d[i] = Math.random() * 2 - 1));

    const kick = (t: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.4);
    };
    const hat = (t: number) => {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise;
      f.type = "highpass";
      f.frequency.value = 7000;
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      s.connect(f).connect(g).connect(out);
      s.start(t);
      s.stop(t + 0.08);
    };
    const tone = (t: number, midi: number, len: number, type: OscillatorType, vol: number, cutoff: number) => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = type;
      o.frequency.value = hz(midi);
      f.type = "lowpass";
      f.frequency.value = cutoff;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(f).connect(g).connect(out);
      o.start(t);
      o.stop(t + len + 0.05);
    };

    let step = 0;
    let next = ctx.currentTime + 0.05;
    const schedule = () => {
      while (next < ctx.currentTime + 0.2) {
        const bar = Math.floor(step / 16) % roots.length;
        const root = roots[bar];
        const s = step % 16;
        if (s % 4 === 0) kick(next);
        if (s % 2 === 1) hat(next);
        if (s % 4 === 2) tone(next, root, beat * 0.45, "sawtooth", 0.35, 900);
        if (s === 0) [0, 4, 7, 12].forEach((n) => tone(next, root + 24 + n, beat * 4, "triangle", 0.08, 3000));
        if (s % 3 === 0) tone(next, root + 36 + [0, 7, 12, 16][s % 4], beat * 0.25, "square", 0.04, 4000);
        next += beat / 4;
        step++;
      }
    };
    schedule();
    const timer = window.setInterval(schedule, 50);
    this.kind = "demo";
    this.stopCurrent = () => {
      window.clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      window.setTimeout(() => out.disconnect(), 300);
    };
  }

  /** Listen to the microphone (e.g. music playing in the room). Not routed to the speakers, so no feedback. */
  async useMicrophone(): Promise<void> {
    this.stop();
    const { ctx, analyser } = this.context();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    const src = ctx.createMediaStreamSource(stream);
    src.connect(analyser);
    analyser.disconnect(); // keep the mic silent
    this.kind = "mic";
    this.stopCurrent = () => {
      src.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    };
  }

  /** Play a local audio file the visitor chose. Returns the <audio> element (with controls) for the page to show. */
  playFile(file: File): HTMLAudioElement {
    const url = URL.createObjectURL(file);
    const el = this.playElement(url, "file", { loop: true });
    const stop = this.stopCurrent;
    this.stopCurrent = () => {
      stop?.();
      URL.revokeObjectURL(url);
    };
    return el;
  }

  /**
   * Stream audio from a URL and analyse it. The server must send CORS headers (Audius does): without them the
   * browser silences a cross-origin element routed through Web Audio. Call from a click. `onError` fires if the
   * stream can't be loaded or played. Returns the <audio> element (with controls) for the page to show.
   */
  playUrl(url: string, onError?: (message: string) => void): HTMLAudioElement {
    const el = this.playElement(url, "stream", { crossOrigin: true });
    el.addEventListener("error", () => onError?.("This track couldn't be streamed. Try another one."), { once: true });
    return el;
  }

  private playElement(url: string, kind: SourceKind, opts: { loop?: boolean; crossOrigin?: boolean }): HTMLAudioElement {
    this.stop();
    const { ctx, analyser } = this.context();
    const el = new Audio();
    if (opts.crossOrigin) el.crossOrigin = "anonymous"; // must be set before src, or the analyser reads silence
    el.src = url;
    el.controls = true;
    el.loop = !!opts.loop;
    el.preload = "auto";
    const src = ctx.createMediaElementSource(el);
    src.connect(analyser);
    analyser.connect(ctx.destination);
    el.play().catch(() => {
      /* autoplay refusal or load failure: the element's error event / controls handle it */
    });
    this.kind = kind;
    this.stopCurrent = () => {
      el.pause();
      el.removeAttribute("src");
      el.load();
      src.disconnect();
      el.remove();
    };
    return el;
  }

  async close(): Promise<void> {
    this.stop();
    await this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
  }
}
