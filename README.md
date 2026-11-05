# Party Room · Cube World

1,024 pastel cubes floating in the dark, each swelling with one frequency of the music while the whole room spins faster as it gets louder.

Built in 2015 by John & Robin Son as a three.js experiment ("bring the party to your browser"). Rebuilt in 2026 as a small, self-contained mini example of its Cube World room.

## This repository

| Folder | What |
| --- | --- |
| `legacy/` | The original 2015 Rails 4 + React 0.13 app with five rooms (Cube World, Hyperdrive, Ball Room, Physics Room, Cube Forest) and the `jb_examples` sandbox, unchanged. It no longer works (see below). |
| `/` | The 2026 mini example: Cube World only, Vite + TypeScript + three.js 0.180. |

## Run it

```bash
npm ci
npm run dev     # http://localhost:4410
npm test        # unit tests (Node 22+)
npm run build   # static site in dist/
```

## Sound sources

| Source | How |
| --- | --- |
| Demo beat | Generated live with Web Audio (kick, hats, bass, chords). No audio files. |
| Microphone | Reacts to whatever is playing in the room. Not sent to the speakers, so no feedback. |
| Audio file | Any file the visitor picks; it stays on their device. |
| Music picker | Trending and searchable tracks from [Audius](https://audius.co), an open music platform. Streams are analysed live, and each track links back to its page and artist. |
| Spotify link | Shows Spotify's embed player for a track, album or playlist link. Spotify doesn't let web pages read its audio, so to visualise it, play it out loud and turn on the microphone. |

## Embed it

```ts
import { createPartyRoom } from "./src/party-room.ts";
import "./src/party-room.css";

const room = createPartyRoom(element);   // fills `element`; give it a size
room.audio.playDemo();                     // call from a click (browsers block autoplay)
// room.audio.useMicrophone(), room.audio.playFile(file), room.audio.playUrl(url), room.audio.stop()
room.destroy();                            // stops audio, frees WebGL, removes the canvas
```

### Music picker API

`src/music.ts` is framework-free, so any UI can render the picker:

```ts
import { trending, search, streamUrl, formatDuration, type MusicTrack } from "./src/party-room.ts";

const tracks: MusicTrack[] = await trending({ limit: 20 });   // or search("lofi", { signal })
room.audio.playUrl(streamUrl(tracks[0]), (msg) => showError(msg)); // call from a click
// MusicTrack: id, title, artist, url (audius.co track page), artistUrl, duration (s), genre, artwork
```

Requests identify the app with `app_name` (no key needed for read-only use). Audius's free plan allows 10 requests a second and 500,000 a month ([docs](https://docs.audius.co/developers/api)). Tracks whose artists opted out of API access, or that are gated, are filtered out.

## What changed from 2015

- **SoundCloud replaced by Audius:** the original streamed one SoundCloud track through SoundCloud's v1 API with a client id and secret hard-coded in `CubeWorldRender.jsx.erb`. That access now needs OAuth 2.1 and a registered app (and a secret can't live in browser code), so the room stayed silent and every cube stayed at size 0. Audius needs no secret, and its streams send CORS headers through every redirect, which Web Audio requires to analyse them.
- **Spotify:** its Web API removed 30-second preview URLs and audio analysis for new apps in November 2024, so a Spotify link can only show the official player, not drive the visualiser directly.
- **three.js r72 → r180:** one instanced mesh instead of 1,024 separate meshes and materials, and the non-existent `THREE.AdditiveAlphaBlending` is removed.
- **Fixes:**
  - Cubes no longer vanish at silence; the 2015 scale curve is capped (it reached 162×).
  - Motion is frame-rate independent, so it runs at the same speed on 120 Hz screens.
  - The Web Audio context starts on a click, as browsers require.
  - Cubes are spread across the musical range on a log scale. In 2015 cube *n* used bin *n*, so about 80% barely moved.
  - Cubes stay clear of the camera's path.
- **Embeddable:** `createPartyRoom(element)` fills any element, resizes with it, pauses when off screen, respects reduced motion, and cleans up with `destroy()`.

The legacy folder still contains the original's committed SoundCloud client secret and MP3 files; they are not used by the rebuild.
