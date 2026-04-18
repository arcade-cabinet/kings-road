#!/usr/bin/env tsx

/**
 * Package boundary enforcement.
 *
 * Layering contract (docs/architecture/PACKAGE_LAYOUT.md):
 *
 *   Layer 0:  core
 *   Layer 1:  content, assets
 *   Layer 2a: biome, platform
 *   Layer 2b: ecs, world
 *   Layer 2c: audio, combat, save, benchmark, debug
 *   Layer 3:  composition
 *   Layer 4:  app/
 *
 * Rules:
 *   1. UPWARD      - a package may not import from a higher layer.
 *   2. LATERAL     - a Layer-2 package may not import from a sibling in the same sub-layer.
 *   3. DEEP_IMPORT - if a package has a barrel (index.ts), all external consumers must
 *                    go through it. Only enforced once the barrel exists on disk.
 *
 * Usage:
 *   npx tsx scripts/check-package-boundaries.ts                   # check; fail on new violations
 *   npx tsx scripts/check-package-boundaries.ts --update-baseline  # write current violations as baseline
 *   npx tsx scripts/check-package-boundaries.ts --root /some/dir   # check a different project root
 *
 * Baseline file: scripts/package-boundaries-baseline.json
 *
 * Exit 0 = clean. Exit 1 = new violations found.
 */

import { constants } from 'node:fs';
import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

type Layer = 0 | 1 | 2 | 3 | 4;
type SubLayer = '2a' | '2b' | '2c' | null;

interface PkgDef {
  name: string;
  dir: string;
  layer: Layer;
  sublayer: SubLayer;
}

const PACKAGES: PkgDef[] = [
  { name: 'core', dir: 'src/core', layer: 0, sublayer: null },
  { name: 'content', dir: 'src/content', layer: 1, sublayer: null },
  { name: 'assets', dir: 'src/assets', layer: 1, sublayer: null },
  { name: 'biome', dir: 'src/biome', layer: 2, sublayer: '2a' },
  { name: 'platform', dir: 'src/platform', layer: 2, sublayer: '2a' },
  { name: 'ecs', dir: 'src/ecs', layer: 2, sublayer: '2b' },
  { name: 'world', dir: 'src/world', layer: 2, sublayer: '2b' },
  { name: 'audio', dir: 'src/audio', layer: 2, sublayer: '2c' },
  { name: 'combat', dir: 'src/combat', layer: 2, sublayer: '2c' },
  { name: 'save', dir: 'src/save', layer: 2, sublayer: '2c' },
  { name: 'benchmark', dir: 'src/benchmark', layer: 2, sublayer: '2c' },
  { name: 'debug', dir: 'src/debug', layer: 2, sublayer: '2c' },
  { name: 'composition', dir: 'src/composition', layer: 3, sublayer: null },
  { name: 'app', dir: 'app', layer: 4, sublayer: null },
];

const PKG_BY_NAME = new Map<string, PkgDef>(PACKAGES.map((p) => [p.name, p]));
const SUBLAYER_ORDER: Record<string, number> = { '2a': 0, '2b': 1, '2c': 2 };

const args = process.argv.slice(2);
const updateBaseline = args.includes('--update-baseline');
const rootArgIdx = args.indexOf('--root');
const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const ROOT =
  rootArgIdx >= 0 ? resolve(args[rootArgIdx + 1]) : resolve(SCRIPT_DIR, '..');
const BASELINE_PATH = join(SCRIPT_DIR, 'package-boundaries-baseline.json');

const PACKAGES_WITH_BARREL = new Set<string>();

async function buildBarrelCache(): Promise<void> {
  await Promise.all(
    PACKAGES.map(async (pkg) => {
      try {
        await access(join(ROOT, pkg.dir, 'index.ts'), constants.F_OK);
        PACKAGES_WITH_BARREL.add(pkg.name);
      } catch {
        // no barrel yet
      }
    }),
  );
}

interface Violation {
  rule: 'UPWARD' | 'LATERAL' | 'DEEP_IMPORT';
  sourceFile: string;
  importPath: string;
  sourcePkg: string;
  targetPkg: string;
  message: string;
}

function violationKey(v: Violation): string {
  return `${v.rule}|${v.sourceFile}|${v.importPath}`;
}

async function loadBaseline(): Promise<Set<string>> {
  try {
    const raw = await readFile(BASELINE_PATH, 'utf8');
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

async function writeBaselineFile(violations: Violation[]): Promise<void> {
  const keys = [...new Set(violations.map(violationKey))].sort();
  await writeFile(BASELINE_PATH, `${JSON.stringify(keys, null, 2)}\n`, 'utf8');
}

function repoRel(absPath: string): string {
  return relative(ROOT, absPath);
}

async function* walkTs(dir: string): AsyncGenerator<string> {
  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        ['node_modules', '.git', 'dist', 'fixtures', '.vite'].includes(
          entry.name,
        )
      )
        continue;
      yield* walkTs(full);
    } else if (
      entry.isFile() &&
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts')
    ) {
      yield full;
    }
  }
}

function extractImports(source: string): string[] {
  const staticRe =
    /(?:import|export)\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const staticMatches = [...source.matchAll(staticRe)].map((m) => m[1]);
  const dynMatches = [...source.matchAll(dynRe)].map((m) => m[1]);
  return [...staticMatches, ...dynMatches];
}

function resolveTargetPkg(
  specifier: string,
  sourceFile: string,
): { pkg: PkgDef; isBarrel: boolean } | null {
  if (specifier.startsWith('@/')) {
    const rest = specifier.slice(2);
    const parts = rest.split('/');
    const pkgName = parts[0];
    const pkgRelPath = parts.slice(1).join('/');
    const pkg = PKG_BY_NAME.get(pkgName);
    if (!pkg) return null;
    const isBarrel =
      pkgRelPath === '' || pkgRelPath === 'index' || pkgRelPath === 'index.ts';
    return { pkg, isBarrel };
  }
  if (specifier.startsWith('@app/')) {
    const rest = specifier.slice(5);
    const appPkg = PKG_BY_NAME.get('app')!;
    const isBarrel = rest === '' || rest === 'index' || rest === 'index.ts';
    return { pkg: appPkg, isBarrel };
  }
  if (specifier.startsWith('.')) {
    const sourceDir = join(sourceFile, '..');
    const absTarget = resolve(sourceDir, specifier).replace(
      /\.(ts|tsx|js|jsx)$/,
      '',
    );
    for (const pkg of [...PACKAGES].sort(
      (a, b) => b.dir.length - a.dir.length,
    )) {
      const pkgAbs = join(ROOT, pkg.dir);
      if (absTarget.startsWith(`${pkgAbs}/`) || absTarget === pkgAbs) {
        const rel = relative(pkgAbs, absTarget);
        const isBarrel = rel === '' || rel === 'index' || rel === 'index.ts';
        return { pkg, isBarrel };
      }
    }
    return null;
  }
  return null;
}

function sourcePkg(sourceFile: string): PkgDef | null {
  for (const pkg of [...PACKAGES].sort((a, b) => b.dir.length - a.dir.length)) {
    const pkgAbs = join(ROOT, pkg.dir);
    if (sourceFile.startsWith(`${pkgAbs}/`) || sourceFile === pkgAbs)
      return pkg;
  }
  return null;
}

function checkImport(
  sourceFile: string,
  src: PkgDef,
  specifier: string,
): Violation | null {
  const result = resolveTargetPkg(specifier, sourceFile);
  if (!result) return null;
  const { pkg: tgt, isBarrel } = result;
  if (tgt.name === src.name) return null;
  const rel = repoRel(sourceFile);

  if (!isBarrel && PACKAGES_WITH_BARREL.has(tgt.name)) {
    return {
      rule: 'DEEP_IMPORT',
      sourceFile: rel,
      importPath: specifier,
      sourcePkg: src.name,
      targetPkg: tgt.name,
      message: `Deep import into '${tgt.name}'. Use barrel: '@/${tgt.name}' instead of '${specifier}'.`,
    };
  }
  if (tgt.layer > src.layer) {
    return {
      rule: 'UPWARD',
      sourceFile: rel,
      importPath: specifier,
      sourcePkg: src.name,
      targetPkg: tgt.name,
      message: `Layer ${src.layer} package '${src.name}' imports from higher Layer ${tgt.layer} package '${tgt.name}'.`,
    };
  }
  if (
    src.layer === 2 &&
    tgt.layer === 2 &&
    src.sublayer !== null &&
    tgt.sublayer !== null
  ) {
    if (src.sublayer === tgt.sublayer) {
      return {
        rule: 'LATERAL',
        sourceFile: rel,
        importPath: specifier,
        sourcePkg: src.name,
        targetPkg: tgt.name,
        message: `Lateral import: '${src.name}' (${src.sublayer}) <-> '${tgt.name}' (${tgt.sublayer}). Siblings in the same sublayer cannot import each other.`,
      };
    }
    if (SUBLAYER_ORDER[src.sublayer] < SUBLAYER_ORDER[tgt.sublayer]) {
      return {
        rule: 'UPWARD',
        sourceFile: rel,
        importPath: specifier,
        sourcePkg: src.name,
        targetPkg: tgt.name,
        message: `Sublayer upward import: '${src.name}' (${src.sublayer}) cannot import '${tgt.name}' (${tgt.sublayer}).`,
      };
    }
  }
  return null;
}

async function main() {
  await buildBarrelCache();
  const violations: Violation[] = [];

  for (const root of [join(ROOT, 'src'), join(ROOT, 'app')]) {
    for await (const file of walkTs(root)) {
      const src = sourcePkg(file);
      if (!src) continue;
      let source: string;
      try {
        source = await readFile(file, 'utf8');
      } catch {
        continue;
      }
      for (const spec of extractImports(source)) {
        const v = checkImport(file, src, spec);
        if (v) violations.push(v);
      }
    }
  }

  if (updateBaseline) {
    await writeBaselineFile(violations);
    console.log(
      `Baseline written: ${violations.length} known violations -> ${BASELINE_PATH}`,
    );
    process.exit(0);
  }

  const baseline = await loadBaseline();
  const newViolations = violations.filter(
    (v) => !baseline.has(violationKey(v)),
  );
  const resolvedCount = [...baseline].filter(
    (k) => !violations.some((v) => violationKey(v) === k),
  ).length;

  if (resolvedCount > 0) {
    console.log(
      `${resolvedCount} baseline violation(s) resolved. Run --update-baseline to shrink the baseline.`,
    );
  }

  if (newViolations.length === 0) {
    if (baseline.size > 0) {
      console.log(`Package boundaries: OK (${violations.length} known, 0 new)`);
    } else {
      console.log('Package boundaries: OK (no violations)');
    }
    process.exit(0);
  }

  console.error(`\nNew package boundary violations: ${newViolations.length}\n`);
  const byRule = new Map<string, Violation[]>();
  for (const v of newViolations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule)!.push(v);
  }
  for (const [rule, vs] of byRule) {
    console.error(`-- ${rule} (${vs.length}) --`);
    for (const v of vs) {
      console.error(`  ${v.sourceFile}`);
      console.error(`    import: ${v.importPath}`);
      console.error(`    ${v.message}`);
      console.error();
    }
  }
  console.error(
    `To record as known: npx tsx scripts/check-package-boundaries.ts --update-baseline`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('check-package-boundaries: unexpected error:', err);
  process.exit(2);
});
