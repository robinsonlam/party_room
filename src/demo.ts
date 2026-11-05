import { createPartyRoom, formatDuration, MusicError, parseSpotify, search, spotifyEmbedUrl, streamUrl, trending, type MusicTrack } from "./party-room.ts";

const room = createPartyRoom(document.getElementById("room")!);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $("status"), player = $("player"), stop = $<HTMLButtonElement>("stop");
const buttons = { demo: $<HTMLButtonElement>("demo"), mic: $<HTMLButtonElement>("mic") };

const setActive = (kind: "demo" | "mic" | "file" | "stream" | null, text: string) => {
  buttons.demo.setAttribute("aria-pressed", String(kind === "demo"));
  buttons.mic.setAttribute("aria-pressed", String(kind === "mic"));
  stop.disabled = kind === null;
  status.textContent = text;
  if (kind !== "file" && kind !== "stream") player.replaceChildren();
  if (kind !== "stream") nowPlaying(null);
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

// ---------- Music picker (Audius) ----------
const list = $("music-list"), musicStatus = $("music-status"), now = $("now-playing");
let request: AbortController | null = null;
let playingId: string | null = null;

function nowPlaying(track: MusicTrack | null) {
  playingId = track?.id ?? null;
  list.querySelectorAll<HTMLButtonElement>("button[data-id]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === playingId)));
  now.hidden = !track;
  now.replaceChildren();
  if (!track) return;
  const label = document.createElement("p");
  label.className = "hint";
  label.textContent = "Now playing";
  const title = Object.assign(document.createElement("a"), { href: track.url, target: "_blank", rel: "noopener", textContent: track.title });
  const by = Object.assign(document.createElement("a"), { href: track.artistUrl, target: "_blank", rel: "noopener", textContent: track.artist });
  const line = document.createElement("p");
  line.append(title, " by ", by, " on Audius");
  now.append(label, line);
}

function render(tracks: MusicTrack[]) {
  list.replaceChildren(
    ...tracks.map((t) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.id = t.id;
      b.setAttribute("aria-pressed", String(t.id === playingId));
      b.setAttribute("aria-label", `Play ${t.title} by ${t.artist}, ${formatDuration(t.duration)}`);
      const art = document.createElement("span");
      art.className = "art";
      if (t.artwork) {
        const img = Object.assign(document.createElement("img"), { src: t.artwork, alt: "", loading: "lazy", width: 40, height: 40 });
        img.onerror = () => img.remove();
        art.append(img);
      }
      const text = document.createElement("span");
      text.className = "text";
      text.append(Object.assign(document.createElement("span"), { className: "title", textContent: t.title }), Object.assign(document.createElement("span"), { className: "artist", textContent: t.artist }));
      const dur = Object.assign(document.createElement("span"), { className: "duration", textContent: formatDuration(t.duration) });
      b.append(art, text, dur);
      b.onclick = () => play(t);
      li.append(b);
      return li;
    }),
  );
}

function play(track: MusicTrack) {
  const el = room.audio.playUrl(streamUrl(track), (message) => {
    setActive(null, message);
    musicStatus.textContent = `"${track.title}" couldn't be streamed. Pick another track.`;
  });
  setActive("stream", `Streaming ${track.title} by ${track.artist}.`);
  player.replaceChildren(el);
  nowPlaying(track);
}

async function load(query: string) {
  request?.abort();
  request = new AbortController();
  musicStatus.textContent = query ? `Searching for "${query}"…` : "Loading trending tracks…";
  list.setAttribute("aria-busy", "true");
  try {
    const tracks = query ? await search(query, { signal: request.signal }) : await trending({ signal: request.signal });
    render(tracks);
    musicStatus.textContent = tracks.length
      ? query ? `${tracks.length} tracks for "${query}".` : "Trending on Audius this week."
      : query ? `No playable tracks for "${query}".` : "No trending tracks right now.";
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    musicStatus.textContent = err instanceof MusicError ? err.message : "Something went wrong loading tracks.";
  } finally {
    list.removeAttribute("aria-busy");
  }
}

$<HTMLFormElement>("music-search").onsubmit = (e) => {
  e.preventDefault();
  void load($<HTMLInputElement>("music-q").value.trim());
};
void load("");
