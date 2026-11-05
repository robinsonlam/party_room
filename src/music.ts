// Music picker source: Audius (https://audius.co), an open music platform with a free public API.
// Read-only use needs no key: requests identify the app with `app_name`. Stream responses send
// `Access-Control-Allow-Origin: *` through every redirect, so Web Audio can analyse them (unlike Spotify).
// Free plan: 10 requests/second, 500,000/month (https://docs.audius.co/developers/api). Artists can opt
// tracks out of API access; those come back as not streamable and are skipped here.

export const AUDIUS_API = "https://api.audius.co/v1";
export const APP_NAME = "musketeer-party-room";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  /** Track page on audius.co, for attribution. */
  url: string;
  /** Artist page on audius.co. */
  artistUrl: string;
  /** Seconds. */
  duration: number;
  genre: string | null;
  /** 150x150 cover art, if the track has any. */
  artwork: string | null;
}

/** Shape of the Audius fields we use (the API returns many more). */
interface AudiusTrack {
  id?: unknown;
  title?: unknown;
  duration?: unknown;
  genre?: unknown;
  permalink?: unknown;
  is_streamable?: unknown;
  is_stream_gated?: unknown;
  is_delete?: unknown;
  access?: { stream?: unknown } | null;
  artwork?: Record<string, unknown> | null;
  user?: { name?: unknown; handle?: unknown } | null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Map one Audius API track to a MusicTrack, or null if it can't be streamed publicly. Pure; unit-tested. */
export function fromAudius(raw: AudiusTrack): MusicTrack | null {
  const id = str(raw.id);
  const title = str(raw.title);
  const handle = str(raw.user?.handle);
  const permalink = str(raw.permalink);
  if (!id || !title || !handle || !permalink) return null;
  if (raw.is_streamable !== true || raw.is_stream_gated === true || raw.is_delete === true) return null;
  if (raw.access && raw.access.stream === false) return null;
  const artwork = raw.artwork ? str(raw.artwork["150x150"]) : null;
  return {
    id,
    title,
    artist: (str(raw.user?.name) ?? handle).replace(/^@/, ""),
    url: `https://audius.co${permalink.startsWith("/") ? "" : "/"}${permalink}`,
    artistUrl: `https://audius.co/${handle}`,
    duration: typeof raw.duration === "number" && raw.duration > 0 ? Math.round(raw.duration) : 0,
    genre: str(raw.genre),
    artwork: artwork && artwork.startsWith("https://") ? artwork : null,
  };
}

/** Map an Audius list response, dropping tracks that can't be streamed. */
export function tracksFrom(json: unknown): MusicTrack[] {
  const data = (json as { data?: unknown })?.data;
  return Array.isArray(data) ? data.map((t) => fromAudius(t as AudiusTrack)).filter((t): t is MusicTrack => t !== null) : [];
}

/** 0:00, 3:07, 1:02:05. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export class MusicError extends Error {}

async function get(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<MusicTrack[]> {
  const url = new URL(AUDIUS_API + path);
  for (const [k, v] of Object.entries({ ...params, app_name: APP_NAME })) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new MusicError("Couldn't reach Audius. Check your connection and try again.");
  }
  if (res.status === 429) throw new MusicError("Audius is busy right now. Try again in a moment.");
  if (!res.ok) throw new MusicError(`Audius returned an error (${res.status}).`);
  return tracksFrom(await res.json());
}

/** Popular tracks this week. */
export function trending(opts: { limit?: number; signal?: AbortSignal } = {}): Promise<MusicTrack[]> {
  return get("/tracks/trending", { time: "week", limit: String(opts.limit ?? 20) }, opts.signal);
}

/** Search tracks by title, artist or tag. */
export function search(query: string, opts: { limit?: number; signal?: AbortSignal } = {}): Promise<MusicTrack[]> {
  const q = query.trim();
  if (!q) return trending(opts);
  return get("/tracks/search", { query: q, limit: String(opts.limit ?? 20) }, opts.signal);
}

/** Audio URL for AudioEngine.playUrl. Redirects to a CORS-enabled mp3, so the cubes can analyse it. */
export function streamUrl(track: Pick<MusicTrack, "id">): string {
  return `${AUDIUS_API}/tracks/${encodeURIComponent(track.id)}/stream?app_name=${APP_NAME}`;
}
