#!/usr/bin/env tsx

/**
 * Integration tests for check-package-boundaries.ts.
 *
 * Run via: npx tsx scripts/check-package-boundaries.test.ts
 */

import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const promisifiedExecFile = promisify(execFile);
const SCRIPT = join(
  new URL('.', import.meta.url).pathname,
  'check-package-boundaries.ts',
);

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    process.stdout.write(`  PASS  ${name}\n`);
  } catch (err: any) {
    failed++;
    process.stdout.write(`  FAIL  ${name}\n       ${err?.message ?? err}\n`);
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runScript(
  rootDir: string,
  extra: string[] = [],
): Promise<RunResult> {
  try {
    const { stdout, stderr } = await promisifiedExecFile(
      'npx',
      ['tsx', SCRIPT, '--root', rootDir, ...extra],
      { env: { ...process.env } },
    );
    return { exitCode: 0, stdout, stderr };
  } catch (err: any) {
    return {
      exitCode: err.code ?? 1,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
    };
  }
}

async function writeFixture(
  rootDir: string,
  files: Record<string, string>,
): Promise<void> {
  for (const [relPath, content] of Object.entries(files)) {
    const absPath = join(rootDir, relPath);
    await mkdir(join(absPath, '..'), { recursive: true });
    await writeFile(absPath, content, 'utf8');
  }
}

async function withTmp<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'pkgb-test-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

console.log('\ncheck-package-boundaries integration tests\n');

await test('exits 0 on empty project', async () => {
  await withTmp(async (dir) => {
    const r = await runScript(dir);
    assert(r.exitCode === 0, `expected 0, got ${r.exitCode}: ${r.stderr}`);
    assert(r.stdout.includes('OK'), 'expected OK');
  });
});

await test('exits 0 when barrel import is correct', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/core/index.ts': 'export type Vec3 = [number, number, number];',
      'src/ecs/world.ts': `import type { Vec3 } from "@/core";`,
    });
    const r = await runScript(dir);
    assert(r.exitCode === 0, `expected 0, got ${r.exitCode}: ${r.stderr}`);
  });
});

await test('exits 0 on deep import into package without barrel', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/ecs/world.ts': 'export const w = 1;',
      'app/Game.tsx': `import { w } from "@/ecs/world";`,
    });
    const r = await runScript(dir);
    assert(r.exitCode === 0, `expected 0, got ${r.exitCode}: ${r.stderr}`);
  });
});

await test('detects DEEP_IMPORT past barrel (@/ alias)', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/core/index.ts': 'export * from "./types";',
      'src/core/types.ts': 'export type Vec3 = [number, number, number];',
      'src/ecs/world.ts': `import type { Vec3 } from "@/core/types";`,
    });
    const r = await runScript(dir);
    assert(r.exitCode === 1, `expected 1, got ${r.exitCode}`);
    assert(
      r.stderr.includes('DEEP_IMPORT'),
      `expected DEEP_IMPORT: ${r.stderr}`,
    );
    assert(
      r.stderr.includes('@/core/types'),
      `expected specifier: ${r.stderr}`,
    );
  });
});

await test('detects DEEP_IMPORT via relative path past barrel', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/core/index.ts': 'export * from "./math";',
      'src/core/math.ts':
        'export const lerp = (a: number, b: number, t: number) => a;',
      'src/world/road.ts': `import { lerp } from "../core/math";`,
    });
    const r = await runScript(dir);
    assert(r.exitCode === 1, `expected 1, got ${r.exitCode}: ${r.stderr}`);
    assert(
      r.stderr.includes('DEEP_IMPORT'),
      `expected DEEP_IMPORT: ${r.stderr}`,
    );
  });
});

await test('detects DEEP_IMPORT from app/ into package with barrel', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/ecs/index.ts': 'export const world = {};',
      'src/ecs/traits/combat.ts': 'export type T = {};',
      'app/Game.tsx': `import type { T } from "@/ecs/traits/combat";`,
    });
    const r = await runScript(dir);
    assert(r.exitCode === 1, `expected 1, got ${r.exitCode}: ${r.stderr}`);
    assert(
      r.stderr.includes('DEEP_IMPORT'),
      `expected DEEP_IMPORT: ${r.stderr}`,
    );
  });
});

await test('detects UPWARD import (Layer 0 importing Layer 2)', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/biome/index.ts': 'export class BiomeService {}',
      'src/core/math.ts': `import { BiomeService } from "@/biome";`,
    });
    const r = await runScript(dir);
    assert(r.exitCode === 1, `expected 1, got ${r.exitCode}: ${r.stderr}`);
    assert(r.stderr.includes('UPWARD'), `expected UPWARD: ${r.stderr}`);
    assert(r.stderr.includes("'core'"), `expected 'core': ${r.stderr}`);
    assert(r.stderr.includes("'biome'"), `expected 'biome': ${r.stderr}`);
  });
});

await test('detects sublayer UPWARD import (2a importing 2c)', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/biome/index.ts': 'export class BiomeService {}',
      'src/audio/index.ts': 'export class AudioMixer {}',
      'src/biome/service.ts': `import { AudioMixer } from "@/audio";`,
    });
    const r = await runScript(dir);
    assert(r.exitCode === 1, `expected 1, got ${r.exitCode}: ${r.stderr}`);
    assert(r.stderr.includes('UPWARD'), `expected UPWARD: ${r.stderr}`);
    assert(
      r.stderr.includes('2a') && r.stderr.includes('2c'),
      `expected sublayer labels: ${r.stderr}`,
    );
  });
});

await test('detects LATERAL import between 2b siblings (ecs <-> world)', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/ecs/index.ts': 'export const world = {};',
      'src/world/index.ts': 'export const road = {};',
      'src/ecs/actions/quest.ts': `import { road } from "@/world";`,
    });
    const r = await runScript(dir);
    assert(r.exitCode === 1, `expected 1, got ${r.exitCode}: ${r.stderr}`);
    assert(r.stderr.includes('LATERAL'), `expected LATERAL: ${r.stderr}`);
    assert(
      r.stderr.includes("'ecs'") && r.stderr.includes("'world'"),
      `expected pkg names: ${r.stderr}`,
    );
  });
});

await test('detects LATERAL import between 2a siblings (biome <-> platform)', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/biome/index.ts': 'export class BiomeService {}',
      'src/platform/index.ts': 'export class PlatformBridge {}',
      'src/platform/prefs.ts': `import { BiomeService } from "@/biome";`,
    });
    const r = await runScript(dir);
    assert(r.exitCode === 1, `expected 1, got ${r.exitCode}: ${r.stderr}`);
    assert(r.stderr.includes('LATERAL'), `expected LATERAL: ${r.stderr}`);
  });
});

await test('detects LATERAL import between 2c siblings (audio <-> combat)', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/audio/index.ts': 'export class AudioMixer {}',
      'src/combat/index.ts': 'export class CombatResolver {}',
      'src/audio/ambient.ts': `import { CombatResolver } from "@/combat";`,
    });
    const r = await runScript(dir);
    assert(r.exitCode === 1, `expected 1, got ${r.exitCode}: ${r.stderr}`);
    assert(r.stderr.includes('LATERAL'), `expected LATERAL: ${r.stderr}`);
  });
});

await test('baseline: exits 0 when violations match baseline', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/ecs/index.ts': 'export const world = {};',
      'src/world/index.ts': 'export const road = {};',
      'src/ecs/actions/quest.ts': `import { road } from "@/world";`,
    });
    const base = await runScript(dir, ['--update-baseline']);
    assert(base.exitCode === 0, `baseline write failed: ${base.stderr}`);
    const check = await runScript(dir);
    assert(
      check.exitCode === 0,
      `expected 0 with baseline, got ${check.exitCode}: ${check.stderr}`,
    );
    assert(check.stdout.includes('0 new'), `expected '0 new': ${check.stdout}`);
  });
});

await test('baseline: fails when new violation appears beyond baseline', async () => {
  await withTmp(async (dir) => {
    await writeFixture(dir, {
      'src/ecs/index.ts': 'export const world = {};',
      'src/world/index.ts': 'export const road = {};',
      'src/ecs/actions/quest.ts': `import { road } from "@/world";`,
    });
    await runScript(dir, ['--update-baseline']);
    await writeFile(
      join(dir, 'src/ecs/actions/movement.ts'),
      `import { road } from "@/world";\n`,
    );
    const result = await runScript(dir);
    assert(result.exitCode === 1, `expected 1, got ${result.exitCode}`);
    assert(
      result.stderr.includes('LATERAL'),
      `expected LATERAL: ${result.stderr}`,
    );
    assert(
      result.stderr.includes('movement.ts'),
      `expected new file: ${result.stderr}`,
    );
  });
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
