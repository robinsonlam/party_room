// A Spotify share link. Spotify doesn't let web pages read its audio, so the room can only show its player.

export type SpotifyKind = "track" | "album" | "playlist" | "artist" | "episode" | "show";
export interface SpotifyLink {
  kind: SpotifyKind;
  id: string;
}

const kinds: SpotifyKind[] = ["track", "album", "playlist", "artist", "episode", "show"];
const isKind = (k: string | undefined): k is SpotifyKind => kinds.includes(k as SpotifyKind);
const ID = /^[A-Za-z0-9]{22}$/;

/** Accepts open.spotify.com links (with or without intl-xx/ and query) and spotify:kind:id URIs. */
export function parseSpotify(input: string): SpotifyLink | null {
  const s = input.trim();
  const uri = s.match(/^spotify:([a-z]+):([A-Za-z0-9]{22})$/);
  if (uri) return isKind(uri[1]) ? { kind: uri[1], id: uri[2] } : null;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.hostname !== "open.spotify.com") return null;
  const [kind, id] = url.pathname.split("/").filter(Boolean).filter((p) => !/^intl-[a-z]{2}$/i.test(p));
  return isKind(kind) && ID.test(id ?? "") ? { kind, id } : null;
}

export const spotifyEmbedUrl = (p: SpotifyLink) => `https://open.spotify.com/embed/${p.kind}/${p.id}?utm_source=generator&theme=0`;
