import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSpotify, spotifyEmbedUrl } from "./spotify-link.ts";

test("parses Spotify links and URIs, rejects others", () => {
  const id = "4uLU6hMCjMI75M1A2tKUQC";
  assert.deepEqual(parseSpotify(`https://open.spotify.com/track/${id}?si=abc`), { kind: "track", id });
  assert.deepEqual(parseSpotify(`https://open.spotify.com/intl-de/playlist/${id}`), { kind: "playlist", id });
  assert.deepEqual(parseSpotify(`spotify:album:${id}`), { kind: "album", id });
  assert.equal(parseSpotify(`https://evil.example/track/${id}`), null);
  assert.equal(parseSpotify("https://open.spotify.com/user/someone"), null);
  assert.equal(parseSpotify("not a url"), null);
  assert.equal(spotifyEmbedUrl({ kind: "track", id }), `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`);
});

test("rejects unknown kinds in URIs", () => {
  assert.equal(parseSpotify("spotify:user:4uLU6hMCjMI75M1A2tKUQC"), null);
});
