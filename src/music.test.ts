import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDuration, fromAudius, streamUrl, tracksFrom } from "./music.ts";

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
  assert.equal(streamUrl({ id: "a b" }), "https://api.audius.co/v1/tracks/a%20b/stream?app_name=musketeer-party-room");
});
