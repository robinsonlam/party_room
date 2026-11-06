// Public API and composition root: wires the Web Audio engine and the Audius catalogue to the renderer.
// Import from here; the layers behind it (domain, application, infrastructure, ui) can change freely.

import { AudiusCatalogue } from "./infrastructure/audius-catalogue.ts";
import { AudioEngine } from "./infrastructure/audio/audio-engine.ts";
import { createCubeWorldView, type CubeWorldViewOptions } from "./ui/cube-world-view.ts";

export type PartyRoomOptions = CubeWorldViewOptions;

export interface PartyRoom {
  audio: AudioEngine;
  destroy(): void;
}

/** Cube World: cubes scattered through a 2000-unit space, each sized by one frequency bin of the audio,
 *  the whole room spinning faster as the music gets louder. Mount into any sized element. */
export function createPartyRoom(container: HTMLElement, opts: PartyRoomOptions = {}): PartyRoom {
  const audio = new AudioEngine();
  const view = createCubeWorldView(container, audio, opts);
  return {
    audio,
    destroy() {
      view.destroy();
      void audio.close();
    },
  };
}

/** The default music catalogue. */
export const music = new AudiusCatalogue();
export const trending: AudiusCatalogue["trending"] = (opts) => music.trending(opts);
export const search: AudiusCatalogue["search"] = (query, opts) => music.search(query, opts);
export const streamUrl: AudiusCatalogue["streamUrl"] = (track) => music.streamUrl(track);

export { AudioEngine } from "./infrastructure/audio/audio-engine.ts";
export type { AudioSource, AudioGraph, SourceKind } from "./infrastructure/audio/audio-source.ts";
export { DemoBeat } from "./infrastructure/audio/demo-beat.ts";
export { Microphone } from "./infrastructure/audio/microphone.ts";
export { MediaElement } from "./infrastructure/audio/media-element.ts";
export { AudiusCatalogue } from "./infrastructure/audius-catalogue.ts";
export { createCubeWorldView, type CubeWorldView, type CubeWorldViewOptions } from "./ui/cube-world-view.ts";
export { browseMusic, type BrowseResult } from "./application/browse-music.ts";
export { MusicError, type MusicCatalogue, type SpectrumSource, type CatalogueQuery } from "./application/ports.ts";
export { formatDuration, type MusicTrack } from "./domain/track.ts";
export { parseSpotify, spotifyEmbedUrl, type SpotifyLink, type SpotifyKind } from "./domain/spotify-link.ts";
