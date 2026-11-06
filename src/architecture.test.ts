// Keeps the layers honest: domain depends on nothing, application only on domain, ui never on infrastructure.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL(".", import.meta.url).pathname;
const files = (dir: string): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [join(dir, e.name)] : [],
  );
const imports = (file: string) => [...readFileSync(join(root, file), "utf8").matchAll(/^\s*(?:import|export)[^"']*from\s+["']([^"']+)["']/gm)].map((m) => m[1]);

const rules: Record<string, RegExp> = {
  domain: /^\.\/[^/]+$/, // only its own siblings
  application: /^(\.\/|\.\.\/domain\/)/,
  ui: /^(three$|\.\/|\.\.\/(domain|application)\/)/,
};

for (const [layer, allowed] of Object.entries(rules)) {
  test(`${layer} imports stay inside its boundary`, () => {
    for (const file of files(layer)) {
      for (const spec of imports(file)) assert.match(spec, allowed, `${relative(root, join(root, file))} imports ${spec}`);
    }
  });
}
