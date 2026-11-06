// MusicCatalogue adapter for Audius (https://audius.co), an open music platform with a free public API.
// Read-only use needs no key: requests identify the app with `app_name`. Stream responses send
// `Access-Control-Allow-Origin: *` through every redirect, so Web Audio can analyse them (unlike Spotify).
// Free plan: 10 requests/second, 500,000/month (https://docs.audius.co/developers/api). Artists can opt
// tracks out of API access; those come back as not streamable and are skipped here.

import { MusicError, type CatalogueQuery, type MusicCatalogue } from "../application/ports.ts";
import type { MusicTrack } from "../domain/track.ts";

export const AUDIUS_API = "https://api.audius.co/v1";
export const APP_NAME = "musketeer-party-room";

/** Shape of the Audius fields we use (the API returns many more). */
export interface AudiusTrack {
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

/** Map one Audius API track to a MusicTrack, or null if it can't be streamed publicly. */
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

export interface AudiusOptions {
  api?: string;
  appName?: string;
  fetch?: typeof fetch;
}

export class AudiusCatalogue implements MusicCatalogue {
  readonly name = "Audius";
  private readonly api: string;
  private readonly appName: string;
  private readonly fetch: typeof fetch;

  constructor(opts: AudiusOptions = {}) {
    this.api = opts.api ?? AUDIUS_API;
    this.appName = opts.appName ?? APP_NAME;
    this.fetch = opts.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  /** Popular tracks this week. */
  trending(opts: CatalogueQuery = {}): Promise<MusicTrack[]> {
    return this.get("/tracks/trending", { time: "week", limit: String(opts.limit ?? 20) }, opts.signal);
  }

  /** Search tracks by title, artist or tag. An empty query falls back to trending. */
  search(query: string, opts: CatalogueQuery = {}): Promise<MusicTrack[]> {
    const q = query.trim();
    if (!q) return this.trending(opts);
    return this.get("/tracks/search", { query: q, limit: String(opts.limit ?? 20) }, opts.signal);
  }

  /** Redirects to a CORS-enabled mp3, so the cubes can analyse it. */
  streamUrl(track: Pick<MusicTrack, "id">): string {
    return `${this.api}/tracks/${encodeURIComponent(track.id)}/stream?app_name=${encodeURIComponent(this.appName)}`;
  }

  private async get(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<MusicTrack[]> {
    const url = new URL(this.api + path);
    for (const [k, v] of Object.entries({ ...params, app_name: this.appName })) url.searchParams.set(k, v);
    let res: Response;
    try {
      res = await this.fetch(url, { signal });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      throw new MusicError("Couldn't reach Audius. Check your connection and try again.");
    }
    if (res.status === 429) throw new MusicError("Audius is busy right now. Try again in a moment.");
    if (!res.ok) throw new MusicError(`Audius returned an error (${res.status}).`);
    return tracksFrom(await res.json());
  }
}
