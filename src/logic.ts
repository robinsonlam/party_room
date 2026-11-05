// Pure helpers for Cube World. No DOM or three.js, so they are unit-tested.

/** Cube size for one frequency bin (0-255). The 2015 curve was (v / 20)^2, which reaches 162x;
 *  this keeps the curve's feel but caps it and never drops a cube to zero (it used to vanish). */
export function cubeScale(bin: number, idle = 2, max = 90): number {
  const v = Math.max(0, Math.min(255, bin));
  return Math.min(max, Math.max(idle, (v / 20) ** 2));
}

/** Scene spin per 60 fps frame from the average level: 0.0006 * (avg / 10), floor 0.0001 when silent (as in 2015). */
export function spinSpeed(average: number): number {
  return average > 0 ? 0.0006 * (average / 10) : 0.0001;
}

/** Which frequency bin cube i listens to. In 2015 cube i used bin i, so the ~80% of cubes above
 *  ~5 kHz barely moved; spreading cubes on a log scale over the musical range (bins 1-400) lets all react. */
export function binFor(i: number, count: number, lo = 1, hi = 400): number {
  const t = count > 1 ? i / (count - 1) : 0;
  return Math.round(lo * Math.pow(hi / lo, t));
}

export function average(bins: ArrayLike<number>): number {
  if (!bins.length) return 0;
  let sum = 0;
  for (let i = 0; i < bins.length; i++) sum += bins[i];
  return sum / bins.length;
}

/** Ease a value toward a target, independent of frame rate. rate = fraction kept per second. */
export function approach(current: number, target: number, dtSeconds: number, rate = 0.0005): number {
  return target + (current - target) * Math.pow(rate, dtSeconds);
}

export type SpotifyKind = "track" | "album" | "playlist" | "artist" | "episode" | "show";
const kinds: SpotifyKind[] = ["track", "album", "playlist", "artist", "episode", "show"];

/** Accepts open.spotify.com links (with or without intl-xx/ and query) and spotify:kind:id URIs. */
export function parseSpotify(input: string): { kind: SpotifyKind; id: string } | null {
  const s = input.trim();
  const uri = s.match(/^spotify:([a-z]+):([A-Za-z0-9]{22})$/);
  if (uri && kinds.includes(uri[1] as SpotifyKind)) return { kind: uri[1] as SpotifyKind, id: uri[2] };
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.hostname !== "open.spotify.com") return null;
  const parts = url.pathname.split("/").filter(Boolean).filter((p) => !/^intl-[a-z]{2}$/i.test(p));
  const [kind, id] = parts;
  if (!kinds.includes(kind as SpotifyKind) || !/^[A-Za-z0-9]{22}$/.test(id ?? "")) return null;
  return { kind: kind as SpotifyKind, id };
}

export const spotifyEmbedUrl = (p: { kind: SpotifyKind; id: string }) =>
  `https://open.spotify.com/embed/${p.kind}/${p.id}?utm_source=generator&theme=0`;
