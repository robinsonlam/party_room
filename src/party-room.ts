import {
  Color,
  FogExp2,
  HemisphereLight,
  InstancedMesh,
  BoxGeometry,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Group,
} from "three";
import { AudioEngine } from "./audio.ts";
import { approach, average, binFor, cubeScale, spinSpeed } from "./logic.ts";

export interface PartyRoomOptions {
  /** Number of cubes (max 1024). Default 1024, as in 2015. */
  cubes?: number;
  /** Seed-free colours/positions are random per load, as in 2015. Pass false to disable the slow idle drift. */
  reducedMotion?: boolean;
}

export interface PartyRoom {
  audio: AudioEngine;
  destroy(): void;
}

/** Cube World: cubes scattered through a 2000-unit space, each sized by one frequency bin of the audio,
 *  the whole room spinning faster as the music gets louder. Mount into any sized element. */
export function createPartyRoom(container: HTMLElement, opts: PartyRoomOptions = {}): PartyRoom {
  const count = Math.min(1024, opts.cubes ?? 1024);
  const reduced = opts.reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new Scene();
  scene.background = new Color(0x000000);
  scene.fog = new FogExp2(0x000000, 0.0008);

  const camera = new PerspectiveCamera(80, 1, 1, 4000);
  camera.position.z = 700;

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.className = "party-room-canvas";
  container.appendChild(renderer.domElement);

  const light = new HemisphereLight(0xffffff, 0x505060, 4);
  scene.add(light);

  // One instanced mesh instead of 1024 separate meshes and materials.
  const room = new Group();
  scene.add(room);
  const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial(), count);
  room.add(mesh);

  const dummy = new Object3D();
  // Random points in a 2000-unit cube (as in 2015), skipping the shell the camera orbits through
  // (it sits 700 units out and the room spins), so no cube swells up right in front of the lens.
  const scatter = (): [number, number, number] => {
    for (;;) {
      const p: [number, number, number] = [0, 0, 0].map(() => Math.random() * 2000 - 1000) as [number, number, number];
      const r = Math.hypot(...p);
      if (r < 520 || r > 880) return p;
    }
  };
  const cubes = Array.from({ length: count }, (_, i) => {
    // 2015 palette: Math.random() * 0x808008 + 0x808080 (bright pastels)
    mesh.setColorAt(i, new Color(Math.floor(Math.random() * 0x808008 + 0x808080)));
    const [x, y, z] = scatter();
    return {
      x,
      y,
      z,
      spin: Math.random() * 0.008,
      rot: Math.random() * Math.PI * 2,
      scale: cubeScale(0),
      bin: binFor(i, count),
    };
  });
  mesh.instanceColor!.needsUpdate = true;

  const audio = new AudioEngine();
  let spin = spinSpeed(0);

  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // Pause rendering while the room is off screen.
  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(container);

  let last = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!visible) return;
    const f = dt * 60; // 2015 speeds were per 60 fps frame

    const bins = audio.read();
    spin = approach(spin, spinSpeed(average(bins)), dt, 0.05);
    if (!reduced) {
      room.rotation.x += spin * f;
      room.rotation.y += spin * 2 * f;
    }

    for (let i = 0; i < count; i++) {
      const c = cubes[i];
      c.scale = approach(c.scale, cubeScale(bins[c.bin] ?? 0), dt, 0.0005);
      if (!reduced) c.rot += (c.spin + spin) * f;
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(c.rot, c.rot, c.rot);
      dummy.scale.setScalar(c.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    audio,
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      void audio.close();
      mesh.geometry.dispose();
      (mesh.material as MeshLambertMaterial).dispose();
      mesh.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export { AudioEngine } from "./audio.ts";
export { parseSpotify, spotifyEmbedUrl } from "./logic.ts";
export { trending, search, streamUrl, formatDuration, MusicError, type MusicTrack } from "./music.ts";
