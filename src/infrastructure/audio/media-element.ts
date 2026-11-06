import type { AudioGraph, AudioSource } from "./audio-source.ts";

export interface MediaElementOptions {
  loop?: boolean;
  /** Needed for cross-origin streams; the server must send CORS headers or the analyser reads silence. */
  crossOrigin?: boolean;
  onError?: (message: string) => void;
}

/** Plays a URL through an <audio> element (with controls) the page can show as `element`. */
export class MediaElement implements AudioSource {
  readonly element: HTMLAudioElement;
  readonly kind: "file" | "stream";
  private readonly url: string;
  private readonly opts: MediaElementOptions;

  constructor(kind: "file" | "stream", url: string, opts: MediaElementOptions = {}) {
    this.kind = kind;
    this.url = url;
    this.opts = opts;
    this.element = new Audio();
  }

  /** A local file the visitor chose. It stays on their device. */
  static file(file: File): MediaElement {
    return new MediaElement("file", URL.createObjectURL(file), { loop: true });
  }

  /** A CORS-enabled stream, such as an Audius track. */
  static stream(url: string, onError?: (message: string) => void): MediaElement {
    return new MediaElement("stream", url, { crossOrigin: true, onError });
  }

  start({ ctx, analyser, speakers }: AudioGraph): () => void {
    const el = this.element;
    if (this.opts.crossOrigin) el.crossOrigin = "anonymous"; // must be set before src
    if (this.opts.onError) {
      const onError = this.opts.onError;
      el.addEventListener("error", () => onError("This track couldn't be streamed. Try another one."), { once: true });
    }
    el.src = this.url;
    el.controls = true;
    el.loop = !!this.opts.loop;
    el.preload = "auto";
    const src = ctx.createMediaElementSource(el);
    src.connect(analyser);
    src.connect(speakers);
    el.play().catch(() => {
      /* autoplay refusal or load failure: the element's error event / controls handle it */
    });
    return () => {
      el.pause();
      el.removeAttribute("src");
      el.load();
      src.disconnect();
      el.remove();
      if (this.url.startsWith("blob:")) URL.revokeObjectURL(this.url);
    };
  }
}
