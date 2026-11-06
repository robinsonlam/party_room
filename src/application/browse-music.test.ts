import { test } from "node:test";
import assert from "node:assert/strict";
import type { MusicTrack } from "../domain/track.ts";
import { browseMusic } from "./browse-music.ts";
import { MusicError, type MusicCatalogue } from "./ports.ts";

const track: MusicTrack = { id: "1", title: "T", artist: "A", url: "", artistUrl: "", duration: 60, genre: null, artwork: null };

/** A fake catalogue; the use case only sees the port. */
const catalogue = (impl: Partial<MusicCatalogue>): MusicCatalogue => ({
  name: "Test FM",
  trending: async () => [track],
  search: async () => [track, track],
  streamUrl: () => "",
  ...impl,
});

test("an empty query shows trending tracks", async () => {
  assert.deepEqual(await browseMusic(catalogue({}), "  "), { tracks: [track], message: "Trending on Test FM this week." });
});

test("a query searches and says how many tracks matched", async () => {
  const result = await browseMusic(catalogue({}), " dub ");
  assert.equal(result.tracks.length, 2);
  assert.equal(result.message, '2 tracks for "dub".');
  assert.equal((await browseMusic(catalogue({ search: async () => [] }), "zzz")).message, 'No playable tracks for "zzz".');
});

test("catalogue errors become messages; aborts are rethrown", async () => {
  const busy = catalogue({ trending: async () => { throw new MusicError("Busy."); } });
  assert.deepEqual(await browseMusic(busy, ""), { tracks: [], message: "Busy." });
  const broken = catalogue({ trending: async () => { throw new Error("boom"); } });
  assert.equal((await browseMusic(broken, "")).message, "Something went wrong loading tracks.");
  const aborted = catalogue({ trending: async () => { throw Object.assign(new Error("x"), { name: "AbortError" }); } });
  await assert.rejects(browseMusic(aborted, ""), { name: "AbortError" });
});
