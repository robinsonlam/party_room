// Cube World rules: how 1,024 cubes respond to a frequency spectrum. Pure, with no DOM, Web Audio or
// three.js, so the whole simulation is unit-tested and any renderer can draw it.

/** Cube size for one frequency bin (0-255). The 2015 curve was (v / 20)^2, which reaches 162x;
 *  this keeps the curve's feel but caps it and never drops a cube to zero (it used to vanish). */
export function cubeScale(bin: number, idle = 2, max = 90): number {
  const v = Math.max(0, Math.min(255, bin));
  return Math.min(max, Math.max(idle, (v / 20) ** 2));
}

/** Scene spin per 60 fps frame from the average level: 0.0006 * (avg / 10), floor 0.0001 when silent (as in 2015). */
export function spinSpeed(average: number): number {
  return average > 0 ? 0.0006 * (average / 10) : 0.0001;
}

/** Which frequency bin cube i listens to. In 2015 cube i used bin i, so the ~80% of cubes above
 *  ~5 kHz barely moved; spreading cubes on a log scale over the musical range (bins 1-400) lets all react. */
export function binFor(i: number, count: number, lo = 1, hi = 400): number {
  const t = count > 1 ? i / (count - 1) : 0;
  return Math.round(lo * Math.pow(hi / lo, t));
}

export function average(bins: ArrayLike<number>): number {
  if (!bins.length) return 0;
  let sum = 0;
  for (let i = 0; i < bins.length; i++) sum += bins[i];
  return sum / bins.length;
}

/** Ease a value toward a target, independent of frame rate. rate = fraction kept per second. */
export function approach(current: number, target: number, dtSeconds: number, rate = 0.0005): number {
  return target + (current - target) * Math.pow(rate, dtSeconds);
}

export const MAX_CUBES = 1024;
/** Half-width of the space the cubes are scattered through (2000 units across, as in 2015). */
const EXTENT = 1000;
/** The camera sits 700 units out and the room spins, so no cube is placed in this shell. */
const CAMERA_SHELL = { inner: 520, outer: 880 };

export interface Cube {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** 0xRRGGBB. */
  readonly color: number;
  /** Which spectrum bin this cube listens to. */
  readonly bin: number;
  /** Its own extra spin per 60 fps frame. */
  readonly spin: number;
  rotation: number;
  scale: number;
}

export interface CubeWorld {
  readonly cubes: Cube[];
  /** Current room spin per 60 fps frame. */
  spin: number;
  rotationX: number;
  rotationY: number;
}

export type Random = () => number;

/** A random point in the space, outside the shell the camera orbits through. */
export function scatter(random: Random): [number, number, number] {
  for (;;) {
    const p: [number, number, number] = [random(), random(), random()].map((r) => r * EXTENT * 2 - EXTENT) as [number, number, number];
    const r = Math.hypot(...p);
    if (r < CAMERA_SHELL.inner || r > CAMERA_SHELL.outer) return p;
  }
}

/** Scatter `count` cubes (at most 1,024) with the 2015 palette of bright pastels. */
export function createCubeWorld(count: number, random: Random = Math.random): CubeWorld {
  const n = Math.max(0, Math.min(MAX_CUBES, Math.floor(count)));
  const cubes = Array.from({ length: n }, (_, i): Cube => {
    const color = Math.floor(random() * 0x808008 + 0x808080); // 2015 palette
    const [x, y, z] = scatter(random);
    return { x, y, z, color, bin: binFor(i, n), spin: random() * 0.008, rotation: random() * Math.PI * 2, scale: cubeScale(0) };
  });
  return { cubes, spin: spinSpeed(0), rotationX: 0, rotationY: 0 };
}

/** Advance the world by `dt` seconds for the given spectrum. With `still`, sizes still follow the music but nothing rotates. */
export function stepCubeWorld(world: CubeWorld, spectrum: ArrayLike<number>, dt: number, still = false): void {
  const frames = dt * 60; // 2015 speeds were per 60 fps frame
  world.spin = approach(world.spin, spinSpeed(average(spectrum)), dt, 0.05);
  if (!still) {
    world.rotationX += world.spin * frames;
    world.rotationY += world.spin * 2 * frames;
  }
  for (const c of world.cubes) {
    c.scale = approach(c.scale, cubeScale(spectrum[c.bin] ?? 0), dt, 0.0005);
    if (!still) c.rotation += (c.spin + world.spin) * frames;
  }
}
