import { test } from "node:test";
import assert from "node:assert/strict";
import { approach, average, binFor, cubeScale, parseSpotify, spinSpeed, spotifyEmbedUrl } from "./logic.ts";

test("cube scale follows the 2015 curve, with an idle floor and a cap", () => {
  assert.equal(cubeScale(0), 2);
  assert.equal(cubeScale(100), 25);
  assert.equal(cubeScale(255), 90);
  assert.equal(cubeScale(-5), 2);
});

test("spin speed matches 2015 values", () => {
  assert.equal(spinSpeed(0), 0.0001);
  assert.ok(Math.abs(spinSpeed(50) - 0.003) < 1e-12);
});

test("average and frame-rate independent easing", () => {
  assert.equal(average([0, 10, 20]), 10);
  assert.equal(average([]), 0);
  const a = approach(0, 10, 1 / 60);
  const b = approach(approach(0, 10, 1 / 120), 10, 1 / 120);
  assert.ok(Math.abs(a - b) < 1e-9, "two half-steps equal one full step");
});

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

test("cubes spread over the musical range on a log scale", () => {
  assert.equal(binFor(0, 1024), 1);
  assert.equal(binFor(1023, 1024), 400);
  assert.equal(binFor(511, 1024), 20); // half the cubes cover bins 1-20 (the bass), as the ear hears it
});
