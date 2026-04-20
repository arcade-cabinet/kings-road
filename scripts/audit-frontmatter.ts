#!/usr/bin/env node
/**
 * Frontmatter audit — ensures every tracked .md in the project carries the
 * YAML frontmatter block required by STANDARDS.md (title, updated, status,
 * domain). Exits 1 if any file is missing frontmatter or required fields.
 *
 * Scope:
 *   - Root-level docs (CLAUDE.md, README.md, CHANGELOG.md, STANDARDS.md, AGENTS.md)
 *   - docs/** recursive
 *   - src/** and app/** *.md (READMEs, CONTRIBUTING guides)
 *   - .kiro/steering/*.md (AI-tool steering)
 *
 * Skipped:
 *   - node_modules, .git, pending-integration, public, android/ios, .claude
 *
 * Usage:
 *   npx tsx scripts/audit-frontmatter.ts
 *   npx tsx scripts/audit-frontmatter.ts --fix   (prints the stub that should be added)
 */

import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_FIELDS = ['title', 'updated', 'status', 'domain'] as const;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'pending-integration',
  'public',
  'android',
  'ios',
  'dist',
  'coverage',
]);

// Exclude .claude by path rather than basename — state files live there.
const SKIP_PATH_PREFIXES = ['.claude/'];

function walk(dir: string, acc: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.kiro') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(process.cwd(), full);
    if (SKIP_PATH_PREFIXES.some((p) => rel.startsWith(p))) continue;
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      acc.push(rel);
    }
  }
  return acc;
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

  // Find closing ---
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

function main() {
  const files = walk(process.cwd()).sort();
  const results = files.map(audit);
  const failing = results.filter((r) => r.issues.length > 0);

  if (failing.length === 0) {
    console.log(`\u2713 ${files.length} .md files — all have required frontmatter.`);
    process.exit(0);
  }

  console.log(`\u2717 ${failing.length} / ${files.length} .md files have frontmatter issues:\n`);
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
  console.log('domain: technical | product | quality | ops | creative | context');
  console.log('---');
  process.exit(1);
}

main();
