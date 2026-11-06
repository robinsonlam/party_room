import type { AudioGraph, AudioSource } from "./audio-source.ts";

const BPM = 118;
const ROOTS = [45, 41, 48, 43]; // A, F, C, G (MIDI)
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** A short generated loop (kick, hats, bass, chords) at 118 bpm. No samples or copyrighted audio. */
export class DemoBeat implements AudioSource {
  readonly kind = "demo";

  start({ ctx, analyser, speakers }: AudioGraph): () => void {
    const out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(analyser);
    out.connect(speakers);

    const beat = 60 / BPM;
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
        const root = ROOTS[Math.floor(step / 16) % ROOTS.length];
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
    const timer = setInterval(schedule, 50);
    return () => {
      clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => out.disconnect(), 300);
    };
  }
}
