import { test } from "node:test";
import assert from "node:assert/strict";
import { approach, average, binFor, createCubeWorld, cubeScale, scatter, spinSpeed, stepCubeWorld } from "./cube-world.ts";

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

test("cubes spread over the musical range on a log scale", () => {
  assert.equal(binFor(0, 1024), 1);
  assert.equal(binFor(1023, 1024), 400);
  assert.equal(binFor(511, 1024), 20); // half the cubes cover bins 1-20 (the bass), as the ear hears it
});

/** Deterministic stand-in for Math.random. */
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test("cubes are scattered clear of the camera's shell", () => {
  const random = seeded(7);
  for (let i = 0; i < 500; i++) {
    const r = Math.hypot(...scatter(random));
    assert.ok(r < 520 || r > 880, `radius ${r}`);
  }
});

test("a world holds at most 1,024 cubes, each with a pastel colour and its own bin", () => {
  const world = createCubeWorld(5000, seeded());
  assert.equal(world.cubes.length, 1024);
  assert.equal(world.cubes[0].bin, 1);
  assert.equal(world.cubes[1023].bin, 400);
  for (const c of world.cubes) assert.ok(c.color >= 0x808080 && c.color < 0x808080 + 0x808008); // 2015 formula
  assert.equal(createCubeWorld(-3).cubes.length, 0);
});

test("stepping grows cubes with their bin and spins faster when louder", () => {
  const world = createCubeWorld(4, seeded());
  const loud = new Uint8Array(1024).fill(200);
  const quiet = createCubeWorld(4, seeded());
  for (let i = 0; i < 60; i++) {
    stepCubeWorld(world, loud, 1 / 60);
    stepCubeWorld(quiet, new Uint8Array(1024), 1 / 60);
  }
  assert.ok(world.cubes.every((c) => c.scale > 50));
  assert.ok(quiet.cubes.every((c) => Math.abs(c.scale - 2) < 1e-9));
  assert.ok(world.rotationY > quiet.rotationY);
});

test("a still world follows the music without rotating", () => {
  const world = createCubeWorld(3, seeded());
  const before = world.cubes.map((c) => c.rotation);
  stepCubeWorld(world, new Uint8Array(1024).fill(255), 0.1, true);
  assert.equal(world.rotationX, 0);
  assert.deepEqual(world.cubes.map((c) => c.rotation), before);
  assert.ok(world.cubes[0].scale > 2);
});
