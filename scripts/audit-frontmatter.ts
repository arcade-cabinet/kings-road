#!/usr/bin/env -S npx tsx
/**
 * Frontmatter audit — ensures every tracked .md file in the project carries
 * the YAML frontmatter block (title, updated, status, domain). Exits 1 if
 * any file is missing frontmatter or required fields.
 *
 * Why these fields: `docs/DESIGN.md` and the other domain docs use
 * frontmatter for at-a-glance freshness + categorization (technical,
 * product, quality, ops, creative, context). Keeping every .md in line
 * lets tooling filter and index docs consistently.
 *
 * Scope:
 *   Uses `git ls-files '*.md'` so only tracked markdown is audited.
 *   Excludes vendored and tooling directories via a skip list.
 *
 * Usage:
 *   npx tsx scripts/audit-frontmatter.ts
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const REQUIRED_FIELDS = ['title', 'updated', 'status', 'domain'] as const;

// Prefix-based skip list, normalized to forward-slash form. git ls-files
// emits forward slashes on every platform, so path-separator handling
// isn't needed here.
const SKIP_PREFIXES = [
  '.claude/',
  'node_modules/',
  'pending-integration/',
  'public/',
  'android/',
  'ios/',
  'dist/',
  'coverage/',
];

function listTrackedMarkdown(): string[] {
  const out = execFileSync('git', ['ls-files', '*.md'], {
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((f) => !SKIP_PREFIXES.some((p) => f.startsWith(p)));
}

interface AuditResult {
  file: string;
  issues: string[];
}

function audit(file: string): AuditResult {
  const issues: string[] = [];
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  if (lines[0] !== '---') {
    issues.push('no frontmatter block (expected `---` on line 1)');
    return { file, issues };
  }

  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) {
    issues.push('frontmatter not closed (missing closing `---`)');
    return { file, issues };
  }

  const frontmatter = lines.slice(1, closeIdx).join('\n');
  for (const field of REQUIRED_FIELDS) {
    const re = new RegExp(`^${field}\\s*:`, 'm');
    if (!re.test(frontmatter)) {
      issues.push(`missing required field: ${field}`);
    }
  }
  return { file, issues };
}

function main(): void {
  const files = listTrackedMarkdown().sort();
  const results = files.map(audit);
  const failing = results.filter((r) => r.issues.length > 0);

  if (failing.length === 0) {
    console.log(
      `\u2713 ${files.length} .md files — all have required frontmatter.`,
    );
    process.exit(0);
  }

  console.log(
    `\u2717 ${failing.length} / ${files.length} .md files have frontmatter issues:\n`,
  );
  for (const r of failing) {
    console.log(`  ${r.file}`);
    for (const issue of r.issues) {
      console.log(`    - ${issue}`);
    }
  }
  console.log('\nExpected frontmatter template:');
  console.log('---');
  console.log('title: <title>');
  console.log('updated: YYYY-MM-DD');
  console.log('status: current | draft | stale | archived');
  console.log(
    'domain: technical | product | quality | ops | creative | context',
  );
  console.log('---');
  process.exit(1);
}

main();
