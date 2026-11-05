import { createPartyRoom, parseSpotify, spotifyEmbedUrl } from "./party-room.ts";

const room = createPartyRoom(document.getElementById("room")!);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $("status"), player = $("player"), stop = $<HTMLButtonElement>("stop");
const buttons = { demo: $<HTMLButtonElement>("demo"), mic: $<HTMLButtonElement>("mic") };

const setActive = (kind: "demo" | "mic" | "file" | null, text: string) => {
  buttons.demo.setAttribute("aria-pressed", String(kind === "demo"));
  buttons.mic.setAttribute("aria-pressed", String(kind === "mic"));
  stop.disabled = kind === null;
  status.textContent = text;
  if (kind !== "file") player.replaceChildren();
};

buttons.demo.onclick = () => {
  room.audio.playDemo();
  setActive("demo", "Playing a generated beat.");
};

buttons.mic.onclick = async () => {
  try {
    await room.audio.useMicrophone();
    setActive("mic", "Listening to your microphone. Play some music nearby.");
  } catch {
    setActive(null, "Microphone access was blocked. Allow it in your browser to use this.");
  }
};

$<HTMLInputElement>("file").onchange = (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const el = room.audio.playFile(file);
  setActive("file", `Playing ${file.name}.`);
  player.replaceChildren(el);
};

stop.onclick = () => {
  room.audio.stop();
  setActive(null, "Stopped. Pick a sound source.");
};

$<HTMLFormElement>("spotify-form").onsubmit = (e) => {
  e.preventDefault();
  const parsed = parseSpotify($<HTMLInputElement>("spotify").value);
  const embed = $("embed");
  if (!parsed) {
    embed.textContent = "That isn't a Spotify track, album, playlist, artist, episode or show link.";
    return;
  }
  const frame = document.createElement("iframe");
  frame.src = spotifyEmbedUrl(parsed);
  frame.title = "Spotify player";
  frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  frame.loading = "lazy";
  embed.replaceChildren(frame);
};

// Allow ?demo to start the beat after the first click anywhere (browsers block autoplay).
if (new URLSearchParams(location.search).has("demo")) {
  window.addEventListener("pointerdown", () => buttons.demo.click(), { once: true });
}
