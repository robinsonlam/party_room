// three.js renderer for a CubeWorld. Reads any SpectrumSource each frame; it knows nothing about Web Audio.

import {
  BoxGeometry,
  Color,
  FogExp2,
  Group,
  HemisphereLight,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import type { SpectrumSource } from "../application/ports.ts";
import { createCubeWorld, MAX_CUBES, stepCubeWorld } from "../domain/cube-world.ts";

export interface CubeWorldViewOptions {
  /** Number of cubes (max 1024). Default 1024, as in 2015. */
  cubes?: number;
  /** Stop rotation (sizes still follow the music). Defaults to the visitor's prefers-reduced-motion setting. */
  reducedMotion?: boolean;
}

export interface CubeWorldView {
  destroy(): void;
}

/** Mount a Cube World into any sized element. Resizes with it and pauses while it's off screen. */
export function createCubeWorldView(container: HTMLElement, spectrum: SpectrumSource, opts: CubeWorldViewOptions = {}): CubeWorldView {
  const world = createCubeWorld(opts.cubes ?? MAX_CUBES);
  const still = opts.reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new Scene();
  scene.background = new Color(0x000000);
  scene.fog = new FogExp2(0x000000, 0.0008);
  scene.add(new HemisphereLight(0xffffff, 0x505060, 4));

  const camera = new PerspectiveCamera(80, 1, 1, 4000);
  camera.position.z = 700;

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.className = "party-room-canvas";
  container.appendChild(renderer.domElement);

  // One instanced mesh instead of 1024 separate meshes and materials.
  const room = new Group();
  scene.add(room);
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshLambertMaterial();
  const mesh = new InstancedMesh(geometry, material, Math.max(1, world.cubes.length));
  mesh.count = world.cubes.length;
  room.add(mesh);
  const color = new Color();
  world.cubes.forEach((c, i) => mesh.setColorAt(i, color.setHex(c.color)));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(container);

  const dummy = new Object3D();
  const draw = () => {
    room.rotation.set(world.rotationX, world.rotationY, 0);
    world.cubes.forEach((c, i) => {
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(c.rotation, c.rotation, c.rotation);
      dummy.scale.setScalar(c.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  };

  let last = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!visible) return;
    stepCubeWorld(world, spectrum.read(), dt, still);
    draw();
  };
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      geometry.dispose();
      material.dispose();
      mesh.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
