// A playable music track, whichever catalogue it came from.

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  /** Track page on the catalogue's site, for attribution. */
  url: string;
  /** Artist page on the catalogue's site. */
  artistUrl: string;
  /** Seconds. */
  duration: number;
  genre: string | null;
  /** 150x150 cover art, if the track has any. */
  artwork: string | null;
}

/** 0:00, 3:07, 1:02:05. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
