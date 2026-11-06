// What the room needs from the outside world. The domain and UI depend on these, not on Web Audio or Audius.

import type { MusicTrack } from "../domain/track.ts";

/** Anything that can report the current frequency spectrum (0-255 per bin, all zeros when silent). */
export interface SpectrumSource {
  read(): ArrayLike<number>;
}

export interface CatalogueQuery {
  limit?: number;
  signal?: AbortSignal;
}

/** A searchable source of streamable tracks. */
export interface MusicCatalogue {
  /** Shown to the visitor, e.g. "Audius". */
  readonly name: string;
  trending(opts?: CatalogueQuery): Promise<MusicTrack[]>;
  search(query: string, opts?: CatalogueQuery): Promise<MusicTrack[]>;
  /** A CORS-enabled audio URL, so the room can analyse the stream. */
  streamUrl(track: Pick<MusicTrack, "id">): string;
}

/** A catalogue failure with a message fit to show the visitor. */
export class MusicError extends Error {}
