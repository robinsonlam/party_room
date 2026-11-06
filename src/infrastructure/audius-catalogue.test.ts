import { test } from "node:test";
import assert from "node:assert/strict";
import { MusicError } from "../application/ports.ts";
import { formatDuration } from "../domain/track.ts";
import { AudiusCatalogue, fromAudius, tracksFrom } from "./audius-catalogue.ts";

const raw = {
  id: "AK3w5q0",
  title: "140 Mix",
  duration: 584,
  genre: "Dubstep",
  permalink: "/iLLPeTiLL/140-mix",
  is_streamable: true,
  is_stream_gated: false,
  is_delete: false,
  access: { stream: true, download: false },
  artwork: { "150x150": "https://example.org/150.jpg", "480x480": "https://example.org/480.jpg" },
  user: { name: "@iLLPeTiLL", handle: "iLLPeTiLL" },
};

test("maps an Audius track, with attribution links", () => {
  assert.deepEqual(fromAudius(raw), {
    id: "AK3w5q0",
    title: "140 Mix",
    artist: "iLLPeTiLL",
    url: "https://audius.co/iLLPeTiLL/140-mix",
    artistUrl: "https://audius.co/iLLPeTiLL",
    duration: 584,
    genre: "Dubstep",
    artwork: "https://example.org/150.jpg",
  });
});

test("skips tracks that can't be streamed publicly", () => {
  assert.equal(fromAudius({ ...raw, is_streamable: false }), null);
  assert.equal(fromAudius({ ...raw, is_stream_gated: true }), null);
  assert.equal(fromAudius({ ...raw, is_delete: true }), null);
  assert.equal(fromAudius({ ...raw, access: { stream: false } }), null);
  assert.equal(fromAudius({ ...raw, user: null }), null);
});

test("tolerates missing artwork and odd responses", () => {
  assert.equal(fromAudius({ ...raw, artwork: null })?.artwork, null);
  assert.equal(fromAudius({ ...raw, artwork: { "150x150": "http://insecure/1.jpg" } })?.artwork, null);
  assert.deepEqual(tracksFrom({ data: [raw, { ...raw, is_streamable: false }] }).map((t) => t.id), ["AK3w5q0"]);
  assert.deepEqual(tracksFrom(null), []);
  assert.deepEqual(tracksFrom({ data: "nope" }), []);
});

test("formats durations", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(187), "3:07");
  assert.equal(formatDuration(3725), "1:02:05");
});

test("stream URL identifies the app and escapes the id", () => {
  assert.equal(new AudiusCatalogue().streamUrl({ id: "a b" }), "https://api.audius.co/v1/tracks/a%20b/stream?app_name=musketeer-party-room");
});

const respond = (status: number, body: unknown = {}) => async () => new Response(JSON.stringify(body), { status });

test("queries trending and search with the app name, falling back to trending for blank searches", async () => {
  const urls: string[] = [];
  const catalogue = new AudiusCatalogue({
    fetch: async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ data: [raw] }));
    },
  });
  assert.equal((await catalogue.trending({ limit: 5 }))[0].id, "AK3w5q0");
  await catalogue.search("  lo fi ");
  await catalogue.search("   ");
  assert.equal(urls[0], "https://api.audius.co/v1/tracks/trending?time=week&limit=5&app_name=musketeer-party-room");
  assert.equal(urls[1], "https://api.audius.co/v1/tracks/search?query=lo+fi&limit=20&app_name=musketeer-party-room");
  assert.match(urls[2], /\/tracks\/trending\?/);
});

test("turns failures into messages for the visitor", async () => {
  await assert.rejects(new AudiusCatalogue({ fetch: respond(429) }).trending(), (e) => e instanceof MusicError && /busy/.test(e.message));
  await assert.rejects(new AudiusCatalogue({ fetch: respond(500) }).trending(), /error \(500\)/);
  const offline = new AudiusCatalogue({ fetch: async () => { throw new TypeError("failed"); } });
  await assert.rejects(offline.trending(), (e) => e instanceof MusicError && /reach Audius/.test(e.message));
});
