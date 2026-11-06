// The music picker's one use case: show trending tracks, or search, and describe the result for the visitor.

import type { MusicTrack } from "../domain/track.ts";
import { MusicError, type CatalogueQuery, type MusicCatalogue } from "./ports.ts";

export interface BrowseResult {
  tracks: MusicTrack[];
  /** A status line for the visitor. */
  message: string;
}

/** An empty query means trending. Aborts are rethrown so the caller can ignore superseded requests. */
export async function browseMusic(catalogue: MusicCatalogue, query: string, opts: CatalogueQuery = {}): Promise<BrowseResult> {
  const q = query.trim();
  try {
    const tracks = q ? await catalogue.search(q, opts) : await catalogue.trending(opts);
    const message = tracks.length
      ? q ? `${tracks.length} tracks for "${q}".` : `Trending on ${catalogue.name} this week.`
      : q ? `No playable tracks for "${q}".` : "No trending tracks right now.";
    return { tracks, message };
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return { tracks: [], message: err instanceof MusicError ? err.message : "Something went wrong loading tracks." };
  }
}
